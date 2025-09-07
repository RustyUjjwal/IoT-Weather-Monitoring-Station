#!/usr/bin/env python3

import paho.mqtt.client as mqtt
import json
import sqlite3
import datetime
import time
import threading
import logging
import os
import signal
import sys
from typing import Dict, Any, List
import asyncio
import websockets

MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_USERNAME = None
MQTT_PASSWORD = None
WEBSOCKET_HOST = "localhost"
WEBSOCKET_PORT = 8765
DATABASE_PATH = "iot_sensor_data.db"
LOG_FILE = "iot_system.log"

SENSOR_DATA_TOPIC = "sensors/+/data"
DEVICE_STATUS_TOPIC = "sensors/+/status"

TEMPERATURE_MIN = 18.0
TEMPERATURE_MAX = 28.0
HUMIDITY_MIN = 40.0
HUMIDITY_MAX = 80.0
PRESSURE_MIN = 995.0
PRESSURE_MAX = 1015.0

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

CONNECTED_CLIENTS = set()

async def register_client(websocket):
    CONNECTED_CLIENTS.add(websocket)
    logger.info(f"WebSocket client connected: {websocket.remote_address}")
    try:
        await websocket.wait_closed()
    finally:
        CONNECTED_CLIENTS.remove(websocket)
        logger.info(f"WebSocket client disconnected: {websocket.remote_address}")

async def broadcast_message(message: str):
    if CONNECTED_CLIENTS:
        # Create a list of tasks to send the message to all clients
        tasks = [client.send(message) for client in CONNECTED_CLIENTS]
        # Wait for all tasks to complete
        await asyncio.gather(*tasks)

class IoTDataProcessor:
    def __init__(self, loop: asyncio.AbstractEventLoop):
        self.db_connection = None
        self.mqtt_client = None
        self.device_data = {}
        self.alerts_enabled = True
        self.loop = loop

    def initialize_database(self):
        """Initialize SQLite database for sensor data storage."""
        try:
            self.db_connection = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
            cursor = self.db_connection.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sensor_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, device_id TEXT NOT NULL,
                    timestamp DATETIME NOT NULL, temperature REAL, humidity REAL,
                    pressure REAL, firmware_version TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS device_status (
                    device_id TEXT PRIMARY KEY, last_seen DATETIME NOT NULL,
                    status TEXT NOT NULL, ip_address TEXT, firmware_version TEXT,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, device_id TEXT NOT NULL,
                    alert_type TEXT NOT NULL, message TEXT NOT NULL, severity TEXT NOT NULL,
                    timestamp DATETIME NOT NULL, acknowledged BOOLEAN DEFAULT FALSE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            self.db_connection.commit()
            logger.info("Database initialized successfully")
        except sqlite3.Error as e:
            logger.error(f"Database initialization failed: {e}")
            sys.exit(1)

    def setup_mqtt_client(self):
        """Setup MQTT client with callbacks."""
        self.mqtt_client = mqtt.Client()
        if MQTT_USERNAME and MQTT_PASSWORD:
            self.mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
        self.mqtt_client.on_connect = self.on_mqtt_connect
        self.mqtt_client.on_message = self.on_mqtt_message
        self.mqtt_client.on_disconnect = self.on_mqtt_disconnect
        try:
            self.mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
            logger.info(f"Connecting to MQTT broker: {MQTT_BROKER}:{MQTT_PORT}")
        except Exception as e:
            logger.error(f"MQTT connection failed: {e}")
            sys.exit(1)

    def on_mqtt_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info("Connected to MQTT broker successfully")
            client.subscribe([(SENSOR_DATA_TOPIC, 0), (DEVICE_STATUS_TOPIC, 0)])
            logger.info(f"Subscribed to topics")
        else:
            logger.error(f" MQTT connection failed with code: {rc}")

    def on_mqtt_disconnect(self, client, userdata, rc):
        logger.warning(f"Disconnected from MQTT broker (code: {rc})")

    def on_mqtt_message(self, client, userdata, msg):
        """Handle incoming MQTT messages and schedule broadcasts."""
        try:
            topic = msg.topic
            payload = msg.payload.decode('utf-8')
            logger.info(f"Received: {topic} -> {payload}")

            if "/data" in topic:
                self.process_sensor_data(topic, payload)
                # Schedule the async broadcast function to run on the main event loop
                asyncio.run_coroutine_threadsafe(broadcast_message(payload), self.loop)
            elif "/status" in topic:
                self.process_device_status(topic, payload)
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")

    def process_sensor_data(self, topic: str, payload: str):
        """Process and store sensor data from devices."""
        try:
            device_id = topic.split('/')[1]
            data = json.loads(payload)
            if not all(k in data for k in ['temperature', 'humidity', 'pressure']):
                logger.warning(f"Missing required fields from {device_id}")
                return

            timestamp = datetime.datetime.fromtimestamp(data['timestamp'] / 1000.0)
            self.store_sensor_data(device_id, timestamp, data)
            if self.alerts_enabled:
                self.check_sensor_alerts(device_id, data)
            logger.info(f"Processed data from {device_id}")
        except json.JSONDecodeError:
            logger.error(f" Invalid JSON: {payload}")
        except Exception as e:
            logger.error(f" Error processing sensor data: {e}")

    def store_sensor_data(self, device_id, timestamp, data):
        try:
            cursor = self.db_connection.cursor()
            cursor.execute("INSERT INTO sensor_data (device_id, timestamp, temperature, humidity, pressure, firmware_version) VALUES (?, ?, ?, ?, ?, ?)",
                           (device_id, timestamp, data['temperature'], data['humidity'], data['pressure'], data.get('firmware', 'unknown')))
            self.db_connection.commit()
        except sqlite3.Error as e:
            logger.error(f"Database error: {e}")

    def check_sensor_alerts(self, device_id: str, data: Dict[str, Any]):
        pass

    def process_device_status(self, topic: str, payload: str):
        pass

    def start_mqtt_thread(self):
        """Starts the MQTT client loop in a separate thread."""
        self.setup_mqtt_client()
        mqtt_thread = threading.Thread(target=self.mqtt_client.loop_forever)
        mqtt_thread.daemon = True
        mqtt_thread.start()
        logger.info("MQTT client thread started.")

async def main_async():
    loop = asyncio.get_running_loop()
    processor = IoTDataProcessor(loop)
    
    processor.initialize_database()
    processor.start_mqtt_thread()

    server = await websockets.serve(register_client, WEBSOCKET_HOST, WEBSOCKET_PORT)
    logger.info(f"WebSocket server started on ws://{WEBSOCKET_HOST}:{WEBSOCKET_PORT}")
    
    await server.wait_closed()

def main():
    print("=============================")
    print("ESP32 IoT Monitoring Server")
    print("=============================")
    try:
        asyncio.run(main_async())
    except KeyboardInterrupt:
        logger.info("shutting down.")
    except Exception as e:
        logger.error(f" An unexpected error occurred: {e}")

if __name__ == "__main__":
    main()
