from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    password_hash: str

class Device(SQLModel, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)  # e.g., "esp32-01"
    name: str  # e.g., "Bedroom Light"
    type: str  # "light", "fan", "relay"
    status: bool = Field(default=False)  # True = ON, False = OFF
    pin: int  # GPIO pin number on ESP32
    ip_address: Optional[str] = None
    last_seen: Optional[datetime] = None

class DeviceLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    device_id: str = Field(foreign_key="device.id")
    action: str  # "turned_on", "turned_off"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
