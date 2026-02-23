#include <WiFi.h>
#include <ArduinoWebsockets.h>
#include <SPI.h>
#include <mcp_can.h>

using namespace websockets;

const char* ssid = "GUNA";
const char* password = "GUNA2525";


const char* websocket_server = "ws://10.81.44.152:8000/ws/telemetry/";

WebsocketsClient client;

// MCP2515
#define CAN_CS 5
MCP_CAN CAN(CAN_CS);

float speed = 0;
float battery = 75;
float motor_temp = 30;
float battery_temp = 28;
float total_distance = 0;

unsigned long lastSend = 0;

void connectWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected");
  Serial.println(WiFi.localIP());
}

void connectWebSocket() {
  Serial.println("Connecting WebSocket...");

  if (client.connect(websocket_server)) {
    Serial.println("WebSocket Connected!");
  } else {
    Serial.println("WebSocket Failed!");
  }
}

void setup() {
  Serial.begin(115200);

  connectWiFi();
  connectWebSocket();

  // CAN init
  if (CAN.begin(MCP_ANY, CAN_500KBPS, MCP_8MHZ) == CAN_OK) {
    Serial.println("CAN Init OK");
  } else {
    Serial.println("CAN Init Failed");
  }

  CAN.setMode(MCP_NORMAL);
}

void loop() {

  // 🔁 Reconnect WiFi if disconnected
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // 🔁 Reconnect WebSocket if disconnected
  if (!client.available()) {
    connectWebSocket();
  }

  // REQUIRED for ArduinoWebsockets
  client.poll();

  // Send every 1 second
  if (millis() - lastSend > 1000) {

    // Fake telemetry
    speed += random(-2, 4);
    speed = constrain(speed, 0, 100);

    battery -= speed * 0.0005;
    battery = constrain(battery, 0, 100);

    motor_temp += speed * 0.01;
    battery_temp += speed * 0.005;

    total_distance += speed / 3600.0;

    String status = speed > 0 ? "running" : "stopped";

    String payload = "{";
    payload += "\"speed\":" + String(speed,1) + ",";
    payload += "\"rpm\":" + String(speed*55,0) + ",";
    payload += "\"battery\":" + String(battery,1) + ",";
    payload += "\"motor_temp\":" + String(motor_temp,1) + ",";
    payload += "\"battery_temp\":" + String(battery_temp,1) + ",";
    payload += "\"status\":\"" + status + "\",";
    payload += "\"faults\":[],";
    payload += "\"total_distance\":" + String(total_distance,1) + ",";
    payload += "\"estimated_remaining_km\":" + String(battery*3,1) + ",";
    payload += "\"charging_gained_percent\":0";
    payload += "}";

    if (client.available()) {
      client.send(payload);
      Serial.println("Sent: " + payload);
    }

    lastSend = millis();
  }
}