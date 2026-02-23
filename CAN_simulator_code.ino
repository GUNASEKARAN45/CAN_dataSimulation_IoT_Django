// #include <WiFi.h>
// #include <ArduinoWebsockets.h>
// #include <SPI.h>
// #include <mcp_can.h>
// #include <ArduinoJson.h>

// using namespace websockets;

// /* ================= WIFI ================= */
// const char* ssid = "GUNA";
// const char* password = "GUNA2525";

// /* ================= WEBSOCKET ================= */
// const char* websocket_server = "ws://10.81.44.152:8000/ws/telemetry/";
// WebsocketsClient client;

// /* ================= CAN ================= */
// #define CAN_CS 5
// MCP_CAN CAN(CAN_CS);

// /* ================= VEHICLE STATE ================= */
// String vehicleState = "stopped";

// /* ================= TELEMETRY VALUES ================= */
// float speed = 0;
// float battery = 75;
// float motor_temp = 30;
// float battery_temp = 28;
// float total_distance = 0;
// float charging_gained = 0;

// float throttle = 0;
// float brakeForce = 0;

// unsigned long lastSend = 0;
// unsigned long lastCoolingTime = 0;

// /* ================= WIFI ================= */
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

// /* ================= RESTORE FROM SERVER ================= */
// void requestLatestData() {
//   if (client.available()) {
//     client.send("{\"command\":\"get_latest\"}");
//     Serial.println("Requested latest data from server");
//   }
// }

// /* ================= WEBSOCKET ================= */
// void connectWebSocket() {
//   Serial.println("Connecting WebSocket...");

//   if (client.connect(websocket_server)) {
//     Serial.println("WebSocket Connected!");
//     requestLatestData();
//   } else {
//     Serial.println("WebSocket Failed!");
//   }

//   client.onMessage([](WebsocketsMessage message) {

//     String msg = message.data();
//     Serial.println("Received: " + msg);

//     StaticJsonDocument<1024> doc;
//     DeserializationError error = deserializeJson(doc, msg);
//     if (error) return;

//     /* ===== RESTORE ===== */
//     if (doc["restore"] == true) {

//       speed = doc["speed"];
//       battery = doc["battery"];
//       motor_temp = doc["motor_temp"];
//       battery_temp = doc["battery_temp"];
//       total_distance = doc["total_distance"];
//       charging_gained = doc["charging_gained_percent"];
//       vehicleState = doc["status"].as<String>();

//       Serial.println("Restored state from database");
//       return;
//     }

//     /* ===== COMMANDS ===== */
//     if (doc.containsKey("command")) {

//       String cmd = doc["command"].as<String>();

//       if (cmd == "start_vehicle") {
//         if (vehicleState != "charging") {
//           vehicleState = "running";
//         }
//       }

//       else if (cmd == "stop_vehicle") {
//         vehicleState = "stopped";
//         speed = 0;
//       }

//       else if (cmd == "start_charging") {
//         if (vehicleState == "stopped") {
//           vehicleState = "charging";
//           charging_gained = 0;
//         }
//       }

//       else if (cmd == "stop_charging") {
//         vehicleState = "stopped";
//       }
//     }
//   });
// }

// /* ================= SETUP ================= */
// void setup() {
//   Serial.begin(115200);

//   connectWiFi();
//   connectWebSocket();

//   if (CAN.begin(MCP_ANY, CAN_500KBPS, MCP_8MHZ) == CAN_OK) {
//     Serial.println("CAN Init OK");
//   } else {
//     Serial.println("CAN Init Failed");
//   }

//   CAN.setMode(MCP_NORMAL);

//   lastSend = millis();
//   lastCoolingTime = millis();
// }

// /* ================= LOOP ================= */
// void loop() {

//   if (WiFi.status() != WL_CONNECTED) {
//     connectWiFi();
//   }

//   if (!client.available()) {
//     connectWebSocket();
//   }

//   client.poll();

//   if (millis() - lastSend >= 1000) {

//     float dt = (millis() - lastSend) / 1000.0;
//     lastSend = millis();

//     /* ================= RUNNING MODE ================= */
//     if (vehicleState == "running") {

//       throttle = random(30, 100) / 100.0;
//       bool suddenBrake = random(0, 100) < 15;

//       if (suddenBrake && speed > 25) {
//         brakeForce = random(60, 100) / 100.0;
//       } else {
//         brakeForce = 0;
//       }

//       float maxAccel = 3.5;
//       float maxBrake = 10.0;
//       float drag = 0.03 * speed;

//       float acceleration = (throttle * maxAccel)
//                            - (brakeForce * maxBrake)
//                            - drag;

//       speed += acceleration * dt * 3.6;
//       speed = constrain(speed, 0, 140);

//       // Distance travelled in this second
//       float distance = (speed / 3600.0) * dt;
//       total_distance += distance;

//       // Battery drain
//       float battery_drain = distance / 3.0;
//       battery -= battery_drain;
//       battery = constrain(battery, 0, 100);

//       /* ===== TEMPERATURE INCREASE ===== */

//       // Motor: 1°C per 2 km
//       motor_temp += distance / 2.0;

//       // Battery: 1°C per 4 km
//       battery_temp += distance / 4.0;

//       motor_temp = constrain(motor_temp, 0, 120);
//       battery_temp = constrain(battery_temp, 0, 80);

//       if (battery <= 0) {
//         vehicleState = "stopped";
//         speed = 0;
//       }
//     }

//     /* ================= STOPPED MODE ================= */
//     else if (vehicleState == "stopped") {

//       speed = 0;

//       if (millis() - lastCoolingTime >= 15000) {
//         motor_temp -= 1.0;
//         battery_temp -= 1.0;

//         motor_temp = constrain(motor_temp, 0, 120);
//         battery_temp = constrain(battery_temp, 0, 80);

//         lastCoolingTime = millis();
//       }
//     }

//     /* ================= CHARGING MODE ================= */
//     else if (vehicleState == "charging") {

//       speed = 0;

//       if (battery < 100) {
//         float chargeRate = 0.1 * dt;
//         battery += chargeRate;
//         charging_gained += chargeRate;
//       }

//       battery = constrain(battery, 0, 100);

//       // slight heating while charging
//       battery_temp += 0.03 * dt;

//       if (millis() - lastCoolingTime >= 15000) {
//         motor_temp -= 1.0;
//         battery_temp -= 1.0;

//         motor_temp = constrain(motor_temp, 0, 120);
//         battery_temp = constrain(battery_temp, 0, 80);

//         lastCoolingTime = millis();
//       }

//       if (battery >= 100) {
//         vehicleState = "stopped";
//       }
//     }

//     /* ================= Fault signals ================= */

//     String faults = "[";
//     bool hasFault = false;

//     if (speed > 120) {
//       faults += "\"OVERSPEED\"";
//       hasFault = true;
//     }

//     if (motor_temp > 100) {
//       if (hasFault) faults += ",";
//       faults += "\"HIGH_MOTOR_TEMP\"";
//       hasFault = true;
//     }

//     if (battery_temp > 60) {
//       if (hasFault) faults += ",";
//       faults += "\"HIGH_BATTERY_TEMP\"";
//       hasFault = true;
//     }

//     if (battery < 10) {
//       if (hasFault) faults += ",";
//       faults += "\"LOW_BATTERY\"";
//       hasFault = true;
//     }

//     faults += "]";

//     /* ================= SEND PAYLOAD ================= */

//     float rpm = speed * 55;
    

//     String payload = "{";
//     payload += "\"speed\":" + String(speed, 1) + ",";
//     payload += "\"rpm\":" + String(rpm, 0) + ",";
//     payload += "\"battery\":" + String(battery, 1) + ",";
//     payload += "\"motor_temp\":" + String(motor_temp, 1) + ",";
//     payload += "\"battery_temp\":" + String(battery_temp, 1) + ",";
//     payload += "\"status\":\"" + vehicleState + "\",";
//     payload += "\"faults\":" + faults + ",";
//     payload += "\"total_distance\":" + String(total_distance, 2) + ",";
//     payload += "\"estimated_remaining_km\":" + String(battery * 3, 1) + ",";
//     payload += "\"charging_gained_percent\":" + String(charging_gained, 2);
//     payload += "}";

//     if (client.available()) {
//       client.send(payload);
//       Serial.println("Sent: " + payload);
//     }
//   }
// }
