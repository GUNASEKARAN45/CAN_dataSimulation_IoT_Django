// #include <WiFi.h>
// #include <ArduinoWebsockets.h>
// #include <SPI.h>
// #include <mcp_can.h>

// using namespace websockets;

// /* ================= WIFI ================= */
// const char* ssid = "GUNA";
// const char* password = "GUNA2525";

// /* ============== WEBSOCKET SERVER ============== */
// /* ⚠ CHANGE IP IF NEEDED */
// const char* websocket_server = "ws://10.81.44.152:8000/ws/telemetry/";

// WebsocketsClient client;

// /* ================= CAN ================= */
// #define CAN_CS 5
// MCP_CAN CAN(CAN_CS);

// /* ============== VEHICLE STATE ============== */
// String vehicleState = "stopped"; 
// // possible: "running", "stopped", "charging"

// /* ============== TELEMETRY VALUES ============== */
// float speed = 0;
// float battery = 75;
// float motor_temp = 30;
// float battery_temp = 28;
// float total_distance = 0;
// float charging_gained = 0;

// unsigned long lastSend = 0;

// /* ================= WIFI CONNECT ================= */
// void connectWiFi() {
//   WiFi.begin(ssid, password);
//   Serial.print("Connecting WiFi");

//   while (WiFi.status() != WL_CONNECTED) {
//     delay(500);
//     Serial.print(".");
//   }

//   Serial.println("\nWiFi Connected");
//   Serial.println(WiFi.localIP());
// }

// /* ================= WEBSOCKET CONNECT ================= */
// void connectWebSocket() {
//   Serial.println("Connecting WebSocket...");

//   if (client.connect(websocket_server)) {
//     Serial.println("WebSocket Connected!");
//   } else {
//     Serial.println("WebSocket Failed!");
//   }

//   /* ===== LISTEN FOR COMMANDS FROM DJANGO ===== */
//   client.onMessage([](WebsocketsMessage message) {

//     String msg = message.data();
//     Serial.println("Received: " + msg);

//     if (msg.indexOf("start_vehicle") >= 0) {
//       if (vehicleState != "charging") {
//         vehicleState = "running";
//         Serial.println("Vehicle Started");
//       }
//     }

//     else if (msg.indexOf("stop_vehicle") >= 0) {
//       vehicleState = "stopped";
//       speed = 0;
//       Serial.println("Vehicle Stopped");
//     }

//     else if (msg.indexOf("start_charging") >= 0) {
//       if (vehicleState == "stopped") {
//         vehicleState = "charging";
//         charging_gained = 0;
//         Serial.println("Charging Started");
//       }
//     }

//     else if (msg.indexOf("stop_charging") >= 0) {
//       vehicleState = "stopped";
//       Serial.println("Charging Stopped");
//     }
//   });
// }

// /* ================= SETUP ================= */
// void setup() {
//   Serial.begin(115200);

//   connectWiFi();
//   connectWebSocket();

//   // CAN init
//   if (CAN.begin(MCP_ANY, CAN_500KBPS, MCP_8MHZ) == CAN_OK) {
//     Serial.println("CAN Init OK");
//   } else {
//     Serial.println("CAN Init Failed");
//   }

//   CAN.setMode(MCP_NORMAL);
// }

// /* ================= LOOP ================= */
// void loop() {

//   /* 🔁 Reconnect WiFi */
//   if (WiFi.status() != WL_CONNECTED) {
//     connectWiFi();
//   }

//   /* 🔁 Reconnect WebSocket */
//   if (!client.available()) {
//     connectWebSocket();
//   }

//   client.poll();

//   /* ===== SEND DATA EVERY 1 SECOND ===== */
//   if (millis() - lastSend > 1000) {

//     /* ================= RUNNING MODE ================= */
//     if (vehicleState == "running") {

//       speed += random(-2, 5);
//       speed = constrain(speed, 0, 120);

//       battery -= speed * 0.0008;
//       battery = constrain(battery, 0, 100);

//       motor_temp += speed * 0.02;
//       battery_temp += speed * 0.01;

//       total_distance += speed / 3600.0;
//     }

//     /* ================= STOP MODE ================= */
//     else if (vehicleState == "stopped") {

//       speed = 0;

//       motor_temp -= 0.3;
//       battery_temp -= 0.2;

//       motor_temp = constrain(motor_temp, 25, 120);
//       battery_temp = constrain(battery_temp, 25, 80);
//     }

//     /* ================= CHARGING MODE ================= */
//     else if (vehicleState == "charging") {

//       speed = 0;

//       if (battery < 100) {
//         battery += 1;                 // +1% per second
//         charging_gained += 1;
//       }

//       battery = constrain(battery, 0, 100);
//     }

//     /* ===== AUTO STOP IF BATTERY DEAD ===== */
//     if (battery <= 5 && vehicleState == "running") {
//       vehicleState = "stopped";
//       speed = 0;
//       Serial.println("Low Battery - Auto Stop");
//     }

//     /* ================= BUILD JSON ================= */
//     String payload = "{";
//     payload += "\"speed\":" + String(speed,1) + ",";
//     payload += "\"rpm\":" + String(speed * 55,0) + ",";
//     payload += "\"battery\":" + String(battery,1) + ",";
//     payload += "\"motor_temp\":" + String(motor_temp,1) + ",";
//     payload += "\"battery_temp\":" + String(battery_temp,1) + ",";
//     payload += "\"status\":\"" + vehicleState + "\",";
//     payload += "\"faults\":[],";
//     payload += "\"total_distance\":" + String(total_distance,1) + ",";
//     payload += "\"estimated_remaining_km\":" + String(battery * 3,1) + ",";
//     payload += "\"charging_gained_percent\":" + String(charging_gained,1);
//     payload += "}";

//     /* ===== SEND TO DJANGO ===== */
//     if (client.available()) {
//       client.send(payload);
//       Serial.println("Sent: " + payload);
//     }

//     lastSend = millis();
//   }
// }