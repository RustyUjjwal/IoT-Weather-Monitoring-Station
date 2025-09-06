#!/bin/bash
# =======================================================
# ESP32 IoT Environmental Monitor - Backend Setup Script
# v2.0.0
# =======================================================

# --- Check for Python 3 ---
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is required but not found."
    echo "Please install Python 3.7 or later to continue."
    exit 1
fi
echo "✅ Python 3 found: $(python3 --version)"

# --- Create Virtual Environment ---
echo "▶ Creating Python virtual environment in 'venv' directory..."
python3 -m venv venv
if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to create virtual environment."
    exit 1
fi

# --- Activate Virtual Environment ---
# This command works for bash/zsh. For other shells, the command may differ.
source venv/bin/activate
echo "✅ Virtual environment activated."

# --- Install Python Dependencies ---
echo "▶ Installing required Python packages (paho-mqtt, websockets)..."
pip install --upgrade pip
pip install paho-mqtt==1.6.1 websockets
if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to install Python dependencies."
    exit 1
fi
echo "✅ Python dependencies installed successfully."

# --- Create Project Directories ---
echo "▶ Creating directories for logs and data..."
mkdir -p logs
mkdir -p data
echo "✅ Project directories created."

# --- Make Broker Script Executable ---
chmod +x iot_mqtt_broker.py

# --- Final Instructions ---
echo ""
echo "======================================================="
echo "✅ Backend setup completed successfully!"
echo "======================================================="
echo ""
echo "Next Steps:"
echo "1. Hardware Setup:"
echo "   - Connect the BME280 sensor to your ESP32 (SDA->GPIO21, SCL->GPIO22)."
echo ""
echo "2. Firmware Upload:"
echo "   - Open this project folder in VS Code with the PlatformIO extension."
echo "   - Connect your ESP32 via USB."
echo "   - Click the 'Upload' button in the PlatformIO toolbar."
echo ""
echo "3. Device Configuration:"
echo "   - After the first boot, connect to the 'ESP32_IoT_Config' WiFi network."
echo "   - Go to http://192.168.4.1 in a browser to configure your WiFi and MQTT settings."
echo ""
echo "4. Run Backend Server:"
echo "   - In your terminal, run the command: python3 iot_mqtt_broker.py"
echo ""
echo "For support, please refer to the project's README file."
echo "======================================================="
