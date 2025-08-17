
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <WiFiManager.h>
#include <ArduinoJson.h>
#include <EEPROM.h>
#include <PubSubClient.h>

#define SERIAL_BAUD 115200
#define CONFIG_AP_NAME "STM32_IoT_Config"
#define CONFIG_AP_PASSWORD "config123"
#define MQTT_BUFFER_SIZE 512
#define CONFIG_TIMEOUT 180 // 3 minutes

#define LED_PIN 2
#define RESET_PIN 0

WiFiManager wifiManager;
ESP8266WebServer server(80);
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

struct Config {
  char mqtt_server[64];
  int mqtt_port;
  char mqtt_user[32];
  char mqtt_password[64];
  char device_id[32];
  bool configured;
  uint8_t checksum;
};

Config config;
bool mqttConnected = false;
unsigned long lastMqttAttempt = 0;
const unsigned long mqttRetryInterval = 30000;

void setup();
void loop();
void setupWiFiManager();
void saveConfigCallback();
void handleRoot();
void handleConfig();
void handleSave();
void handleStatus();
void handleReset();
void loadConfig();
void saveConfig();
void connectToMQTT();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void handleSTM32Data();
void blinkLED(int times, int interval);
String getStatusJson();

void setup() {
  Serial.begin(SERIAL_BAUD);
  EEPROM.begin(512);

  pinMode(LED_PIN, OUTPUT);
  pinMode(RESET_PIN, INPUT_PULLUP);

  digitalWrite(LED_PIN, HIGH);

  Serial.println("\n========================================");
  Serial.println("ESP8266 WiFi Manager for STM32 IoT");
  Serial.println("Version: 2.0");
  Serial.println("========================================");

  loadConfig();

  if (digitalRead(RESET_PIN) == LOW) {
    Serial.println("🔄 Reset button pressed - clearing WiFi config");
    wifiManager.resetSettings();
    delay(1000);
  }

  setupWiFiManager();

  server.on("/", handleRoot);
  server.on("/config", handleConfig);
  server.on("/save", HTTP_POST, handleSave);
  server.on("/status", handleStatus);
  server.on("/reset", handleReset);

  server.begin();
  Serial.println("✅ Web server started");


  if (config.configured && strlen(config.mqtt_server) > 0) {
    mqttClient.setServer(config.mqtt_server, config.mqtt_port);
    mqttClient.setCallback(mqttCallback);
    mqttClient.setBufferSize(MQTT_BUFFER_SIZE);
  }

  Serial.println("ESP8266 ready for STM32 communication");
  blinkLED(3, 200);
}

void loop() {

  wifiManager.process();

  server.handleClient();

  if (WiFi.status() == WL_CONNECTED) {
    if (config.configured && !mqttClient.connected()) {
      if (millis() - lastMqttAttempt > mqttRetryInterval) {
        connectToMQTT();
        lastMqttAttempt = millis();
      }
    }

    if (mqttClient.connected()) {
      mqttClient.loop();
      digitalWrite(LED_PIN, LOW);
    } else {
      digitalWrite(LED_PIN, HIGH); 
    }
  }

  handleSTM32Data();

  delay(10);
}

void setupWiFiManager() {
  wifiManager.setSaveConfigCallback(saveConfigCallback);

  WiFiManagerParameter custom_mqtt_server("mqtt_server", "MQTT Server", config.mqtt_server, 64);
  WiFiManagerParameter custom_mqtt_port("mqtt_port", "MQTT Port", String(config.mqtt_port).c_str(), 6);
  WiFiManagerParameter custom_mqtt_user("mqtt_user", "MQTT Username", config.mqtt_user, 32);
  WiFiManagerParameter custom_mqtt_password("mqtt_password", "MQTT Password", config.mqtt_password, 64);
  WiFiManagerParameter custom_device_id("device_id", "Device ID", config.device_id, 32);

  wifiManager.addParameter(&custom_mqtt_server);
  wifiManager.addParameter(&custom_mqtt_port);
  wifiManager.addParameter(&custom_mqtt_user);
  wifiManager.addParameter(&custom_mqtt_password);
  wifiManager.addParameter(&custom_device_id);

  wifiManager.setConfigPortalTimeout(CONFIG_TIMEOUT);

  wifiManager.setMinimumSignalQuality(20);

  if (!wifiManager.autoConnect(CONFIG_AP_NAME, CONFIG_AP_PASSWORD)) {
    Serial.println("Failed to connect and configuration timeout reached");
    delay(3000);
    ESP.restart();
  }

  Serial.println("WiFi connected successfully");
  Serial.printf("IP address: %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("RSSI: %d dBm\n", WiFi.RSSI());
}

void saveConfigCallback() {
  Serial.println("Configuration saved via WiFiManager");

  // Get parameters
  strcpy(config.mqtt_server, wifiManager.getParameters()[0]->getValue());
  config.mqtt_port = String(wifiManager.getParameters()[1]->getValue()).toInt();
  strcpy(config.mqtt_user, wifiManager.getParameters()[2]->getValue());
  strcpy(config.mqtt_password, wifiManager.getParameters()[3]->getValue());
  strcpy(config.device_id, wifiManager.getParameters()[4]->getValue());

  if (config.mqtt_port == 0) config.mqtt_port = 1883;
  if (strlen(config.device_id) == 0) strcpy(config.device_id, "STM32_001");

  config.configured = true;
  saveConfig();

  mqttClient.setServer(config.mqtt_server, config.mqtt_port);
}

void handleRoot() {
  String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
    <title>ESP8266 WiFi Manager</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial; margin: 20px; background: #f0f0f0; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .connected { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .disconnected { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        button:hover { background: #0056b3; }
        .config-form { margin: 20px 0; }
        input[type="text"], input[type="password"], input[type="number"] { 
            width: 100%; padding: 8px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px; 
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>ESP8266 WiFi Manager</h1>
        <h2>tatus</h2>
        <div id="status">Loading...</div>

        <h2>MQTT Configuration</h2>
        <form action="/save" method="post" class="config-form">
            <label>MQTT Server:</label>
            <input type="text" name="mqtt_server" value=")rawliteral" + String(config.mqtt_server) + R"rawliteral(" required>

            <label>MQTT Port:</label>
            <input type="number" name="mqtt_port" value=")rawliteral" + String(config.mqtt_port) + R"rawliteral(" required>

            <label>MQTT Username:</label>
            <input type="text" name="mqtt_user" value=")rawliteral" + String(config.mqtt_user) + R"rawliteral(">

            <label>MQTT Password:</label>
            <input type="password" name="mqtt_password" value=")rawliteral" + String(config.mqtt_password) + R"rawliteral(">

            <label>Device ID:</label>
            <input type="text" name="device_id" value=")rawliteral" + String(config.device_id) + R"rawliteral(" required>

            <button type="submit">Save Configuration</button>
        </form>

        <h2>🔧 Actions</h2>
        <button onclick="location.href='/reset'">Reset WiFi Settings</button>
        <button onclick="updateStatus()">Refresh Status</button>
    </div>

    <script>
        function updateStatus() {
            fetch('/status')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('status').innerHTML = 
                        '<div class="' + (data.wifi_connected ? 'connected' : 'disconnected') + '">' +
                        'WiFi: ' + (data.wifi_connected ? 'Connected (' + data.ip + ')' : 'Disconnected') + '</div>' +
                        '<div class="' + (data.mqtt_connected ? 'connected' : 'disconnected') + '">' +
                        'MQTT: ' + (data.mqtt_connected ? 'Connected' : 'Disconnected') + '</div>' +
                        '<div>Device ID: ' + data.device_id + '</div>' +
                        '<div>Uptime: ' + data.uptime + 's</div>';
                });
        }
        updateStatus();
        setInterval(updateStatus, 5000);
    </script>
</body>
</html>
)rawliteral";

  server.send(200, "text/html", html);
}

void handleConfig() {
  handleRoot();
}

void handleSave() {
  if (server.hasArg("mqtt_server")) {
    strcpy(config.mqtt_server, server.arg("mqtt_server").c_str());
    config.mqtt_port = server.arg("mqtt_port").toInt();
    strcpy(config.mqtt_user, server.arg("mqtt_user").c_str());
    strcpy(config.mqtt_password, server.arg("mqtt_password").c_str());
    strcpy(config.device_id, server.arg("device_id").c_str());

    config.configured = true;
    saveConfig();

    mqttClient.setServer(config.mqtt_server, config.mqtt_port);

    server.send(200, "text/html", 
                "<html><body><h1>✅ Configuration Saved!</h1>"
                "<p>MQTT settings have been updated.</p>"
                "<a href='/'>← Back to Dashboard</a></body></html>");
  } else {
    server.send(400, "text/html", "<html><body><h1>Error</h1><p>Missing parameters</p></body></html>");
  }
}

void handleStatus() {
  server.send(200, "application/json", getStatusJson());
}

void handleReset() {
  wifiManager.resetSettings();
  server.send(200, "text/html", 
              "<html><body><h1>WiFi Settings Reset</h1>"
              "<p>The device will restart and enter configuration mode.</p></body></html>");
  delay(2000);
  ESP.restart();
}

void loadConfig() {
  EEPROM.get(0, config);

  uint8_t* configBytes = (uint8_t*)&config;
  uint8_t checksum = 0;
  for (int i = 0; i < sizeof(Config) - 1; i++) {
    checksum ^= configBytes[i];
  }

  if (checksum != config.checksum || !config.configured) {
    Serial.println("Invalid or missing configuration, using defaults");
    memset(&config, 0, sizeof(Config));
    strcpy(config.mqtt_server, "mqtt.broker.com");
    config.mqtt_port = 1883;
    strcpy(config.device_id, "STM32_001");
    config.configured = false;
  } else {
    Serial.printf("Configuration loaded: %s:%d\n", config.mqtt_server, config.mqtt_port);
  }
}

void saveConfig() {
  
  uint8_t* configBytes = (uint8_t*)&config;
  uint8_t checksum = 0;
  for (int i = 0; i < sizeof(Config) - 1; i++) {
    checksum ^= configBytes[i];
  }
  config.checksum = checksum;

  EEPROM.put(0, config);
  EEPROM.commit();
  Serial.println("Configuration saved to EEPROM");
}

void connectToMQTT() {
  if (!config.configured || strlen(config.mqtt_server) == 0) return;

  Serial.printf("Connecting to MQTT: %s:%d\n", config.mqtt_server, config.mqtt_port);

  String clientId = String(config.device_id) + "_" + String(WiFi.macAddress());

  bool connected = false;
  if (strlen(config.mqtt_user) > 0) {
    connected = mqttClient.connect(clientId.c_str(), config.mqtt_user, config.mqtt_password);
  } else {
    connected = mqttClient.connect(clientId.c_str());
  }

  if (connected) {
    Serial.println("MQTT connected");
    mqttConnected = true;


    String controlTopic = "sensors/" + String(config.device_id) + "/control";
    mqttClient.subscribe(controlTopic.c_str());


    String statusTopic = "sensors/" + String(config.device_id) + "/status";
    mqttClient.publish(statusTopic.c_str(), "online", true);

    blinkLED(2, 100);
  } else {
    Serial.printf("MQTT connection failed, rc=%d\n", mqttClient.state());
    mqttConnected = false;
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.printf("📨 MQTT message received: %s -> %s\n", topic, message.c_str());

  // Forward to STM32 via serial
  Serial.printf("MQTT:%s:%s\n", topic, message.c_str());
}

void handleSTM32Data() {
  if (Serial.available()) {
    String data = Serial.readStringUntil('\n');
    data.trim();

    if (data.startsWith("SENSOR:")) {

      String sensorData = data.substring(7);

      if (mqttClient.connected() && config.configured) {
        String topic = "sensors/" + String(config.device_id) + "/data";

        if (mqttClient.publish(topic.c_str(), sensorData.c_str())) {
          Serial.println("Sensor data published to MQTT");
        } else {
          Serial.println("Failed to publish sensor data");
        }
      }
    }
    else if (data.startsWith("CMD:")) {

      String command = data.substring(4);

      if (command == "STATUS") {
        Serial.println("STATUS:" + getStatusJson());
      }
      else if (command == "RESET_WIFI") {
        wifiManager.resetSettings();
        ESP.restart();
      }
    }
  }
}

void blinkLED(int times, int interval) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, LOW);
    delay(interval);
    digitalWrite(LED_PIN, HIGH);
    delay(interval);
  }
}

String getStatusJson() {
  DynamicJsonDocument doc(512);

  doc["wifi_connected"] = (WiFi.status() == WL_CONNECTED);
  doc["ip"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();
  doc["mqtt_connected"] = mqttClient.connected();
  doc["mqtt_server"] = config.mqtt_server;
  doc["mqtt_port"] = config.mqtt_port;
  doc["device_id"] = config.device_id;
  doc["uptime"] = millis() / 1000;
  doc["free_heap"] = ESP.getFreeHeap();

  String result;
  serializeJson(doc, result);
  return result;
}
