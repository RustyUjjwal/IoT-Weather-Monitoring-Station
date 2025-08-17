# STM32 IoT Environmental Monitoring System

A comprehensive IoT solution for environmental monitoring using STM32 microcontroller, BME280 sensor, and MQTT communication.

## 🌟 Features

- **Real-time Environmental Monitoring**: Temperature, humidity, and pressure sensing
- **WiFi Connectivity**: ESP8266-based wireless communication
- **MQTT Communication**: Reliable data transmission to cloud servers
- **Web Dashboard**: Real-time data visualization and device management
- **Alert System**: Configurable thresholds and notifications
- **Data Logging**: SQLite database for historical data storage
- **WiFi Manager**: Easy network configuration without hard-coding
- **OTA Updates**: Over-the-air firmware updates (optional)

## 📋 Hardware Requirements

### Main Components
- **STM32F103C8T6** (Blue Pill) - Main microcontroller
- **BME280** - Environmental sensor (temperature, humidity, pressure)
- **ESP8266** - WiFi module (ESP-01 or NodeMCU)
- **Breadboard/PCB** - For connections
- **Jumper Wires** - For connectivity
- **Power Supply** - 3.3V/5V power source

### Optional Components
- **OLED Display** - For local status display
- **SD Card Module** - For local data logging
- **RTC Module** - For accurate timestamping
- **Battery Pack** - For portable operation

## 🔌 Hardware Connections

### STM32 to BME280 (I2C)
```
BME280    STM32F103C8T6
VCC   ->  3.3V
GND   ->  GND
SDA   ->  PB7
SCL   ->  PB6
```

### STM32 to ESP8266 (UART)
```
ESP8266   STM32F103C8T6
VCC   ->  3.3V
GND   ->  GND
TX    ->  PA10 (UART1_RX)
RX    ->  PA9  (UART1_TX)
CH_PD ->  3.3V
GPIO0 ->  3.3V (normal operation)
RST   ->  GPIO (optional reset control)
```

## 🚀 Quick Start

### 1. Hardware Setup
1. Connect components according to the wiring diagram
2. Ensure stable 3.3V power supply for ESP8266
3. Verify all connections before powering on

### 2. Software Installation

#### Arduino IDE Setup
1. Install Arduino IDE 1.8.19 or later
2. Add STM32 board support:
   - Go to File → Preferences
   - Add: `https://github.com/stm32duino/BoardManagerFiles/raw/main/package_stmicroelectronics_index.json`
   - Install "STM32 Cores" in Board Manager
3. Install required libraries:
   - Adafruit BME280 Library
   - ArduinoJson
   - PubSubClient
   - WiFiManager (for ESP8266)

#### PlatformIO Setup (Recommended)
1. Install VS Code and PlatformIO extension
2. Open project folder
3. PlatformIO will automatically install dependencies from `platformio.ini`

### 3. Configuration
1. Open `config.h` and adjust settings as needed
2. Compile and upload `STM32_IoT_Environmental_Monitor.ino` to STM32
3. If using separate ESP8266, upload `ESP8266_WiFiManager.ino`

### 4. WiFi Configuration
1. Power on the device
2. Connect to "STM32_Config" WiFi network (password: config123)
3. Navigate to 192.168.4.1 in web browser
4. Enter your WiFi credentials and MQTT broker details
5. Save configuration and restart device

### 5. MQTT Broker Setup
1. Install Python dependencies: `pip install -r requirements.txt`
2. Configure MQTT broker address in `iot_mqtt_broker.py`
3. Run: `python iot_mqtt_broker.py`

### 6. Web Dashboard
1. Open the provided dashboard HTML file in a web browser
2. The dashboard will display real-time sensor data
3. Configure alert thresholds as needed

## 📊 Data Format

### MQTT Topic Structure
```
sensors/{device_id}/data     - Sensor readings
sensors/{device_id}/status   - Device status
sensors/{device_id}/control  - Control commands
sensors/{device_id}/alerts   - Alert notifications
```

### JSON Data Format
```json
{
  "deviceId": "STM32_001",
  "timestamp": 1692297240000,
  "temperature": 23.5,
  "humidity": 65.2,
  "pressure": 1013.25,
  "firmware": "v2.1.3"
}
```

## 🔧 Configuration Options

### WiFi Settings
- SSID and password configuration via web interface
- WPS support for easy setup
- Automatic reconnection on connection loss

### MQTT Settings
- Broker address and port configuration
- Authentication support (username/password)
- QoS levels and retain flags
- Custom topic prefixes

### Sensor Settings
- Reading intervals (1-300 seconds)
- Averaging and filtering options
- Calibration offsets
- Alert thresholds

## 📈 Monitoring and Alerts

### Alert Types
- **Temperature**: Out of range warnings
- **Humidity**: High/low humidity alerts
- **Pressure**: Atmospheric pressure changes
- **System**: Device offline, low battery, errors

### Alert Delivery
- MQTT messages to monitoring system
- Email notifications (with additional setup)
- SMS alerts (with SMS gateway)
- Web dashboard notifications

## 🔍 Troubleshooting

### Common Issues

#### Device Not Connecting to WiFi
1. Check WiFi credentials in configuration
2. Verify signal strength (minimum -70 dBm)
3. Ensure 2.4GHz network (ESP8266 doesn't support 5GHz)
4. Reset WiFi settings and reconfigure

#### Sensor Readings Invalid
1. Check I2C connections (SDA/SCL)
2. Verify sensor power supply (3.3V)
3. Test with I2C scanner code
4. Replace sensor if faulty

#### MQTT Connection Issues
1. Verify broker address and port
2. Check network connectivity
3. Validate authentication credentials
4. Test with MQTT client tool

#### System Resets/Crashes
1. Check power supply stability
2. Verify all connections
3. Enable watchdog timer
4. Review error logs

### Debug Mode
Enable debug output by setting `DEBUG_ENABLED = true` in `config.h`:
- Serial output at 115200 baud
- Detailed sensor readings
- WiFi connection status
- MQTT message logs

## 📚 Code Structure

### Main Components
- `STM32_IoT_Environmental_Monitor.ino` - Main STM32 firmware
- `ESP8266_WiFiManager.ino` - ESP8266 WiFi management
- `iot_mqtt_broker.py` - Python MQTT broker and data processor
- `config.h` - Centralized configuration
- `platformio.ini` - Build configuration

### Libraries Used
- **Adafruit BME280**: Sensor communication
- **ArduinoJson**: JSON parsing and generation
- **PubSubClient**: MQTT communication
- **WiFiManager**: WiFi configuration management

## 🛠 Development

### Adding New Sensors
1. Define pins in `config.h`
2. Add sensor initialization in `initializeSensors()`
3. Update `readSensors()` function
4. Modify JSON payload structure
5. Update database schema

### Custom MQTT Topics
1. Define topic patterns in `config.h`
2. Update subscription topics in MQTT setup
3. Add message handlers in `on_mqtt_message()`

### Web Dashboard Customization
1. Modify HTML/CSS in dashboard files
2. Update JavaScript for new data fields
3. Add custom charts and visualizations

## 📄 License

This project is open-source and available under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🎯 Future Enhancements

- [ ] LoRaWAN connectivity option
- [ ] Solar power management
- [ ] Machine learning for predictive analytics
- [ ] Mobile app for monitoring
- [ ] Multiple sensor node support
- [ ] Cloud service integration (AWS IoT, Azure IoT)
