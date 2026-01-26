# ESP32 Setup Guide

## 🔧 Hardware Setup

1. **Connect LED to ESP32:**
   - LED Positive (longer leg) → GPIO 21
   - LED Negative → 220Ω Resistor → GND

2. **Connect Button to ESP32:**
   - One side of button → GPIO 18
   - Other side of button → GND

## 📡 Find Your ESP32 IP Address

1. Upload your Arduino code to ESP32
2. Open Serial Monitor (115200 baud)
3. Wait for ESP32 to connect to WiFi
4. Look for the IP address (e.g., `192.168.1.100`)

## ⚙️ Update Three.js Configuration

In `src/main.js`, update line 35:

```javascript
const ESP32_IP = '192.168.1.100' // Replace with your ESP32's actual IP
```

## 🚀 How It Works

### Communication Flow:
```
Three.js App ←→ ESP32
    │              │
    ├─ HTTP ───────┤ /toggle (Send command)
    │              │
    └─ WebSocket ──┤ Port 81 (Receive updates)
```

### Features:
✅ Click 3D switch → Sends HTTP request to `/toggle` → ESP32 toggles LED
✅ Press physical button → ESP32 broadcasts via WebSocket → 3D bulb updates
✅ Real-time sync between 3D model and physical LED

## 🧪 Testing

1. **Test from Three.js:**
   - Click the 3D light switch
   - Physical LED should turn ON/OFF
   - Console shows: `📡 Toggle sent to ESP32: OK`

2. **Test from Physical Button:**
   - Press the physical button on ESP32
   - 3D bulb should turn ON/OFF
   - Console shows: `📩 Message from ESP32: ON` (or OFF)

## 🐛 Troubleshooting

### Can't connect to ESP32:
- ✅ Check ESP32 is powered and connected to WiFi
- ✅ Verify IP address in `main.js` matches Serial Monitor
- ✅ Make sure you're on the same WiFi network
- ✅ Try accessing `http://[ESP32_IP]` in browser

### CORS Error:
If you see CORS errors, you may need to add this to your ESP32 code in `handleToggle()`:
```cpp
server.sendHeader("Access-Control-Allow-Origin", "*");
```

### WebSocket not connecting:
- Check port 81 is not blocked by firewall
- Verify WebSocket server started (check Serial Monitor)

## 📝 Network Information

**WiFi SSID:** `9425_KMITL_2.4G`
**ESP32 Web Server:** Port 80 (HTTP)
**ESP32 WebSocket:** Port 81

## 🎯 Next Steps

- Test clicking the 3D switch
- Test pressing the physical button
- Check browser console for connection status
- Enjoy synchronized LED control! 🎉
