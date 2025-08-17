#!/bin/bash
echo "========================================="
echo "STM32 IoT Environmental Monitor Setup"
echo "========================================="

if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required but not installed"
    echo "Please install Python 3.7 or later"
    exit 1
fi

echo "Python 3 found"

echo "Creating Python virtual environment..."
python3 -m venv venv

source venv/bin/activate

echo "Installing Python dependencies..."
pip install --upgrade pip
pip install paho-mqtt==1.6.1
pip install sqlite3

echo "✅ Python dependencies installed"

mkdir -p logs
mkdir -p data
mkdir -p config

echo "Created project directories"

echo "Initializing database..."
python3 iot_mqtt_broker.py --init-db

chmod +x iot_mqtt_broker.py

echo "Installation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Configure your hardware according to README.md"
echo "2. Flash the Arduino code to your STM32 board"
echo "3. Configure WiFi settings on device startup"
echo "4. Run: python3 iot_mqtt_broker.py"
echo "5. Open the web dashboard in your browser"
echo ""
echo "For support, check the README.md file"
