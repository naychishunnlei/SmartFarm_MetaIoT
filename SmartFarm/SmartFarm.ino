#include <WiFi.h>
#include "time.h"
#include "DHT.h"
#include <WebSocketsClient.h>

// ---------------- CONFIG ----------------
const char* ssid     = "4GMIFI_3131";
const char* password = "1234567890";
const char* ws_host  = "192.168.0.57";
const uint16_t ws_port = 5001;

const char* ntpServer       = "pool.ntp.org";
const long  gmtOffset_sec   = 25200;   // UTC+7 (Bangkok)
const int   daylightOffset_sec = 0;

// ---------------- PIN DEFINITIONS ----------------
#define DHTPIN          14
#define DHTTYPE         DHT11
#define WATER_LEVEL_PIN 27
#define BUZZER_PIN      25
#define RED_LED_PIN     26
#define YELLOW_LED_PIN  4
#define FAN_RELAY       19
#define LIGHT_RELAY     23
#define BUTTON_PUMP_PIN 32   // Manual override: pump (zone 1)
#define BUTTON_FAN_PIN  21   // Manual override: fan
#define BUTTON_LIGHT_PIN 22  // Manual override: light

// ---------------- THRESHOLDS ----------------
const int DRY_THRESHOLD = 2500;
const int WET_THRESHOLD = 1500;

// ---------------- ZONE DEFINITION ----------------
struct Zone {
  int id;
  int soilPin;
  int pumpPin;
  int moisture;
};

Zone zones[] = {
  {1, 33, 18, 0},
  {2, 34, 5, 0},
};
const int activeZones = sizeof(zones) / sizeof(zones[0]);

// ---------------- GLOBALS ----------------
bool  tankIsLow      = false;
float currentTemp    = 0.0;
float currentHumidity = 0.0;

bool lastPumpState[sizeof(zones) / sizeof(zones[0])] = {};
bool lastFanState  = false;
bool lastLightState = false;

// ---------------- MANUAL OVERRIDE FLAGS ----------------
// Each flag means: "user pressed the physical button, auto-logic is suspended"
// Pressing the button again toggles back to auto mode.
bool pumpManualOverride  = false;
bool fanManualOverride   = false;
bool lightManualOverride = false;

// The manually-commanded state when override is active
bool pumpManualState  = false;
bool fanManualState   = false;
bool lightManualState = false;

// Debounce tracking
unsigned long lastPumpButtonTime  = 0;
unsigned long lastFanButtonTime   = 0;
unsigned long lastLightButtonTime = 0;
const unsigned long DEBOUNCE_MS   = 250;

// Previous raw button readings (for edge detection)
bool lastPumpButtonRaw  = HIGH;
bool lastFanButtonRaw   = HIGH;
bool lastLightButtonRaw = HIGH;

bool alarmActive   = false;
bool buzzerDone    = false;
unsigned long alarmStartTime = 0;

String hardwareID = "";

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
        digitalWrite(BUZZER_PIN, LOW);
        Serial.println("[ALARM] Tank LOW — Buzzer ON (Low Trigger)");
      }

      if (millis() - alarmStartTime >= 3000) {
        digitalWrite(BUZZER_PIN, HIGH);
        buzzerDone  = true;
        alarmActive = false;
        Serial.println("[ALARM] Buzzer OFF (3s elapsed)");
      }
    }
  } else {
    digitalWrite(RED_LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, HIGH);

    if (buzzerDone || alarmActive) {
      Serial.println("[ALARM] Tank OK — Resetting logic");
    }

    alarmActive = false;
    buzzerDone  = false;
  }
}

// ---------------- LIGHT LOGIC (time-based) ----------------
void updateLight() {
  if (lightManualOverride) return;

  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return;

  int  hour             = timeinfo.tm_hour;
  bool lightShouldBeOn  = (hour >= 18 || hour < 6);

  if (lightShouldBeOn != lastLightState) {
    digitalWrite(LIGHT_RELAY,    lightShouldBeOn ? LOW  : HIGH);
    digitalWrite(YELLOW_LED_PIN, lightShouldBeOn ? HIGH : LOW);
    lastLightState = lightShouldBeOn;
  }
}

// ---------------- BUTTON HANDLER TASK ----------------
// Polls all three override buttons. Each button press:
//   • If NOT in manual override  → enter override, force device ON
//   • If already in manual override, device is ON  → turn it OFF (keep override)
//   • If already in manual override, device is OFF → exit override (resume auto)
// Net effect: first press = force ON, second press = force OFF, third press = back to auto.
// You can simplify to a 2-step (toggle override) if preferred.
void buttonHandlerTask(void *pvParameters) {
  for (;;) {
    unsigned long now = millis();

    // ── PUMP BUTTON (GPIO 32) ────────────────────────────────
    bool pumpRaw = digitalRead(BUTTON_PUMP_PIN);
    if (pumpRaw == LOW && lastPumpButtonRaw == HIGH &&
        (now - lastPumpButtonTime) > DEBOUNCE_MS) {
      lastPumpButtonTime = now;

      if (!pumpManualOverride) {
        // Enter override → turn pump ON (zone 1 only; safety: block if tank low)
        if (!tankIsLow) {
          pumpManualOverride = true;
          pumpManualState    = true;
          digitalWrite(zones[0].pumpPin, LOW);
          lastPumpState[0]   = true;
          Serial.println("[BTN] Pump → Manual ON");
        } else {
          Serial.println("[BTN] Pump override blocked (tank low)");
        }
      } else if (pumpManualState) {
        // Override active + ON → turn OFF, stay in override
        pumpManualState  = false;
        digitalWrite(zones[0].pumpPin, HIGH);
        lastPumpState[0] = false;
        Serial.println("[BTN] Pump → Manual OFF");
      } else {
        // Override active + OFF → exit override, resume auto
        pumpManualOverride = false;
        // Force controlLogicTask to re-evaluate by dirtying lastPumpState
        lastPumpState[0] = !lastPumpState[0];
        Serial.println("[BTN] Pump → Auto mode resumed");
      }
    }
    lastPumpButtonRaw = pumpRaw;

    // ── FAN BUTTON (GPIO 21) ─────────────────────────────────
    bool fanRaw = digitalRead(BUTTON_FAN_PIN);
    if (fanRaw == LOW && lastFanButtonRaw == HIGH &&
        (now - lastFanButtonTime) > DEBOUNCE_MS) {
      lastFanButtonTime = now;

      if (!fanManualOverride) {
        fanManualOverride = true;
        fanManualState    = true;
        digitalWrite(FAN_RELAY, LOW);
        lastFanState = true;
        Serial.println("[BTN] Fan → Manual ON");
      } else if (fanManualState) {
        fanManualState = false;
        digitalWrite(FAN_RELAY, HIGH);
        lastFanState   = false;
        Serial.println("[BTN] Fan → Manual OFF");
      } else {
        fanManualOverride = false;
        lastFanState      = !lastFanState;   // dirty flag → auto re-evaluates
        Serial.println("[BTN] Fan → Auto mode resumed");
      }
    }
    lastFanButtonRaw = fanRaw;

    // ── LIGHT BUTTON (GPIO 22) ───────────────────────────────
    bool lightRaw = digitalRead(BUTTON_LIGHT_PIN);
    if (lightRaw == LOW && lastLightButtonRaw == HIGH &&
        (now - lastLightButtonTime) > DEBOUNCE_MS) {
      lastLightButtonTime = now;

      if (!lightManualOverride) {
        lightManualOverride = true;
        lightManualState    = true;
        digitalWrite(LIGHT_RELAY,    LOW);
        digitalWrite(YELLOW_LED_PIN, HIGH);
        lastLightState = true;
        Serial.println("[BTN] Light → Manual ON");
      } else if (lightManualState) {
        lightManualState = false;
        digitalWrite(LIGHT_RELAY,    HIGH);
        digitalWrite(YELLOW_LED_PIN, LOW);
        lastLightState = false;
        Serial.println("[BTN] Light → Manual OFF");
      } else {
        lightManualOverride = false;
        lastLightState      = !lastLightState;   // dirty flag → updateLight() re-evaluates
        Serial.println("[BTN] Light → Auto mode resumed");
      }
    }
    lastLightButtonRaw = lightRaw;

    vTaskDelay(10 / portTICK_PERIOD_MS);   // 10 ms poll — responsive but cheap
  }
}

// ---------------- SENSOR TASK ----------------
void readSensorsTask(void *pvParameters) {
  for (;;) {
    float t = dht.readTemperature();
    float h = dht.readHumidity();

    if (!isnan(t)) currentTemp     = t;
    if (!isnan(h)) currentHumidity = h;

    for (int i = 0; i < activeZones; i++) {
      zones[i].moisture = analogRead(zones[i].soilPin);
    }

    tankIsLow = (digitalRead(WATER_LEVEL_PIN) == LOW);

    Serial.println("========== [SENSOR READINGS] ==========");
    Serial.printf("[DHT]  Temp: %.1f °C  |  Humidity: %.1f %%\n", currentTemp, currentHumidity);

    for (int i = 0; i < activeZones; i++) {
      int m = zones[i].moisture;
      const char* status = (m > DRY_THRESHOLD) ? "DRY" : (m < WET_THRESHOLD) ? "WET" : "OK";
      Serial.printf("[SOIL] Zone %d: %d raw ADC → %s\n", zones[i].id, m, status);
    }

    Serial.printf("[TANK] Water level : %s\n", tankIsLow ? "LOW" : "OK");

    for (int i = 0; i < activeZones; i++) {
      Serial.printf("[PUMP] Zone %d : %s%s\n", zones[i].id,
        digitalRead(zones[i].pumpPin) == LOW ? "ON" : "OFF",
        (i == 0 && pumpManualOverride) ? " [MANUAL]" : "");
    }
    Serial.printf("[FAN]   : %s%s\n",
      digitalRead(FAN_RELAY)   == LOW ? "ON" : "OFF",
      fanManualOverride   ? " [MANUAL]" : "");
    Serial.printf("[LIGHT] : %s%s\n",
      digitalRead(LIGHT_RELAY) == LOW ? "ON" : "OFF",
      lightManualOverride ? " [MANUAL]" : "");

    struct tm timeinfo;
    if (getLocalTime(&timeinfo)) {
      char timeStr[30];
      strftime(timeStr, sizeof(timeStr), "%Y-%m-%d %H:%M:%S", &timeinfo);
      Serial.printf("[TIME]  %s\n", timeStr);
    }
    Serial.println("========================================");

    vTaskDelay(2000 / portTICK_PERIOD_MS);
  }
}

// ---------------- CONTROL LOGIC ----------------
void controlLogicTask(void *pvParameters) {
  for (;;) {
    updateAlarm();
    updateLight();

    // Auto pump — skipped per zone if manual override is active (zone 1 only for now)
    for (int i = 0; i < activeZones; i++) {
      bool isOverridden = (i == 0 && pumpManualOverride);
      if (isOverridden) continue;

      bool pumpShouldBeOn = (zones[i].moisture > DRY_THRESHOLD && !tankIsLow);

      if (pumpShouldBeOn != lastPumpState[i]) {
        digitalWrite(zones[i].pumpPin, pumpShouldBeOn ? LOW : HIGH);
        lastPumpState[i] = pumpShouldBeOn;

        if (pumpShouldBeOn) {
          Serial.printf("[PUMP] Zone %d → ON  (soil dry: %d > %d)\n",
            zones[i].id, zones[i].moisture, DRY_THRESHOLD);
        } else if (tankIsLow) {
          Serial.printf("[PUMP] Zone %d → OFF (tank low)\n", zones[i].id);
        } else {
          Serial.printf("[PUMP] Zone %d → OFF (soil ok: %d)\n",
            zones[i].id, zones[i].moisture);
        }
      }
    }

    // Auto fan — skipped if manual override is active
    if (!fanManualOverride) {
      bool fanShouldBeOn = (currentTemp > 24.0);
      if (fanShouldBeOn != lastFanState) {
        digitalWrite(FAN_RELAY, fanShouldBeOn ? LOW : HIGH);
        lastFanState = fanShouldBeOn;
        Serial.printf("[FAN]  → %s (temp %.1f °C)\n",
          fanShouldBeOn ? "ON" : "OFF", currentTemp);
      }
    }

    vTaskDelay(100 / portTICK_PERIOD_MS);
  }
}

// ---------------- SEND DATA ----------------
void sendDataTask(void *pvParameters) {
  for (;;) {
    if (WiFi.status() == WL_CONNECTED && webSocket.isConnected()) {

      bool lightOn = (digitalRead(LIGHT_RELAY) == LOW);
      bool fanOn   = (digitalRead(FAN_RELAY)   == LOW);

      String tempStr = isnan(currentTemp)     ? "null" : String(currentTemp, 1);
      String humStr  = isnan(currentHumidity) ? "null" : String(currentHumidity, 1);

      for (int i = 0; i < activeZones; i++) {
        bool pumpOn = (digitalRead(zones[i].pumpPin) == LOW);

        String json = "{";
        json += "\"hardware_id\":\"" + hardwareID + "\",";
        json += "\"zone_id\":"       + String(zones[i].id) + ",";
        json += "\"temperature\":"   + tempStr + ",";
        json += "\"humidity\":"      + humStr  + ",";
        json += "\"moisture_1\":"    + String(zones[i].moisture) + ",";
        json += "\"pump\":"          + String(pumpOn     ? "true" : "false") + ",";
        json += "\"fan\":"           + String(fanOn      ? "true" : "false") + ",";
        json += "\"light\":"         + String(lightOn    ? "true" : "false") + ",";
        json += "\"tank_low\":"      + String(tankIsLow  ? "true" : "false");
        json += "}";

        bool sent = webSocket.sendTXT(json);
        Serial.printf("[WS] Zone %d → %s\n", zones[i].id, sent ? "sent" : "FAILED");
      }

    } else {
      Serial.println("[WS] Not connected — skipping send");
    }

    vTaskDelay(6000 / portTICK_PERIOD_MS);
  }
}

// ---------------- WEBSOCKET EVENT ----------------
void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED: {
      Serial.println("[WS] Connected to server — sending discovery");

      String discovery = "{";
      discovery += "\"type\":\"discovery\",";
      discovery += "\"hardware_id\":\"" + hardwareID + "\",";
      discovery += "\"zones\":"         + String(activeZones) + ",";
      discovery += "\"has_dht\":true,";
      discovery += "\"has_moisture\":true,";
      discovery += "\"has_light\":true";
      discovery += "}";

      webSocket.sendTXT(discovery);
      break;
    }

    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected from server");
      break;

    case WStype_TEXT: {
      String msg = String((char*)payload);
      Serial.println("[WS] Received: " + msg);

      if (msg.indexOf("\"type\":\"control\"") >= 0) {
        Serial.println("[CONTROL] Processing control command...");

        String device = "";
        int deviceIdx = msg.indexOf("\"device\":\"");
        if (deviceIdx >= 0) {
          int startIdx = deviceIdx + 10;
          int endIdx   = msg.indexOf("\"", startIdx);
          device = msg.substring(startIdx, endIdx);
        }

        int state = -1;
        int stateIdx = msg.indexOf("\"state\":");
        if (stateIdx >= 0) {
          sscanf(msg.c_str() + stateIdx, "\"state\":%d", &state);
        }

        int zone_id = 0;
        int zoneIdx = msg.indexOf("\"zone_id\":");
        if (zoneIdx >= 0) {
          sscanf(msg.c_str() + zoneIdx, "\"zone_id\":%d", &zone_id);
        }

        Serial.printf("[CONTROL] device=%s, zone_id=%d, state=%d\n",
          device.c_str(), zone_id, state);

        if (device == "pump" && zone_id > 0 && state >= 0) {
          for (int i = 0; i < activeZones; i++) {
            if (zones[i].id == zone_id) {
              bool turnOn = (state == 1);
              if (turnOn && tankIsLow) {
                Serial.printf("├─ [PUMP] Zone %d → ON blocked (tank low)\n", zone_id);
                break;
              }
              // Remote command clears the physical button override for this zone
              if (i == 0) {
                pumpManualOverride = false;
                pumpManualState    = false;
              }
              digitalWrite(zones[i].pumpPin, turnOn ? LOW : HIGH);
              lastPumpState[i] = turnOn;
              Serial.printf("├─ [PUMP] Zone %d → %s (pin %d)\n",
                zone_id, turnOn ? "ON ✓" : "OFF ✓", zones[i].pumpPin);
              break;
            }
          }
        } else if (device == "fan" && state >= 0) {
          bool turnOn = (state == 1);
          // Remote command clears the physical button override
          fanManualOverride = false;
          fanManualState    = false;
          digitalWrite(FAN_RELAY, turnOn ? LOW : HIGH);
          lastFanState = turnOn;
          Serial.printf("├─ [FAN] → %s (pin %d)\n", turnOn ? "ON ✓" : "OFF ✓", FAN_RELAY);
        } else if (device == "light") {
          if (state == -1) {
            lightManualOverride = false;
            lastLightState = !lastLightState;
            Serial.println("├─ [LIGHT] → Auto mode resumed");
          } else if (state >= 0) {
            bool turnOn = (state == 1);
            lightManualOverride = true;
            lightManualState    = turnOn;
            digitalWrite(LIGHT_RELAY,    turnOn ? LOW  : HIGH);
            digitalWrite(YELLOW_LED_PIN, turnOn ? HIGH : LOW);
            Serial.printf("├─ [LIGHT] → %s (pin %d)\n", turnOn ? "ON ✓" : "OFF ✓", LIGHT_RELAY);
          }
        }

        Serial.println("[CONTROL] ✓ Command executed\n");
      }
      break;
    }

    default:
      break;
  }
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);
  Serial.println("\n[BOOT] Starting Smart Farm System...");

  // Output pins
  pinMode(BUZZER_PIN,      OUTPUT);  digitalWrite(BUZZER_PIN,      HIGH);
  pinMode(RED_LED_PIN,     OUTPUT);  digitalWrite(RED_LED_PIN,     LOW);
  pinMode(YELLOW_LED_PIN,  OUTPUT);  digitalWrite(YELLOW_LED_PIN,  LOW);
  pinMode(FAN_RELAY,       OUTPUT);  digitalWrite(FAN_RELAY,       HIGH);
  pinMode(LIGHT_RELAY,     OUTPUT);  digitalWrite(LIGHT_RELAY,     HIGH);

  // Input pins (internal pull-up — wire buttons to GND)
  pinMode(WATER_LEVEL_PIN,  INPUT_PULLUP);
  pinMode(BUTTON_PUMP_PIN,  INPUT_PULLUP);
  pinMode(BUTTON_FAN_PIN,   INPUT_PULLUP);
  pinMode(BUTTON_LIGHT_PIN, INPUT_PULLUP);

  // Zone pump pins — default OFF
  for (int i = 0; i < activeZones; i++) {
    pinMode(zones[i].pumpPin, OUTPUT);
    digitalWrite(zones[i].pumpPin, HIGH);
    Serial.printf("[BOOT] Zone %d pump (pin %d) → OFF\n", zones[i].id, zones[i].pumpPin);
  }

  dht.begin();
  Serial.println("[BOOT] DHT11 initialized");

  // WiFi
  WiFi.mode(WIFI_STA);
  Serial.printf("[BOOT] Connecting to WiFi: %s\n", ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\n[BOOT] WiFi connected — IP: %s\n", WiFi.localIP().toString().c_str());

  hardwareID = WiFi.macAddress();
  Serial.println("[BOOT] Hardware ID: " + hardwareID);

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.println("[BOOT] NTP time sync started");

  Serial.printf("[BOOT] Connecting to WebSocket ws://%s:%d/ws\n", ws_host, ws_port);
  webSocket.begin(ws_host, ws_port, "/ws");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  // FreeRTOS tasks
  xTaskCreate(readSensorsTask,   "Sensors", 8000, NULL, 1, NULL);
  xTaskCreate(controlLogicTask,  "Control", 4000, NULL, 1, NULL);
  xTaskCreate(sendDataTask,      "Sender",  4000, NULL, 1, NULL);
  xTaskCreate(buttonHandlerTask, "Buttons", 2048, NULL, 2, NULL);
  // Priority 2 > 1 so button presses are caught promptly

  Serial.println("[BOOT] All tasks started. System running.\n");
}

void loop() {
  webSocket.loop();
}
