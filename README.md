# ESP32 IoT Environmental Monitoring System

A comprehensive IoT solution for environmental monitoring using **ESP32**, **BME280 sensor**, and **MQTT communication**, with a Python backend for data logging, alerting, and WebSocket broadcasting.

## 🌟 Features

- **Real-time Monitoring**: Temperature, humidity, and pressure sensing
- **WiFi Connectivity**: ESP32 with built-in WiFi
- **MQTT Communication**: Reliable data transmission
- **Backend Server**: Python broker with SQLite database & WebSocket support
- **Web Dashboard**: Real-time visualization (via WebSockets)
- **Alert System**: Configurable thresholds
- **Data Logging**: SQLite database for historical storage
- **WiFi Manager**: Captive portal for WiFi/MQTT setup
- **OTA Ready**: Support for over-the-air updates (extendable)

## 📋 Hardware Requirements

### Main Components
- **ESP32 Development Board** (e.g., ESP32 DevKit V1)
- **BME280** (I2C) – Environmental sensor
- **Breadboard/PCB + Jumper Wires**
- **USB Cable & Power Supply**

### Optional
- **OLED Display**
- **Battery Pack**
- **Enclosure**

## 🔌 Hardware Connections

### ESP32 to BME280 (I2C)
```
BME280    ESP32
VCC   ->  3.3V
GND   ->  GND
SDA   ->  GPIO21
SCL   ->  GPIO22
```

### ESP32 Control Pins
- Built-in LED: GPIO2  
- Reset Trigger: GPIO0  

## 🚀 Quick Start

### 1. Firmware Setup (ESP32)
1. Install **VS Code + PlatformIO** (recommended) or Arduino IDE.
2. Open this project folder.
3. Adjust settings in `config.h` (e.g., default device ID, MQTT broker).
4. Upload `ESP32_IoT_Environmental_Monitor.ino` to your ESP32.
5. On first boot, connect to WiFi AP:  
   - SSID: `ESP32_IoT_Config`  
   - Password: `config123`  
   - Open `http://192.168.4.1` to set WiFi + MQTT broker.

### 2. Backend Setup (Python Server)
1. Run the installation script:
   ```bash
   ./install.sh
   ```
   This creates a virtual environment, installs dependencies, and prepares directories.
2. Start the broker:
   ```bash
   python3 iot_mqtt_broker.py
   ```
   - Default MQTT broker: `localhost:1883`
   - WebSocket server: `ws://localhost:8765`
   - Database: `iot_sensor_data.db`
   - Logs: `iot_system.log`

### 3. Web Dashboard
- Connect a WebSocket client (or provided dashboard) to `ws://<server-ip>:8765`  
- View real-time data and alerts.

## 📊 Data Format

### MQTT Topics
```
sensors/{device_id}/data     - Sensor readings
sensors/{device_id}/status   - Device status
```

### Example JSON Payload
```json
{
  "deviceId": "ESP32_001",
  "timestamp": 1692297240000,
  "temperature": 23.5,
  "humidity": 65.2,
  "pressure": 1013.25,
  "firmware": "v3.0.0-ESP32"
}
```

## 🔧 Configuration Options (config.h)

- **WiFi Config Portal**: SSID, password via captive portal  
- **MQTT**: Broker, port, buffer size  
- **Intervals**: Publish every 10s, reconnect every 30s  
- **Pins**: SDA=21, SCL=22, LED=2  

## 📈 Monitoring and Alerts
- Alerts for temperature, humidity, pressure thresholds (extendable).
- Data stored in SQLite (`sensor_data`, `device_status`, `alerts`).

## 📚 Code Structure
- `ESP32_IoT_Environmental_Monitor.ino` – ESP32 firmware
- `config.h` – Centralized configuration
- `iot_mqtt_broker.py` – Python MQTT broker + WebSocket server
- `install.sh` – Backend setup script
- `requirements.txt` – Python dependencies

## 🛠 Development
- Add sensors by extending `config.h` and firmware `readSensors()`.
- Customize MQTT topics in firmware + Python broker.
- Extend dashboard via WebSocket API.

## 📄 License
Open-source under the MIT License.

## 🎯 Future Enhancements
- Multi-device dashboards
- Cloud integration (AWS IoT, Azure IoT, etc.)
- LoRaWAN support
- Predictive analytics with ML
