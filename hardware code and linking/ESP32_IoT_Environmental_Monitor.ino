// =================================================================
// ESP32-only IoT Environmental Monitor
// =================================================================

// --- Project Configuration ---
#include "config.h" // All settings are managed here

// --- Core ESP32 & WiFi Libraries ---
#include <WiFi.h>
#include <WebServer.h>
#include <WiFiManager.h>

// --- Sensor Libraries ---
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>

// --- MQTT & JSON Libraries ---
#include <PubSubClient.h>
#include <ArduinoJson.h>

// --- Global Objects ---
WiFiManager       wifiManager;
WebServer         server(80);
WiFiClient        wifiClient;
PubSubClient      mqttClient(wifiClient);
Adafruit_BME280   bme;

// --- Configuration Struct (Saved in ESP32 Preferences) ---
// Default values are loaded from config.h
struct AppConfig {
  char mqtt_server[64] = MQTT_SERVER_DEFAULT;
  char mqtt_port[6]    = MQTT_PORT_DEFAULT;
  char mqtt_user[32]   = "";
  char mqtt_password[64]= "";
  char device_id[32]   = DEVICE_ID_DEFAULT;
};

AppConfig config;
bool shouldSaveConfig = false;
unsigned long lastMqttAttempt = 0;
unsigned long lastPublishTime = 0;

// --- Function Prototypes ---
void saveConfigCallback();
void initializeSensor();
void connectToMQTT();
String getSensorDataJson();
String getStatusJson();
void handleRoot();
void handleStatus();

// =================================================================
// SETUP: Runs once on boot.
// =================================================================
void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  pinMode(RESET_PIN, INPUT_PULLUP);
  digitalWrite(LED_PIN, HIGH); // LED off initially

  Serial.println("\n========================================");
  Serial.println("ESP32 IoT Environmental Monitor");
  Serial.print("Firmware Version: ");
  Serial.println(FIRMWARE_VERSION);
  Serial.println("========================================");

  // Initialize the BME280 Sensor
  initializeSensor();

  // WiFiManager Setup
  wifiManager.setSaveConfigCallback(saveConfigCallback);

  WiFiManagerParameter custom_mqtt_server("server", "MQTT Server", config.mqtt_server, 64);
  WiFiManagerParameter custom_mqtt_port("port", "MQTT Port", config.mqtt_port, 6);
  WiFiManagerParameter custom_mqtt_user("user", "MQTT Username", config.mqtt_user, 32);
  WiFiManagerParameter custom_mqtt_password("pass", "MQTT Password", config.mqtt_password, 64);
  WiFiManagerParameter custom_device_id("id", "Device ID", config.device_id, 32);

  wifiManager.addParameter(&custom_mqtt_server);
  wifiManager.addParameter(&custom_mqtt_port);
  wifiManager.addParameter(&custom_mqtt_user);
  wifiManager.addParameter(&custom_mqtt_password);
  wifiManager.addParameter(&custom_device_id);

  if (digitalRead(RESET_PIN) == LOW) {
      Serial.println("Reset button pressed - clearing WiFi config.");
      wifiManager.resetSettings();
  }

  // Auto-connect or start configuration portal
  if (!wifiManager.autoConnect(CONFIG_AP_NAME, CONFIG_AP_PASSWORD)) {
    Serial.println("Failed to connect and timeout reached. Restarting...");
    delay(3000);
    ESP.restart();
  }

  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  // Copy configured values back to our struct
  strcpy(config.mqtt_server, custom_mqtt_server.getValue());
  strcpy(config.mqtt_port, custom_mqtt_port.getValue());
  strcpy(config.mqtt_user, custom_mqtt_user.getValue());
  strcpy(config.mqtt_password, custom_mqtt_password.getValue());
  strcpy(config.device_id, custom_device_id.getValue());

  // Setup MQTT Client
  mqttClient.setServer(config.mqtt_server, atoi(config.mqtt_port));
  mqttClient.setBufferSize(MQTT_BUFFER_SIZE);

  // Setup Web Server
  server.on("/", handleRoot);
  server.on("/status", handleStatus);
  server.begin();
  Serial.println("Web server started. Open IP in browser.");
}

// =================================================================
// LOOP: Runs continuously.
// =================================================================
void loop() {
  server.handleClient(); // Handle incoming web requests

  // Maintain MQTT connection
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      if (millis() - lastMqttAttempt > MQTT_RECONNECT_INTERVAL) {
        lastMqttAttempt = millis();
        connectToMQTT();
      }
    } else {
      mqttClient.loop(); // Process MQTT messages
    }
  }
  
  // LED indicates MQTT connection status
  digitalWrite(LED_PIN, mqttClient.connected() ? LOW : HIGH); // LED ON when connected

  // Publish sensor data at a regular interval
  if (mqttClient.connected() && (millis() - lastPublishTime > MQTT_PUBLISH_INTERVAL)) {
    lastPublishTime = millis();
    String payload = getSensorDataJson();
    String topic = "sensors/" + String(config.device_id) + "/data";
    
    if (mqttClient.publish(topic.c_str(), payload.c_str())) {
      Serial.printf("MQTT Message Published to %s\n", topic.c_str());
      Serial.println(payload);
    } else {
      Serial.println("MQTT Publish Failed");
    }
  }
}

// --- Helper Functions ---

void initializeSensor() {
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  if (!bme.begin(BME280_I2C_ADDRESS, &Wire)) {
    Serial.println("Could not find a valid BME280 sensor, check wiring!");
    while (1); // Halt execution
  }
  Serial.println("BME280 Sensor initialized.");
}

void saveConfigCallback() {
  Serial.println("Configuration saved via WiFiManager. Device will reboot.");
  shouldSaveConfig = true; // ESP32 needs reboot to apply settings properly
  ESP.restart();
}

void connectToMQTT() {
  if (strlen(config.mqtt_server) == 0) return;
  
  Serial.printf("Connecting to MQTT broker: %s\n", config.mqtt_server);
  String clientId = String(config.device_id) + "_" + WiFi.macAddress();
  
  bool connected = false;
  if (strlen(config.mqtt_user) > 0) {
    connected = mqttClient.connect(clientId.c_str(), config.mqtt_user, config.mqtt_password);
  } else {
    connected = mqttClient.connect(clientId.c_str());
  }

  if (connected) {
    Serial.println("MQTT connected!");
    String statusTopic = "sensors/" + String(config.device_id) + "/status";
    mqttClient.publish(statusTopic.c_str(), "online", true); // Retain status
  } else {
    Serial.printf("MQTT connection failed, rc=%d\n", mqttClient.state());
  }
}

String getSensorDataJson() {
  DynamicJsonDocument doc(256);

  float temp = bme.readTemperature();
  float hum = bme.readHumidity();
  float press = bme.readPressure() / 100.0F;

  // Basic validation
  if (isnan(temp) || isnan(hum) || isnan(press)) {
    Serial.println("Failed to read from BME280 sensor!");
    return "{}";
  }

  doc["deviceId"] = config.device_id;
  doc["timestamp"] = millis();
  doc["temperature"] = round(temp * 100.0) / 100.0;
  doc["humidity"] = round(hum * 100.0) / 100.0;
  doc["pressure"] = round(press * 100.0) / 100.0;
  doc["firmware"] = FIRMWARE_VERSION;

  String payload;
  serializeJson(doc, payload);
  return payload;
}

// --- Web Server Handlers ---

void handleRoot() {
  String html = R"rawliteral(
  <!DOCTYPE html><html><head><title>ESP32 Monitor</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>body{font-family:Arial, sans-serif; text-align:center; margin: 20px;} h1{color:#007bff;}</style>
  </head><body><h1>ESP32 Environmental Monitor</h1>
  <div id="status">Loading...</div>
  <p><button onclick="location.reload()">Refresh</button></p>
  <script>
  function updateStatus(){fetch("/status").then(r=>r.json()).then(d=>{
    let s = "<h2>Status</h2>";
    s += "<p><strong>WiFi:</strong> " + (d.wifi_connected ? "Connected ("+d.ip+")" : "Disconnected") + "</p>";
    s += "<p><strong>MQTT:</strong> " + (d.mqtt_connected ? "Connected to "+d.mqtt_server : "Disconnected") + "</p>";
    s += "<p><strong>Device ID:</strong> " + d.device_id + "</p>";
    s += "<p><strong>Uptime:</strong> " + d.uptime + "s</p>";
    document.getElementById("status").innerHTML=s;
  })}
  setInterval(updateStatus, 3000); window.onload=updateStatus;
  </script></body></html>)rawliteral";
  server.send(200, "text/html", html);
}

void handleStatus() {
  server.send(200, "application/json", getStatusJson());
}

String getStatusJson() {
  DynamicJsonDocument doc(512);
  doc["wifi_connected"] = (WiFi.status() == WL_CONNECTED);
  doc["ip"] = WiFi.localIP().toString();
  doc["mqtt_connected"] = mqttClient.connected();
  doc["mqtt_server"] = config.mqtt_server;
  doc["device_id"] = config.device_id;
  doc["uptime"] = millis() / 1000;
  doc["free_heap"] = ESP.getFreeHeap();
  String result;
  serializeJson(doc, result);
  return result;
}
