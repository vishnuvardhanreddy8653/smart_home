# boot.py - Robust WiFi Connection
import network
import time
from machine import Pin

# --- CONFIGURATION ---
SSID = "Redmi Note 12 Pro 5G"      # YOUR WIFI NAME
PASSWORD = "Your_WiFi_Password"     # YOUR WIFI PASSWORD (Change this!)

# Optional Status LED (GPIO 2 is usually built-in blue LED)
led = Pin(2, Pin.OUT)

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    
    if not wlan.isconnected():
        print('Connecting to WiFi...')
        wlan.connect(SSID, PASSWORD)
        
        # Wait for connection with blink
        while not wlan.isconnected():
            led.value(not led.value()) # Blink
            time.sleep(0.5)
            print('.', end='')
            
    print('\nWiFi Connected!')
    print('Network config:', wlan.ifconfig())
    led.value(1) # Keep LED on (or off depending on board) to show connected

# Run connection
connect_wifi()
