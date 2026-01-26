#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>

#define BUTTON_PIN  18
#define LED_PIN     21

const char* ssid = "9425_KMITL_2.4G";
const char* password = "93388798";

WebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81);

bool led_state = false;
int button_state = HIGH;
int last_button_state = HIGH;

// 🔹 Web page
String webpage() {
  return R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <title>ESP32 LED Sync</title>
  <style>
    body { font-family: Arial; text-align: center; margin-top: 60px; }
    .led {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      margin: 20px auto;
      background: #444;
    }
    .on { background: red; box-shadow: 0 0 20px red; }
    button { padding: 15px 30px; font-size: 18px; }
  </style>
</head>
<body>

<h1>ESP32 LED Control</h1>
<div id="led" class="led"></div>
<p id="status">OFF</p>

<button onclick="toggle()">Toggle LED</button>

<script>
  const socket = new WebSocket(`ws://${location.hostname}:81`);

  socket.onmessage = (event) => {
    const led = document.getElementById("led");
    const status = document.getElementById("status");

    if (event.data === "ON") {
      led.classList.add("on");
      status.innerText = "ON";
    } else {
      led.classList.remove("on");
      status.innerText = "OFF";
    }
  };

  function toggle() {
    fetch('/toggle');
  }
</script>

</body>
</html>
)rawliteral";
}

// 🔹 HTTP routes
void handleRoot() {
  server.send(200, "text/html", webpage());
}

void handleToggle() {
  led_state = !led_state;
  digitalWrite(LED_PIN, led_state);
  webSocket.broadcastTXT(led_state ? "ON" : "OFF");
  server.send(200, "text/plain", "OK");
}

// 🔹 WebSocket events
// 🔹 WebSocket events
void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  if (type == WStype_CONNECTED) {
    webSocket.sendTXT(num, led_state ? "ON" : "OFF");
  }
  else if (type == WStype_TEXT) {
    String message = String((char*)payload);
    Serial.println("Received: " + message);
    
    if (message == "ON") {
      led_state = true;
      digitalWrite(LED_PIN, HIGH);
      Serial.println("LED turned ON from web");
    } 
    else if (message == "OFF") {
      led_state = false;
      digitalWrite(LED_PIN, LOW);
      Serial.println("LED turned OFF from web");
    }
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }

  server.on("/", handleRoot);
  server.on("/toggle", handleToggle);
  server.begin();

  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
}

void loop() {
  server.handleClient();
  webSocket.loop();

  // 🔹 Physical button logic
  button_state = digitalRead(BUTTON_PIN);

  if (last_button_state == HIGH && button_state == LOW) {
    led_state = !led_state;
    digitalWrite(LED_PIN, led_state);
    webSocket.broadcastTXT(led_state ? "ON" : "OFF");
    delay(200);
  }

  last_button_state = button_state;
}
