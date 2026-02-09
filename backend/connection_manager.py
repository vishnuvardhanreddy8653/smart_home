from typing import List, Dict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Active connections: device_id -> WebSocket
        self.active_devices: Dict[str, WebSocket] = {}
        # Active frontend clients
        self.active_clients: List[WebSocket] = []
        # Store last known state: device_type -> "on" | "off"
        self.device_states: Dict[str, str] = {
            "light": "off",
            "fan": "off",
            "kitchen light": "off",
            "refrigerator": "off",  # Default match for 'fridge'
            "tv": "off",
            "hometheater": "off"
        }

    async def connect_device(self, device_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_devices[device_id] = websocket
        print(f"Device connected: {device_id}")

    def disconnect_device(self, device_id: str):
        if device_id in self.active_devices:
            del self.active_devices[device_id]
            print(f"Device disconnected: {device_id}")

    async def connect_client(self, websocket: WebSocket):
        await websocket.accept()
        self.active_clients.append(websocket)
        # Send current state to the new client
        print("Sending initial state to client...")
        for device, state in self.device_states.items():
            action = "turn_on" if state == "on" else "turn_off"
            await websocket.send_text(f"ACTION:{action}:{device}")

    def update_state(self, device_type: str, action: str):
        """Updates the internal state based on action."""
        # Normalize
        if device_type == "fridge": device_type = "refrigerator"
        if device_type == "home theater": device_type = "hometheater"
        
        state = "on" if action == "turn_on" else "off"
        
        if device_type == "all":
            for d in self.device_states:
                # Essential appliance protection: Do NOT turn off fridge in batch
                if d in ["refrigerator", "fridge"] and action == "turn_off":
                    continue
                self.device_states[d] = state
        else:
            self.device_states[device_type] = state

    def disconnect_client(self, websocket: WebSocket):
        if websocket in self.active_clients:
            self.active_clients.remove(websocket)

    async def send_command_to_device(self, device_id: str, command: str):
        if device_id in self.active_devices:
            await self.active_devices[device_id].send_text(command)
            return True
        return False

    async def broadcast_status(self, message: str):
        for connection in self.active_clients:
            await connection.send_text(message)

manager = ConnectionManager()
