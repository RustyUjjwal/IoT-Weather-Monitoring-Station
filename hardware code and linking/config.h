// =================================================================
// Centralized Configuration for the ESP32 Environmental Monitor
// =================================================================
#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h> // Required for pin definitions

// --- FIRMWARE & DEVICE IDENTIFICATION ---
#define FIRMWARE_VERSION "v3.0.0-ESP32"
#define DEVICE_ID_DEFAULT "ESP32_001" // Default device ID if not set in WiFiManager

// --- HARDWARE PIN DEFINITIONS (for ESP32) ---
#define LED_PIN 2               // Built-in LED on most ESP32 boards
#define RESET_PIN 0             // Use GPIO0 to trigger a settings reset on boot
#define I2C_SDA_PIN 21          // I2C Data pin for the BME280 sensor
#define I2C_SCL_PIN 22          // I2C Clock pin for the BME280 sensor

// --- SENSOR CONFIGURATION ---
#define BME280_I2C_ADDRESS 0x76 // Standard I2C address for the BME280

// --- WIFI & WEBSERVER CONFIGURATION ---
#define CONFIG_AP_NAME "ESP32_IoT_Config" // Name of the Access Point for configuration
#define CONFIG_AP_PASSWORD "config123"    // Password for the AP

// --- MQTT CONFIGURATION ---
#define MQTT_SERVER_DEFAULT "mqtt.broker.com"
#define MQTT_PORT_DEFAULT "1883"
#define MQTT_BUFFER_SIZE 512

// --- TIMING CONFIGURATION (in milliseconds) ---
#define MQTT_PUBLISH_INTERVAL 10000       // Publish sensor data every 10 seconds
#define MQTT_RECONNECT_INTERVAL 30000     // Attempt to reconnect to MQTT every 30 seconds

#endif // CONFIG_H