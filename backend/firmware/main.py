# main.py - Robust WebSocket Client
import machine
import usocket as socket
import uwebsockets.client
import time
import ujson

# --- CONFIGURATION ---
# IMPORTANT: Use your PC's IP address (from step 437 request or ipconfig)
SERVER_IP = "10.209.6.232" 
SERVER_PORT = 8000
DEVICE_ID = "esp32_home"

# Construct URI
URI = "ws://{}:{}/ws/device/{}".format(SERVER_IP, SERVER_PORT, DEVICE_ID)

# --- HARDWARE SETUP ---
# GPIO 2: Built-in LED (Status)
# GPIO 4: Fan
# GPIO 5: Kitchen Light
# GPIO 18: Fridge
# GPIO 19: TV
# GPIO 21: Home Theater
# GPIO 2: Bedroom Light (Using Built-in LED for demo)

pins = {
    "light": machine.Pin(2, machine.Pin.OUT),         # Bedroom Light
    "fan": machine.Pin(4, machine.Pin.OUT),
    "kitchen light": machine.Pin(5, machine.Pin.OUT),
    "refrigerator": machine.Pin(18, machine.Pin.OUT),
    "tv": machine.Pin(19, machine.Pin.OUT),
    "hometheater": machine.Pin(21, machine.Pin.OUT)
}

# Ensure all off initially
for p in pins.values():
    p.value(0)

def handle_command(message):
    """
    Parses "turn_on:light" or "turn_off:fan"
    """
    try:
        if ":" not in message: 
            return
            
        parts = message.split(":")
        action = parts[0]       # "turn_on"
        device_key = parts[1]   # "light"
        
        # Normalize
        if device_key == "fridge": device_key = "refrigerator"
        if device_key == "home theater": device_key = "hometheater"
        
        if device_key in pins:
            # Action
            is_on = (action == "turn_on")
            pins[device_key].value(1 if is_on else 0)
            print("EXEC: {} -> {}".format(device_key, "ON" if is_on else "OFF"))
            
            # Blink status LED to acknowledge
            pins["light"].value(0)
            time.sleep(0.1)
            pins["light"].value(1 if is_on else 0) # Restore state
            
        else:
            print("Unknown device:", device_key)
            
    except Exception as e:
        print("Command Error:", e)

def run():
    print("Device ID:", DEVICE_ID)
    print("Target Server:", URI)
    
    while True:
        try:
            print("Connecting to WebSocket...")
            ws = uwebsockets.client.connect(URI)
            ws.settimeout(0.5) # Non-blocking read
            print("Connected!")
            
            # Send initial Greeting
            ws.send("status:connected")
            
            # Loop for Messages
            while True:
                try:
                    # 1. Try to receive message
                    data = ws.recv()
                    if data:
                        print("RX:", data)
                        handle_command(str(data))
                        
                except OSError:
                    # Timeout (Normal behavior for non-blocking)
                    pass
                
                # 2. Keep Connection Alive (Optional "Ping" if server supports it, 
                # or just rely on TCP keepalive. Here we just sleep briefly)
                # If you need to send a heartbeat:
                # ws.send("ping") 
                
                time.sleep(0.1)
                
        except Exception as e:
            print("Disconnected / Error:", e)
            print("Reconnecting in 5s...")
            time.sleep(5)

if __name__ == "__main__":
    run()
