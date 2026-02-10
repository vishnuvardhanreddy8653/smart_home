from datetime import datetime
from threading import Thread
from typing import List, Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from models import Device, DeviceLog, User
from database import create_db_and_tables, get_session, engine
from connection_manager import manager
from ai_service import ai_service

app = FastAPI()

# CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# API Endpoints
@app.get("/devices/", response_model=List[Device])
def get_devices(session: Session = Depends(get_session)):
    devices = session.exec(select(Device)).all()
    return devices

@app.post("/devices/")
def register_device(device: Device, session: Session = Depends(get_session)):
    # Check if device exists
    existing_device = session.get(Device, device.id)
    if existing_device:
        return existing_device
    
    session.add(device)
    session.commit()
    session.refresh(device)
    return device

from fastapi.concurrency import run_in_threadpool

@app.post("/command/")
async def process_voice_command(command: dict = Body(...)):
    """
    Receives a text command (converted from speech on client) 
    and processes it with Ollama.
    Wrapper for AI service.
    """
    text = command.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="No text provided")

    print(f"Processing command: {text}")
    
    # Run synchronous AI call in threadpool to avoid blocking the event loop
    # This ensures WebSockets remain responsive during AI inference
    result = await run_in_threadpool(ai_service.process_command, text)
    
    print(f"AI Result: {result}")
    
    action = result.get("action")
    device_type = result.get("device_type")
    
    if action in ["turn_on", "turn_off"]:
        # Update state persistence
        manager.update_state(device_type, action)

        # Broadcast to all clients (including frontend) to update UI
        if device_type == "all":
            # Broadcast individual updates to ensure robust sync
            all_devices = ["light", "fan", "kitchen light", "refrigerator", "tv", "hometheater"]
            for d in all_devices:
                 # Essential appliance protection
                 if d == "refrigerator" and action == "turn_off":
                     continue
                 await manager.broadcast_status(f"ACTION:{action}:{d}")
            # Also broadcast the 'all' simplified message for UI convenience
            await manager.broadcast_status(f"ACTION:{action}:all")
        else:
            await manager.broadcast_status(f"ACTION:{action}:{device_type}")
        
        # In a real scenario, we would parse 'location' and find the specific device ID
        # For this demo, we broadcast to the specific device type if connected
        # Or just broadcast to all ESP32s
        for device_id, ws in manager.active_devices.items():
            await ws.send_text(f"{action}:{device_type}")

    return result

# WebSockets
@app.post("/voice")
async def process_simple_voice_command(data: dict = Body(...)):
    """
    Alias for /command/ but matches the user's simple 'voice' endpoint structure.
    Expects {"text": "some command"}
    """
    return await process_voice_command(data)

# WebSockets
@app.websocket("/ws/client")
async def websocket_endpoint_client(websocket: WebSocket):
    await manager.connect_client(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle manual commands from UI
            print(f"Client says: {data}")
            
            # SUPPORT SIMPLE PROTOCOL: "toggle:device"
            if data.startswith("toggle:"):
                # Protocol: toggle:light
                _, device_type = data.split(":")
                
                # Determine next state based on current state
                current_state = manager.device_states.get(device_type, "off")
                new_action = "turn_off" if current_state == "on" else "turn_on"
                
                # Convert to our standard ACTION format
                data = f"ACTION:{new_action}:{device_type}"
            
            # Parse command: "ACTION:turn_on:light"
            parts = data.split(":")
            if len(parts) >= 3 and parts[0] == "ACTION":
                action = parts[1]
                device_type = parts[2]
                
                # Update state tracking
                manager.update_state(device_type, action)

                # 1. Broadcast to other frontends (but not the sender ideally, though here we simplisticly broadcast to all)
                await manager.broadcast_status(data)
                
                # 2. Send to ESP32s
                if device_type == "all":
                    # Expand 'all' into individual commands for ESP32s
                    all_targets = ["light", "fan", "kitchen light", "refrigerator", "tv", "hometheater"]
                    for target in all_targets:
                        # Essential appliance protection
                        if target == "refrigerator" and action == "turn_off":
                            continue
                        
                        device_command = f"{action}:{target}"
                        for device_ws in manager.active_devices.values():
                            await device_ws.send_text(device_command)
                else:
                    # Single device command
                    device_command = f"{action}:{device_type}"
                    for device_ws in manager.active_devices.values():
                        await device_ws.send_text(device_command)
    except WebSocketDisconnect:
        manager.disconnect_client(websocket)

@app.websocket("/ws") # Legacy/Simple endpoint alias
async def websocket_endpoint_simple(websocket: WebSocket):
    """
    Alias for /ws/client to support the user's simple code snippet if they use it.
    """
    await websocket_endpoint_client(websocket)

@app.websocket("/ws/device/{device_id}")
async def websocket_endpoint_device(websocket: WebSocket, device_id: str, session: Session = Depends(get_session)):
    await manager.connect_device(device_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle status updates from device (e.g. "status:on")
            print(f"Received from {device_id}: {data}")
    except WebSocketDisconnect:
        manager.disconnect_device(device_id)

@app.get("/connection-info")
def get_connection_info(request: Request):
    """Returns the local IP address and appropriate URL to construct the QR code.
    
    Detects protocol from request to return HTTPS URL when accessed via HTTPS.
    """
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Doesn't actually connect, just determines the interface
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        local_ip = "127.0.0.1"
    
    # Detect if accessed via HTTPS (Nginx reverse proxy sets X-Forwarded-Proto)
    protocol = request.headers.get("X-Forwarded-Proto", "http")
    
    # For QR code, use the host that was used to access this endpoint if available
    # Otherwise construct from local IP
    if "host" in request.headers:
        # Extract just the hostname without port
        host = request.headers.get("host").split(":")[0]
    else:
        host = local_ip
    
    # Construct URL - port 80 for HTTP, 443 for HTTPS (implicit in URLs)
    if protocol == "https":
        url = f"https://{host}/"
    else:
        url = f"http://{host}:8000/static/index.html"
    
    return {
        "ip": local_ip,
        "port": 8000,
        "url": url,
        "protocol": protocol
    }

@app.get("/")
def read_root():
    return {"message": "Smart Home API is running"}

if __name__ == "__main__":
    import uvicorn
    import os
    
    # Get SSL configuration from environment variables (optional)
    ssl_keyfile = os.getenv("SSL_KEYFILE", None)
    ssl_certfile = os.getenv("SSL_CERTFILE", None)
    
    # SSL/TLS Configuration
    # For development: Leave empty (HTTP only)
    # For production with Nginx reverse proxy: Keep empty (SSL termination at Nginx)
    # For production with direct SSL: Set ssl_keyfile and ssl_certfile environment variables
    #
    # Example commands to generate self-signed certificates:
    # openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365
    
    uvicorn_kwargs = {
        "host": "0.0.0.0",
        "port": 8000,
        "reload": False,  # Set to True only in development
    }
    
    # Enable SSL if certificates are provided
    if ssl_certfile and ssl_keyfile:
        uvicorn_kwargs["ssl_certfile"] = ssl_certfile
        uvicorn_kwargs["ssl_keyfile"] = ssl_keyfile
        print("🔒 Running with SSL/TLS enabled")
    else:
        print("⚠️  Running without SSL/TLS. Use Nginx reverse proxy for HTTPS in production.")
    
    uvicorn.run(app, **uvicorn_kwargs)
