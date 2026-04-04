#include <WiFi.h>
#include "time.h"
#include "DHT.h"
#include <WebSocketsClient.h>

// ---------------- CONFIG ----------------
const char* ssid = "4GMIFI_3131";
const char* password = "1234567890";
const char* ws_host = "192.168.0.57"; 
const uint16_t ws_port = 5001;

const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 25200;     // UTC+7 (Bangkok) — change if needed
const int   daylightOffset_sec = 0;

// ---------------- PIN DEFINITIONS ----------------
#define DHTPIN 14
#define DHTTYPE DHT11
#define WATER_LEVEL_PIN 27 
#define BUZZER_PIN 25
#define RED_LED_PIN 26
#define FAN_RELAY 19
#define BUTTON_PIN 32
#define LIGHT_RELAY 23

// ---------------- THRESHOLDS ----------------
const int DRY_THRESHOLD = 2500;
const int WET_THRESHOLD = 1500;

struct Zone {
  int id;
  int soilPin;
  int pumpPin;
  int moisture;
};

Zone zones[] = {
  {1, 33, 18, 0}
};
const int activeZones = 1;

// ---------------- GLOBALS ----------------
bool tankIsLow = false;
float currentTemp = 0;

unsigned long alarmStartTime = 0;
bool alarmActive = false;
bool buzzerDone = false;

DHT dht(DHTPIN, DHTTYPE);
WebSocketsClient webSocket;

// ---------------- ALARM LOGIC ----------------
void updateAlarm() {
  if (tankIsLow) {
    digitalWrite(RED_LED_PIN, HIGH);

    if (!buzzerDone) {
      if (!alarmActive) {
        alarmActive = true;
        alarmStartTime = millis();
        digitalWrite(BUZZER_PIN, HIGH);
        Serial.println("[ALARM] Tank is LOW! RED LED → ON");
        Serial.println("[ALARM] Buzzer → ON (will stop after 3s)");
      }

      if (millis() - alarmStartTime >= 3000) {
        digitalWrite(BUZZER_PIN, LOW);
        buzzerDone = true;
        Serial.println("[ALARM] Buzzer → OFF (3s elapsed, LED stays ON)");
      }
    }
  } 
  else {
    digitalWrite(RED_LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
    if (alarmActive || buzzerDone) {
      Serial.println("[ALARM] Tank OK — RED LED → OFF, Buzzer → OFF, Alarm reset");
    }
    alarmActive = false;
    buzzerDone = false;
  }
}

// ---------------- LIGHT LOGIC ----------------
void updateLight() {
  static bool lastLightState = false;

  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("[LIGHT] Failed to get time — skipping light control");
    return;
  }

  int hour = timeinfo.tm_hour;

  // ON if hour >= 18 (6pm) OR hour < 6 (before 6am)
  bool lightShouldBeOn = (hour >= 18 || hour < 6);

  if (lightShouldBeOn != lastLightState) {
    digitalWrite(LIGHT_RELAY, lightShouldBeOn ? HIGH : LOW);
    lastLightState = lightShouldBeOn;

    char timeStr[20];
    strftime(timeStr, sizeof(timeStr), "%H:%M:%S", &timeinfo);
    Serial.printf("[LIGHT] → %s at %s\n", lightShouldBeOn ? "ON" : "OFF", timeStr);
  }
}

// ---------------- SENSOR TASK ----------------
void readSensorsTask(void *pvParameters) {
  for (;;) {
    currentTemp = dht.readTemperature();
    float currentHumidity = dht.readHumidity();

    for (int i = 0; i < activeZones; i++) {
      zones[i].moisture = analogRead(zones[i].soilPin);
    }

    tankIsLow = (digitalRead(WATER_LEVEL_PIN) == LOW);

    Serial.println("========== [SENSOR READINGS] ==========");

    if (isnan(currentTemp) || isnan(currentHumidity)) {
      Serial.println("[DHT]  Failed to read from DHT11 sensor!");
    } else {
      Serial.printf("[DHT]  Temperature : %.1f C\n", currentTemp);
      Serial.printf("[DHT]  Humidity    : %.1f %%\n", currentHumidity);
    }

    for (int i = 0; i < activeZones; i++) {
      Serial.printf("[SOIL] Zone %d moisture : %d (raw ADC)", zones[i].id, zones[i].moisture);
      if (zones[i].moisture > DRY_THRESHOLD) {
        Serial.println("  → DRY");
      } else if (zones[i].moisture < WET_THRESHOLD) {
        Serial.println("  → WET");
      } else {
        Serial.println("  → OK");
      }
    }

    Serial.printf("[TANK] Water level : %s\n", tankIsLow ? "LOW" : "OK");
    for (int i = 0; i < activeZones; i++) {
      Serial.printf("[PUMP]  Zone %d : %s\n", zones[i].id, digitalRead(zones[i].pumpPin) == LOW ? "ON" : "OFF");
    }
    Serial.printf("[FAN]   Relay : %s\n", digitalRead(FAN_RELAY) == LOW ? "ON" : "OFF");
    Serial.printf("[LIGHT] Relay : %s\n", digitalRead(LIGHT_RELAY) == LOW ? "ON" : "OFF");

    // Print current time
    struct tm timeinfo;
    if (getLocalTime(&timeinfo)) {
      char timeStr[30];
      strftime(timeStr, sizeof(timeStr), "%Y-%m-%d %H:%M:%S", &timeinfo);
      Serial.printf("[TIME]  Current time : %s\n", timeStr);
    }
    Serial.println("========================================");

    vTaskDelay(2000 / portTICK_PERIOD_MS);
  }
}

// ---------------- CONTROL LOGIC ----------------
void controlLogicTask(void *pvParameters) {
  static bool lastPumpState[10] = {false};
  static bool lastFanState = false;

  for (;;) {
    updateAlarm();

    for (int i = 0; i < activeZones; i++) {
      bool pumpShouldBeOn = (zones[i].moisture > DRY_THRESHOLD && !tankIsLow);

      if (pumpShouldBeOn != lastPumpState[i]) {
        digitalWrite(zones[i].pumpPin, pumpShouldBeOn ? LOW : HIGH);
        lastPumpState[i] = pumpShouldBeOn;

        if (pumpShouldBeOn) {
          Serial.printf("[PUMP] Zone %d → ON  (soil DRY: %d > %d)\n", zones[i].id, zones[i].moisture, DRY_THRESHOLD);
        } else if (tankIsLow) {
          Serial.printf("[PUMP] Zone %d → OFF (tank LOW)\n", zones[i].id);
        } else {
          Serial.printf("[PUMP] Zone %d → OFF (soil WET: %d < %d)\n", zones[i].id, zones[i].moisture, WET_THRESHOLD);
        }
      }
    }

    bool fanShouldBeOn = (currentTemp > 30.0);
    if (fanShouldBeOn != lastFanState) {
      digitalWrite(FAN_RELAY, fanShouldBeOn ? LOW : HIGH);
      lastFanState = fanShouldBeOn;
      Serial.printf("[FAN]  → %s (temp %.1f C)\n", fanShouldBeOn ? "ON" : "OFF", currentTemp);
    }

    vTaskDelay(100 / portTICK_PERIOD_MS);
  }
}

// ---------------- SEND DATA ----------------
void sendDataTask(void *pvParameters) {
  for (;;) {
    if (WiFi.status() == WL_CONNECTED) {

      bool lightOn = (digitalRead(LIGHT_RELAY) == LOW);
      bool fanOn   = (digitalRead(FAN_RELAY) == LOW);
      bool pumpOn  = (digitalRead(zones[0].pumpPin) == LOW);

      float humidity = dht.readHumidity();

      String json = "{";
      json += "\"farm_id\":1,";                                          // ✅ change to your actual farm id
      json += "\"zone_id\":" + String(zones[0].id) + ",";
      json += "\"temperature\":" + String(currentTemp) + ",";
      json += "\"humidity\":" + String(isnan(humidity) ? 0 : humidity) + ",";
      json += "\"light_lux\":0,";
      json += "\"moisture_1\":" + String(zones[0].moisture) + ",";
      json += "\"pump\":" + String(pumpOn ? "true" : "false") + ",";
      json += "\"fan\":" + String(fanOn ? "true" : "false") + ",";
      json += "\"light\":" + String(lightOn ? "true" : "false");
      json += "}";

      bool sent = webSocket.sendTXT(json);
      if (sent) {
        Serial.println("[WS] Data sent successfully → " + json);
      } else {
        Serial.println("[WS] Failed to send data (WebSocket not connected?)");
      }

    } else {
      Serial.println("[WS] WiFi disconnected — skipping send");
    }

    vTaskDelay(60000 / portTICK_PERIOD_MS);
  }
}

// ---------------- WEBSOCKET ----------------
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.println("[WS] WebSocket connected to server");
      break;
    case WStype_DISCONNECTED:
      Serial.println("[WS] WebSocket disconnected");
      break;
    case WStype_TEXT: {
      String msg = (char*)payload;
      Serial.println("[WS] Message received: " + msg);
      break;
    }
    default:
      break;
  }
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);
  Serial.println("\n[BOOT] Starting Smart Irrigation System...");

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(FAN_RELAY, OUTPUT);
  pinMode(WATER_LEVEL_PIN, INPUT_PULLUP);

  for (int i = 0; i < activeZones; i++) {
    pinMode(zones[i].pumpPin, OUTPUT);
    digitalWrite(zones[i].pumpPin, HIGH);
    Serial.printf("[BOOT] Zone %d pump pin %d → OFF (default)\n", zones[i].id, zones[i].pumpPin);
  }

  dht.begin();
  Serial.println("[BOOT] DHT11 initialized");

  Serial.printf("[BOOT] Connecting to WiFi: %s\n", ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.printf("[BOOT] WiFi connected — IP: %s\n", WiFi.localIP().toString().c_str());

  Serial.printf("[BOOT] Connecting to WebSocket ws://%s:%d\n", ws_host, ws_port);
  webSocket.begin(ws_host, ws_port, "/ws");
  webSocket.onEvent(webSocketEvent);

  xTaskCreate(readSensorsTask,  "Sensors", 8000, NULL, 1, NULL);
  xTaskCreate(controlLogicTask, "Control", 4000, NULL, 1, NULL);
  xTaskCreate(sendDataTask,     "Sender",  4000, NULL, 1, NULL);

  Serial.println("[BOOT] All tasks started. System running.\n");
}

void loop() {
  webSocket.loop();
}