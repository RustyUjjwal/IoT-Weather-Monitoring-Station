// STM32 IoT Environmental Monitor - Configuration Header
// config.h - Centralized configuration for the project

#ifndef CONFIG_H
#define CONFIG_H

// Hardware Configuration
#define STM32_BOARD_TYPE "STM32F103C8T6"  // Blue Pill
#define FIRMWARE_VERSION "v2.1.3"

// Pin Definitions
#define LED_BUILTIN_PIN PC13
#define CONFIG_BUTTON_PIN PA0
#define ESP8266_TX_PIN PA9
#define ESP8266_RX_PIN PA10
#define BME280_SDA_PIN PB7
#define BME280_SCL_PIN PB6

// Sensor Configuration
#define BME280_I2C_ADDRESS_PRIMARY 0x76
#define BME280_I2C_ADDRESS_SECONDARY 0x77
#define SEALEVEL_PRESSURE_HPA 1013.25

// Timing Configuration (milliseconds)
#define SENSOR_READ_INTERVAL 5000        // 5 seconds
#define MQTT_PUBLISH_INTERVAL 10000      // 10 seconds
#define WIFI_RETRY_INTERVAL 30000        // 30 seconds
#define STATUS_BLINK_INTERVAL 1000       // 1 second
#define WATCHDOG_TIMEOUT 60000           // 1 minute

// Communication Configuration
#define SERIAL_BAUD_RATE 115200
#define ESP8266_BAUD_RATE 115200
#define I2C_FREQUENCY 100000             // 100kHz

// WiFi Configuration
#define WIFI_CONNECTION_TIMEOUT 15000    // 15 seconds
#define WIFI_MAX_RETRY_ATTEMPTS 3
#define WIFI_SSID_MAX_LENGTH 32
#define WIFI_PASSWORD_MAX_LENGTH 64

// MQTT Configuration
#define MQTT_SERVER_MAX_LENGTH 64
#define MQTT_PORT_DEFAULT 1883
#define MQTT_CLIENT_ID_PREFIX "STM32_"
#define MQTT_KEEPALIVE_INTERVAL 60       // 60 seconds
#define MQTT_QOS_LEVEL 1
#define MQTT_RETAIN_FLAG true

// MQTT Topics
#define MQTT_TOPIC_DATA "sensors/%s/data"
#define MQTT_TOPIC_STATUS "sensors/%s/status"
#define MQTT_TOPIC_CONTROL "sensors/%s/control"
#define MQTT_TOPIC_ALERTS "sensors/%s/alerts"

// Data Processing
#define SENSOR_AVERAGING_SAMPLES 3
#define SENSOR_VALIDATION_ENABLED true
#define DATA_COMPRESSION_ENABLED false

// Sensor Value Ranges for Validation
#define TEMPERATURE_MIN_VALID -40.0
#define TEMPERATURE_MAX_VALID 85.0
#define HUMIDITY_MIN_VALID 0.0
#define HUMIDITY_MAX_VALID 100.0
#define PRESSURE_MIN_VALID 300.0
#define PRESSURE_MAX_VALID 1200.0

// Alert Thresholds
#define TEMPERATURE_MIN_THRESHOLD 18.0
#define TEMPERATURE_MAX_THRESHOLD 28.0
#define HUMIDITY_MIN_THRESHOLD 40.0
#define HUMIDITY_MAX_THRESHOLD 80.0
#define PRESSURE_MIN_THRESHOLD 995.0
#define PRESSURE_MAX_THRESHOLD 1015.0

// Memory Configuration
#define JSON_BUFFER_SIZE 256
#define SERIAL_BUFFER_SIZE 128
#define AT_COMMAND_BUFFER_SIZE 128
#define EEPROM_CONFIG_ADDRESS 0

// Debug Configuration
#define DEBUG_ENABLED true
#define DEBUG_SENSOR_READINGS true
#define DEBUG_WIFI_COMMANDS true
#define DEBUG_MQTT_MESSAGES true

// Power Management
#define LOW_POWER_MODE_ENABLED false
#define SLEEP_MODE_DURATION 30000        // 30 seconds
#define BATTERY_MONITORING_ENABLED false

// Device Identification
#define DEVICE_MANUFACTURER "DIY_IoT"
#define DEVICE_MODEL "Environmental_Monitor"
#define DEVICE_SERIAL_PREFIX "STM32_ENV_"

// Feature Flags
#define FEATURE_WEB_CONFIG true
#define FEATURE_OTA_UPDATE false
#define FEATURE_SD_CARD_LOGGING false
#define FEATURE_RTC_TIMESTAMP false
#define FEATURE_ENCRYPTION false

// Error Handling
#define MAX_ERROR_COUNT 5
#define ERROR_RESET_ENABLED true
#define WATCHDOG_ENABLED true

#endif // CONFIG_H
