#include <WiFi.h>
#include "time.h"
#include "DHT.h"
#include <WebSocketsClient.h>

// ---------------- WIFI CONFIG ----------------
const char* ssid = "4GMIFI_3131";
const char* password = "1234567890";

WebSocketsClient webSocket;

// ---------------- SERVER CONFIG ----------------
// ⚠️ CHANGE THIS to your Node.js server IP
const char* ws_host = "192.168.1.100";
const uint16_t ws_port = 5001;
const char* ws_path = "/ws";

// ---------------- TIME CONFIG ----------------
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 7 * 3600;
const int daylightOffset_sec = 0;

// ---------------- PIN DEFINITIONS ----------------
#define DHTPIN 14
#define SOIL_PIN 33
#define PUMP_RELAY 18
#define FAN_RELAY 19
#define LIGHT_RELAY 23
#define BUTTON_PIN 32

#define DHTTYPE DHT11

// ---------------- GLOBAL VARIABLES ----------------
volatile bool manualOverride = false;
float currentTemp = 0;
float currentHumidity = 0;
int currentSoil = 0;
String hardwareId = "";

DHT dht(DHTPIN, DHTTYPE);

// Task Handles
TaskHandle_t SensorTaskHandle;
TaskHandle_t ControlTaskHandle;
TaskHandle_t SendTaskHandle;

// ---------------- WEBSOCKET EVENT ----------------
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {

    case WStype_CONNECTED:
      Serial.println("[WS] Connected to server");
      // Send discovery handshake so backend registers this device
      {
        String discovery = "{";
        discovery += "\"type\":\"discovery\",";
        discovery += "\"hardware_id\":\"" + hardwareId + "\",";
        discovery += "\"zones\":1,";
        discovery += "\"has_dht\":true,";
        discovery += "\"has_light\":false";
        discovery += "}";
        webSocket.sendTXT(discovery);
        Serial.println("[WS] Sent discovery: " + discovery);
      }
      break;

    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected");
      break;

    case WStype_TEXT:
      Serial.printf("[WS RECEIVED] %s\n", payload);
      // Simple example: Use a JSON library (like ArduinoJson) to parse
      // Or a quick string check for your project demo:
      String message = (char*)payload;
      
      if (message.indexOf("\"command\":\"PUMP_ON\"") >= 0) {
          manualOverride = true;
          digitalWrite(PUMP_RELAY, LOW); // Turn on pump
      } 
      else if (message.indexOf("\"command\":\"PUMP_OFF\"") >= 0) {
          digitalWrite(PUMP_RELAY, HIGH); // Turn off pump
      }
      break;
  }
}

// ---------------- SENSOR TASK ----------------
void readSensorsTask(void *pvParameters) {
  for (;;) {
    currentTemp = dht.readTemperature();
    currentHumidity = dht.readHumidity();
    currentSoil = analogRead(SOIL_PIN);

    Serial.printf("[SENSORS] Temp: %.1f | Humidity: %.1f | Soil: %d\n", currentTemp, currentHumidity, currentSoil);

    vTaskDelay(2000 / portTICK_PERIOD_MS);
  }
}

// ---------------- CONTROL TASK ----------------
void controlLogicTask(void *pvParameters) {
  for (;;) {

    // -------- BUTTON TOGGLE --------
    if (digitalRead(BUTTON_PIN) == LOW) {
      manualOverride = !manualOverride;

      Serial.print("[SYSTEM] Manual Mode: ");
      Serial.println(manualOverride ? "ON" : "OFF");

      vTaskDelay(500 / portTICK_PERIOD_MS);
    }

    if (manualOverride) {
      // FORCE ALL ON
      digitalWrite(PUMP_RELAY, LOW);
      digitalWrite(FAN_RELAY, LOW);
      digitalWrite(LIGHT_RELAY, LOW);

    } else {

      // -------- FAN LOGIC --------
      if (currentTemp > 30.0) {
        digitalWrite(FAN_RELAY, LOW);
      } else {
        digitalWrite(FAN_RELAY, HIGH);
      }

      // -------- PUMP LOGIC --------
      if (currentSoil > 2200) {
        digitalWrite(PUMP_RELAY, LOW);
      } else {
        digitalWrite(PUMP_RELAY, HIGH);
      }

      // -------- LIGHT LOGIC --------
      struct tm timeinfo;

      if (getLocalTime(&timeinfo)) {
        int hour = timeinfo.tm_hour;

        Serial.printf("[TIME] Hour: %d\n", hour);

        // Night: 6PM → 6AM
        if (hour >= 18 || hour < 6) {
          digitalWrite(LIGHT_RELAY, LOW);
        } else {
          digitalWrite(LIGHT_RELAY, HIGH);
        }
      } else {
        Serial.println("[ERROR] Failed to get time");
      }
    }

    vTaskDelay(100 / portTICK_PERIOD_MS);
  }
}

// ---------------- SEND DATA TASK ----------------
void sendDataTask(void *pvParameters) {
  for (;;) {

    String json = "{";
    json += "\"hardware_id\":\"" + hardwareId + "\",";
    json += "\"zone_id\":1,";
    json += "\"temperature\":" + String(currentTemp) + ",";
    json += "\"humidity\":" + String(currentHumidity) + ",";
    json += "\"moisture_1\":" + String(currentSoil) + ",";
    json += "\"light_lux\":0,";
    json += "\"pump\":" + String(digitalRead(PUMP_RELAY) == LOW ? "true" : "false") + ",";
    json += "\"fan\":" + String(digitalRead(FAN_RELAY) == LOW ? "true" : "false") + ",";
    json += "\"light\":" + String(digitalRead(LIGHT_RELAY) == LOW ? "true" : "false");
    json += "}";

    webSocket.sendTXT(json);

    Serial.println("[WS SEND] " + json);

    vTaskDelay(5000 / portTICK_PERIOD_MS);
  }
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);

  pinMode(PUMP_RELAY, OUTPUT);
  pinMode(FAN_RELAY, OUTPUT);
  pinMode(LIGHT_RELAY, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  // Initial OFF (Active LOW)
  digitalWrite(PUMP_RELAY, HIGH);
  digitalWrite(FAN_RELAY, HIGH);
  digitalWrite(LIGHT_RELAY, HIGH);

  dht.begin();

  // -------- WIFI CONNECT --------
  // Connect first so WiFi.macAddress() is available

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected!");

  // -------- HARDWARE ID (MAC ADDRESS) --------
  hardwareId = WiFi.macAddress();
  hardwareId.replace(":", "");  // "A1B2C3D4E5F6"
  Serial.println("Hardware ID: " + hardwareId);

  // -------- TIME INIT --------
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  // -------- WEBSOCKET INIT --------
  webSocket.begin(ws_host, ws_port, ws_path);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  // -------- TASKS --------
  xTaskCreate(readSensorsTask, "SensorTask", 3000, NULL, 1, &SensorTaskHandle);
  xTaskCreate(controlLogicTask, "ControlTask", 4000, NULL, 1, &ControlTaskHandle);
  xTaskCreate(sendDataTask, "SendTask", 4000, NULL, 1, &SendTaskHandle);
}

// ---------------- LOOP ----------------
void loop() {
  webSocket.loop();
}