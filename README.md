# Project Testing (ESP32 + Three.js)

## Prerequisites
- Node.js 18+ (includes npm)
- ESP32 on the same Wi‑Fi network as your PC
- ESP32 firmware with WebSocket on port 81 and HTTP server on port 80 (see `webSocketEvent` handler for ON/OFF messages)

## Install dependencies
```bash
npm install
```

## Run the app (dev server)
```bash
npm run dev
```
Then open the printed local URL (e.g., http://127.0.0.1:5173).

## Build for production
```bash
npm run build
```
Outputs to `dist/`.

## Serve the production build locally (preview)
```bash
npm run preview
```

## Frontend notes
- The app uses Vite, Three.js, and Sass.
- Light toggle messages are sent over WebSocket (port 81) to the ESP32 as `ON` or `OFF`.
- The UI reflects state updates when the ESP32 broadcasts `ON`/`OFF` messages.

## ESP32 expectations
- WebSocket server running on port 81.
- Handles text messages `ON` and `OFF` to control the LED.
- Broadcasts `ON`/`OFF` to all clients when the state changes (button or web).
- Example handler snippet:
  ```cpp
  void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
    if (type == WStype_CONNECTED) {
      webSocket.sendTXT(num, led_state ? "ON" : "OFF");
    } else if (type == WStype_TEXT) {
      String msg = String((char*)payload);
      if (msg == "ON") { led_state = true; digitalWrite(LED_PIN, HIGH); webSocket.broadcastTXT("ON"); }
      else if (msg == "OFF") { led_state = false; digitalWrite(LED_PIN, LOW); webSocket.broadcastTXT("OFF"); }
    }
  }
  ```
