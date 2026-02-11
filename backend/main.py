from datetime import datetime
from threading import Thread
from typing import List, Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from models import Device, DeviceLog, User
from database import create_db_and_tables, get_session, engine
from connection_manager import manager
from ai_service import ai_service

app = FastAPI()

# Global variable to store the latest command for ESP32 polling
# Format: "action:device" or "idle"
pending_esp32_command = "idle"

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
        
        # Update the ESP32 polling queue
        global pending_esp32_command
        
        # Map "kitchen light" to "kitchen" for ESP32
        esp32_device = "kitchen" if device_type == "kitchen light" else device_type
        device_command = f"{action}:{esp32_device}"
        pending_esp32_command = device_command
        
        # In a real scenario, we would parse 'location' and find the specific device ID
        # For this demo, we broadcast to the specific device type if connected
        # Or just broadcast to all ESP32s
        for device_id, ws in manager.active_devices.items():
            await ws.send_text(device_command)

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
                global pending_esp32_command
                
                if device_type == "all":
                    # For "all", we'll just send the first device command
                    # ESP32 will need to handle "all" or we send individual commands
                    # For simplicity, let's send "turn_on:all" or "turn_off:all"
                    pending_esp32_command = f"{action}:all"
                    
                    # Expand 'all' into individual commands for WebSocket-connected ESP32s
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
                    # Map "kitchen light" to "kitchen" for ESP32
                    esp32_device = "kitchen" if device_type == "kitchen light" else device_type
                    device_command = f"{action}:{esp32_device}"
                    
                    # Update the polling queue for HTTP-polling ESP32s
                    pending_esp32_command = device_command
                    
                    # Send via WebSocket to connected ESP32s
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
def get_connection_info():
    """Returns the local IP address to construct the QR code URL."""
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Doesn't actually connect, just determines the interface
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        local_ip = "127.0.0.1"
    
    return {
        "ip": local_ip,
        "port": 8000,
        "url": f"http://{local_ip}:8000/static/index.html"
    }

@app.get("/device")
def get_device_command():
    """
    ESP32 polling endpoint.
    Returns the latest pending command in format: action:device
    Returns "idle" when no command is pending.
    """
    global pending_esp32_command
    
    # Get the current command
    command = pending_esp32_command
    
    # Clear it after reading (one-time delivery)
    pending_esp32_command = "idle"
    
    print(f"ESP32 polled /device, returning: {command}")
    
    # Return plain text response
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(content=command)

@app.get("/")
def read_root():
    return {"message": "Smart Home API is running"}

if __name__ == "__main__":
    import uvicorn
    # Bind to 0.0.0.0 to allow access from local network (mobile devices)
    uvicorn.run(app, host="0.0.0.0", port=8000)
