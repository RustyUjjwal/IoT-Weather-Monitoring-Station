
/*
 * STM32 IoT Environmental Monitoring System
 * Arduino IDE Compatible Code
 * Supports: STM32F103C8T6 (Blue Pill) and similar boards
 * 
 * Hardware Connections:
 * BME280 Sensor:    ESP8266 WiFi:
 * VCC -> 3.3V       VCC -> 3.3V
 * GND -> GND        GND -> GND  
 * SDA -> PB7        TX -> PA10
 * SCL -> PB6        RX -> PA9
 */

#include <Wire.h>
#include <Adafruit_BME280.h>
#include <SoftwareSerial.h>
#include <ArduinoJson.h>
#include <EEPROM.h>

// Pin Definitions
#define ESP8266_TX PA9
#define ESP8266_RX PA10
#define LED_PIN PC13
#define BUTTON_PIN PA0

// Sensor Configuration
#define SEALEVELPRESSURE_HPA (1013.25)
#define BME_SDA PB7
#define BME_SCL PB6

// WiFi and MQTT Configuration
#define WIFI_SSID_MAX_LEN 32
#define WIFI_PASS_MAX_LEN 64
#define MQTT_SERVER_MAX_LEN 64
#define DEVICE_ID "STM32_001"

// Timing Configuration
#define SENSOR_READ_INTERVAL 5000  // 5 seconds
#define MQTT_PUBLISH_INTERVAL 10000 // 10 seconds
#define WIFI_RETRY_INTERVAL 30000   // 30 seconds

// Objects and Variables
Adafruit_BME280 bme;
SoftwareSerial esp8266(ESP8266_RX, ESP8266_TX);

// Data Structures
struct SensorData {
  float temperature;
  float humidity;
  float pressure;
  unsigned long timestamp;
  bool valid;
};

struct WiFiConfig {
  char ssid[WIFI_SSID_MAX_LEN];
  char password[WIFI_PASS_MAX_LEN];
  char mqtt_server[MQTT_SERVER_MAX_LEN];
  int mqtt_port;
  bool configured;
  uint8_t checksum;
};

// Global Variables
SensorData currentData;
WiFiConfig wifiConfig;
bool wifiConnected = false;
bool mqttConnected = false;
unsigned long lastSensorRead = 0;
unsigned long lastMqttPublish = 0;
unsigned long lastWifiRetry = 0;
bool configMode = false;

// Function Prototypes
void setup();
void loop();
bool initializeSensors();
bool initializeWiFi();
SensorData readSensors();
bool connectToWiFi();
bool connectToMQTT();
bool publishSensorData(SensorData data);
void handleSerialCommands();
void enterConfigMode();
void saveWiFiConfig();
void loadWiFiConfig();
String createJsonPayload(SensorData data);
void blinkLED(int times, int delayMs);
bool sendATCommand(String command, String expectedResponse, int timeout);
void resetESP8266();

void setup() {
  // Initialize Serial Communications
  Serial.begin(115200);
  esp8266.begin(115200);

  // Initialize Pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  // Welcome Message
  Serial.println("========================================");
  Serial.println("STM32 IoT Environmental Monitor v2.0");
  Serial.println("Device ID: " + String(DEVICE_ID));
  Serial.println("========================================");

  // Load Configuration
  loadWiFiConfig();

  // Check if config button is pressed during startup
  if (digitalRead(BUTTON_PIN) == LOW) {
    enterConfigMode();
  }

  // Initialize Hardware
  if (!initializeSensors()) {
    Serial.println("Sensor initialization failed!");
    blinkLED(5, 200);
  } else {
    Serial.println("✅ Sensors initialized successfully");
  }

  if (!initializeWiFi()) {
    Serial.println("WiFi initialization failed!");
    blinkLED(3, 500);
  }

  // Initial sensor reading
  currentData = readSensors();
  if (currentData.valid) {
    Serial.println("Initial sensor reading successful");
    Serial.printf("Temperature: %.2f°C\n", currentData.temperature);
    Serial.printf("Humidity: %.2f%%\n", currentData.humidity);
    Serial.printf("Pressure: %.2f hPa\n", currentData.pressure);
  }

  Serial.println("System ready!");
  blinkLED(2, 100);
}

void loop() {
  unsigned long currentTime = millis();

  // Handle Serial Commands
  handleSerialCommands();

  // Check Config Button
  if (digitalRead(BUTTON_PIN) == LOW) {
    delay(50); // Debounce
    if (digitalRead(BUTTON_PIN) == LOW) {
      enterConfigMode();
    }
  }

  // Read Sensors Periodically
  if (currentTime - lastSensorRead >= SENSOR_READ_INTERVAL) {
    currentData = readSensors();
    lastSensorRead = currentTime;

    if (currentData.valid) {
      digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Toggle LED
      Serial.printf("📊 Sensors: T=%.1f°C, H=%.1f%%, P=%.1fhPa\n", 
                   currentData.temperature, currentData.humidity, currentData.pressure);
    }
  }

  // WiFi Connection Management
  if (!wifiConnected && (currentTime - lastWifiRetry >= WIFI_RETRY_INTERVAL)) {
    if (wifiConfig.configured) {
      wifiConnected = connectToWiFi();
      lastWifiRetry = currentTime;
    }
  }

  // MQTT Connection and Data Publishing
  if (wifiConnected && currentData.valid && 
      (currentTime - lastMqttPublish >= MQTT_PUBLISH_INTERVAL)) {

    if (!mqttConnected) {
      mqttConnected = connectToMQTT();
    }

    if (mqttConnected) {
      bool published = publishSensorData(currentData);
      if (published) {
        Serial.println("Data published to MQTT");
        blinkLED(1, 50);
      } else {
        Serial.println("MQTT publish failed");
        mqttConnected = false;
      }
      lastMqttPublish = currentTime;
    }
  }

  delay(100); // Small delay for stability
}

bool initializeSensors() {
  Wire.begin(BME_SDA, BME_SCL);

  if (!bme.begin(0x76)) { // Try default address
    if (!bme.begin(0x77)) { // Try alternate address
      Serial.println("BME280 sensor not found!");
      return false;
    }
  }

  // Configure sensor settings
  bme.setSampling(Adafruit_BME280::MODE_NORMAL,
                  Adafruit_BME280::SAMPLING_X2,  // Temperature
                  Adafruit_BME280::SAMPLING_X16, // Pressure
                  Adafruit_BME280::SAMPLING_X1,  // Humidity
                  Adafruit_BME280::FILTER_X16,
                  Adafruit_BME280::STANDBY_MS_500);

  Serial.println("BME280 sensor initialized");
  return true;
}

bool initializeWiFi() {
  Serial.println("Initializing ESP8266...");
  resetESP8266();

  // Test AT communication
  if (!sendATCommand("AT", "OK", 2000)) {
    Serial.println("ESP8266 not responding to AT commands");
    return false;
  }

  // Set WiFi mode to Station
  if (!sendATCommand("AT+CWMODE=1", "OK", 2000)) {
    Serial.println("Failed to set WiFi mode");
    return false;
  }

  // Disable auto-connect to avoid conflicts
  sendATCommand("AT+CWAUTOCONN=0", "OK", 2000);

  Serial.println("ESP8266 initialized successfully");
  return true;
}

SensorData readSensors() {
  SensorData data;
  data.timestamp = millis();
  data.valid = false;

  // Check if sensor is ready
  if (!bme.begin()) {
    Serial.println("BME280 sensor read failed");
    return data;
  }

  // Read sensor values
  data.temperature = bme.readTemperature();
  data.humidity = bme.readHumidity();
  data.pressure = bme.readPressure() / 100.0F; // Convert to hPa

  // Validate readings
  if (isnan(data.temperature) || isnan(data.humidity) || isnan(data.pressure) ||
      data.temperature < -40 || data.temperature > 85 ||
      data.humidity < 0 || data.humidity > 100 ||
      data.pressure < 300 || data.pressure > 1200) {
    Serial.println("Invalid sensor readings");
    return data;
  }

  data.valid = true;
  return data;
}

bool connectToWiFi() {
  if (!wifiConfig.configured) {
    Serial.println("WiFi not configured");
    return false;
  }

  Serial.printf("Connecting to WiFi: %s\n", wifiConfig.ssid);

  String command = "AT+CWJAP="" + String(wifiConfig.ssid) + "","" + String(wifiConfig.password) + """;

  if (sendATCommand(command, "WIFI CONNECTED", 15000)) {
    delay(2000);

    // Get IP address
    if (sendATCommand("AT+CIFSR", "+CIFSR:STAIP", 3000)) {
      Serial.println("WiFi connected successfully");
      return true;
    }
  }

  Serial.println("WiFi connection failed");
  return false;
}

bool connectToMQTT() {
  if (!wifiConnected) return false;

  Serial.printf("Connecting to MQTT server: %s:%d\n", wifiConfig.mqtt_server, wifiConfig.mqtt_port);

  // Set connection mode
  if (!sendATCommand("AT+CIPMODE=0", "OK", 2000)) return false;

  // Start TCP connection to MQTT broker
  String connectCmd = "AT+CIPSTART="TCP","" + String(wifiConfig.mqtt_server) + ""," + String(wifiConfig.mqtt_port);

  if (!sendATCommand(connectCmd, "CONNECT", 10000)) {
    Serial.println("TCP connection to MQTT broker failed");
    return false;
  }

  // MQTT CONNECT packet (simplified)
  String mqttConnect = "\x10\x12\x00\x04MQTT\x04\x02\x00\x3c\x00\x08STM32_001";
  String dataCmd = "AT+CIPSEND=" + String(mqttConnect.length());

  esp8266.println(dataCmd);
  delay(100);
  if (esp8266.find(">")) {
    esp8266.print(mqttConnect);
    if (esp8266.find("SEND OK")) {
      delay(1000);
      Serial.println("MQTT connected");
      return true;
    }
  }

  Serial.println("MQTT connection failed");
  return false;
}

bool publishSensorData(SensorData data) {
  if (!mqttConnected || !data.valid) return false;

  String payload = createJsonPayload(data);
  String topic = "sensors/" + String(DEVICE_ID) + "/data";

  // Create MQTT PUBLISH packet (simplified)
  String mqttPublish = "\x30"; // PUBLISH packet type
  String packetContent = "\x00" + String((char)topic.length()) + topic + payload;
  mqttPublish += String((char)(packetContent.length())) + packetContent;

  String sendCmd = "AT+CIPSEND=" + String(mqttPublish.length());

  esp8266.println(sendCmd);
  delay(100);
  if (esp8266.find(">")) {
    esp8266.print(mqttPublish);
    if (esp8266.find("SEND OK")) {
      Serial.printf("Published: %s\n", payload.c_str());
      return true;
    }
  }

  return false;
}

String createJsonPayload(SensorData data) {
  DynamicJsonDocument doc(200);

  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = data.timestamp;
  doc["temperature"] = round(data.temperature * 100.0) / 100.0;
  doc["humidity"] = round(data.humidity * 100.0) / 100.0;
  doc["pressure"] = round(data.pressure * 100.0) / 100.0;
  doc["firmware"] = "v2.1.3";

  String payload;
  serializeJson(doc, payload);
  return payload;
}

void handleSerialCommands() {
  if (Serial.available()) {
    String command = Serial.readString();
    command.trim();
    command.toUpperCase();

    if (command == "STATUS") {
      Serial.println("\SYSTEM STATUS:");
      Serial.printf("   Device ID: %s\n", DEVICE_ID);
      Serial.printf("   WiFi: %s\n", wifiConnected ? "Connected" : "Disconnected");
      Serial.printf("   MQTT: %s\n", mqttConnected ? "Connected" : "Disconnected");
      Serial.printf("   Sensor: %s\n", currentData.valid ? "OK" : "Error");
      if (currentData.valid) {
        Serial.printf("   Temperature: %.2f°C\n", currentData.temperature);
        Serial.printf("   Humidity: %.2f%%\n", currentData.humidity);
        Serial.printf("   Pressure: %.2f hPa\n", currentData.pressure);
      }
    }
    else if (command == "CONFIG") {
      enterConfigMode();
    }
    else if (command == "RESET") {
      Serial.println("Resetting system...");
      delay(1000);
      NVIC_SystemReset();
    }
    else if (command == "HELP") {
      Serial.println("\\AVAILABLE COMMANDS:");
      Serial.println("   STATUS - Show system status");
      Serial.println("   CONFIG - Enter configuration mode");
      Serial.println("   RESET  - Reset system");
      Serial.println("   HELP   - Show this help");
    }
  }
}

void enterConfigMode() {
  configMode = true;
  Serial.println("\nENTERING CONFIGURATION MODE");
  Serial.println("Enter WiFi configuration:");

  Serial.print("WiFi SSID: ");
  while (!Serial.available()) delay(100);
  String ssid = Serial.readString();
  ssid.trim();

  Serial.print("WiFi Password: ");
  while (!Serial.available()) delay(100);
  String password = Serial.readString();
  password.trim();

  Serial.print("MQTT Server: ");
  while (!Serial.available()) delay(100);
  String mqttServer = Serial.readString();
  mqttServer.trim();

  Serial.print("MQTT Port (1883): ");
  while (!Serial.available()) delay(100);
  String portStr = Serial.readString();
  portStr.trim();
  int port = portStr.length() > 0 ? portStr.toInt() : 1883;

  // Save configuration
  strncpy(wifiConfig.ssid, ssid.c_str(), WIFI_SSID_MAX_LEN - 1);
  strncpy(wifiConfig.password, password.c_str(), WIFI_PASS_MAX_LEN - 1);
  strncpy(wifiConfig.mqtt_server, mqttServer.c_str(), MQTT_SERVER_MAX_LEN - 1);
  wifiConfig.mqtt_port = port;
  wifiConfig.configured = true;

  saveWiFiConfig();

  Serial.println("Configuration saved!");
  Serial.println("Restarting...");
  delay(2000);
  NVIC_SystemReset();
}

void saveWiFiConfig() {
  // Calculate checksum
  uint8_t* configBytes = (uint8_t*)&wifiConfig;
  uint8_t checksum = 0;
  for (int i = 0; i < sizeof(WiFiConfig) - 1; i++) {
    checksum ^= configBytes[i];
  }
  wifiConfig.checksum = checksum;

  // Write to EEPROM
  for (int i = 0; i < sizeof(WiFiConfig); i++) {
    EEPROM.write(i, configBytes[i]);
  }
  EEPROM.commit();
}

void loadWiFiConfig() {
  // Read from EEPROM
  uint8_t* configBytes = (uint8_t*)&wifiConfig;
  for (int i = 0; i < sizeof(WiFiConfig); i++) {
    configBytes[i] = EEPROM.read(i);
  }

  // Verify checksum
  uint8_t checksum = 0;
  for (int i = 0; i < sizeof(WiFiConfig) - 1; i++) {
    checksum ^= configBytes[i];
  }

  if (checksum != wifiConfig.checksum) {
    Serial.println("Invalid configuration, using defaults");
    memset(&wifiConfig, 0, sizeof(WiFiConfig));
    strcpy(wifiConfig.mqtt_server, "mqtt.broker.com");
    wifiConfig.mqtt_port = 1883;
    wifiConfig.configured = false;
  } else {
    Serial.printf("Configuration loaded: %s\n", wifiConfig.ssid);
  }
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
  }
}

bool sendATCommand(String command, String expectedResponse, int timeout) {
  esp8266.println(command);

  unsigned long startTime = millis();
  String response = "";

  while (millis() - startTime < timeout) {
    if (esp8266.available()) {
      response += esp8266.readString();
      if (response.indexOf(expectedResponse) >= 0) {
        return true;
      }
    }
    delay(10);
  }

  Serial.printf("❌ AT Command failed: %s\n", command.c_str());
  Serial.printf("   Response: %s\n", response.c_str());
  return false;
}

void resetESP8266() {
  Serial.println("Resetting ESP8266...");

  // Hardware reset if connected to GPIO pin
  // pinMode(ESP_RESET_PIN, OUTPUT);
  // digitalWrite(ESP_RESET_PIN, LOW);
  // delay(100);
  // digitalWrite(ESP_RESET_PIN, HIGH);

  // Software reset
  esp8266.println("AT+RST");
  delay(3000);

  // Clear any remaining data
  while (esp8266.available()) {
    esp8266.read();
  }
}
