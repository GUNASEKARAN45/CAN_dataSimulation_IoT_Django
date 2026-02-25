// #include <WiFi.h>
// #include <ArduinoWebsockets.h>
// #include <SPI.h>
// #include <mcp_can.h>
// #include <ArduinoJson.h>
// using namespace websockets;

// const char* ssid = "GUNA";
// const char* password = "GUNA2525";
// const char* websocket_server = "ws://10.81.44.152:8000/ws/telemetry/";

// WebsocketsClient client;
// #define CAN_CS 5
// MCP_CAN CAN(CAN_CS);

// String vehicleState = "stopped";
// float speed = 0;
// float battery = 75;
// float motor_temp = 30;
// float battery_temp = 28;
// float total_distance = 0.0;
// float highest_known_distance = 0.0;     // ← Key: remembers the highest value ever seen
// float charging_gained = 0;
// float throttle = 0;
// float brakeForce = 0;
// bool chargingSessionActive = false;
// unsigned long lastSend = 0;
// unsigned long lastCoolingTime = 0;
// bool hasValidRestore = false;           // ← Prevents sending until we have good data

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

// void requestLatestData() {
//   if (client.available()) {
//     client.send("{\"command\":\"get_latest\"}");
//     Serial.println("Requested latest data from server");
//   }
// }

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
//     if (error) {
//       Serial.println("JSON parse error: " + String(error.c_str()));
//       return;
//     }

//     if (doc["restore"] == true) {
//       float restored = doc["total_distance"] | 0.0f;
//       if (restored > highest_known_distance) {
//         highest_known_distance = restored;
//       }
//       total_distance = highest_known_distance;
//       hasValidRestore = true;

//       battery = doc["battery"];
//       motor_temp = doc["motor_temp"];
//       battery_temp = doc["battery_temp"];
//       charging_gained = doc["charging_gained_percent"];
//       vehicleState = doc["status"].as<String>();

//       Serial.printf("Restored state → total_distance: %.2f km (highest known: %.2f)\n",
//                     total_distance, highest_known_distance);
//       return;
//     }

//     if (doc.containsKey("command")) {
//       String cmd = doc["command"].as<String>();
//       if (cmd == "start_vehicle") {
//         if (vehicleState != "charging") vehicleState = "running";
//       }
//       else if (cmd == "stop_vehicle") {
//         vehicleState = "stopped";
//         speed = 0;
//       }
//       else if (cmd == "start_charging") {
//         if (vehicleState == "stopped") {
//           vehicleState = "charging";
//           charging_gained = 0;
//           chargingSessionActive = true;
//         }
//       }
//       else if (cmd == "stop_charging") {
//         vehicleState = "stopped";
//         chargingSessionActive = false;
//       }
//     }
//   });
// }

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

// void loop() {
//   if (WiFi.status() != WL_CONNECTED) {
//     connectWiFi();
//   }

//   if (!client.available()) {
//     connectWebSocket();
//   }

//   client.poll();

//   if (millis() - lastSend >= 1000) {
//     float dt = (millis() - lastSend) / 1000.0f;
//     lastSend = millis();

//     // Critical protection: do NOT send data until we have a valid restore
//     if (!hasValidRestore) {
//       if (millis() > 15000) {  // After 15 seconds → keep asking
//         requestLatestData();
//         Serial.println("No valid restore yet after 15s → retrying request");
//       }
//       delay(100);  // small delay to avoid spamming
//       return;
//     }

//     if (vehicleState == "running") {
//       throttle = random(30, 100) / 100.0f;
//       bool suddenBrake = random(0, 100) < 15;
//       if (suddenBrake && speed > 25) {
//         brakeForce = random(60, 100) / 100.0f;
//       } else {
//         brakeForce = 0;
//       }

//       float maxAccel = 3.5f;
//       float maxBrake = 10.0f;
//       float drag = 0.03f * speed;
//       float acceleration = (throttle * maxAccel) - (brakeForce * maxBrake) - drag;

//       speed += acceleration * dt * 3.6f;
//       speed = constrain(speed, 0, 140);

//       float distance = (speed / 3600.0f) * dt;
//       total_distance += distance;

//       // Protect the highest value ever
//       if (total_distance > highest_known_distance) {
//         highest_known_distance = total_distance;
//       }

//       float battery_drain = distance / 3.0f;
//       battery -= battery_drain;
//       battery = constrain(battery, 0, 100);

//       motor_temp += distance / 2.0f;
//       battery_temp += distance / 4.0f;
//       motor_temp = constrain(motor_temp, 0, 120);
//       battery_temp = constrain(battery_temp, 0, 80);

//       if (battery <= 0) {
//         vehicleState = "stopped";
//         speed = 0;
//       }
//     }
//     else if (vehicleState == "stopped") {
//       speed = 0;
//       if (millis() - lastCoolingTime >= 15000) {
//         motor_temp -= 1.0f;
//         battery_temp -= 1.0f;
//         motor_temp = constrain(motor_temp, 0, 120);
//         battery_temp = constrain(battery_temp, 0, 80);
//         lastCoolingTime = millis();
//       }
//     }
//     else if (vehicleState == "charging") {
//       speed = 0;
//       if (battery < 100 && chargingSessionActive) {
//         float chargeRate = 0.1f * dt;
//         battery += chargeRate;
//         charging_gained += chargeRate;
//       }
//       battery = constrain(battery, 0, 100);
//       battery_temp += 0.03f * dt;

//       if (millis() - lastCoolingTime >= 15000) {
//         motor_temp -= 1.0f;
//         battery_temp -= 1.0f;
//         motor_temp = constrain(motor_temp, 0, 120);
//         battery_temp = constrain(battery_temp, 0, 80);
//         lastCoolingTime = millis();
//       }

//       if (battery >= 100) {
//         vehicleState = "stopped";
//       }
//     }

//     String faults = "[";
//     bool hasFault = false;
//     if (speed > 120) { faults += "\"OVERSPEED\""; hasFault = true; }
//     if (motor_temp > 100) {
//       if (hasFault) faults += ",";
//       faults += "\"HIGH_MOTOR_TEMP\""; hasFault = true;
//     }
//     if (battery_temp > 60) {
//       if (hasFault) faults += ",";
//       faults += "\"HIGH_BATTERY_TEMP\""; hasFault = true;
//     }
//     if (battery < 10) {
//       if (hasFault) faults += ",";
//       faults += "\"LOW_BATTERY\""; hasFault = true;
//     }
//     faults += "]";

//     float rpm = speed * 55;

//     float charging_gained_to_send = (vehicleState == "charging") ? charging_gained : 0.0f;

//     StaticJsonDocument<512> payloadDoc;
//     payloadDoc["speed"] = round(speed * 10) / 10.0;
//     payloadDoc["rpm"] = round(rpm);
//     payloadDoc["battery"] = round(battery * 10) / 10.0;
//     payloadDoc["motor_temp"] = round(motor_temp * 10) / 10.0;
//     payloadDoc["battery_temp"] = round(battery_temp * 10) / 10.0;
//     payloadDoc["status"] = vehicleState;
//     payloadDoc["faults"] = faults;
//     payloadDoc["total_distance"] = round(highest_known_distance * 100) / 100.0;
//     payloadDoc["estimated_remaining_km"] = round(battery * 3 * 10) / 10.0;
//     payloadDoc["charging_gained_percent"] = round(charging_gained_to_send * 100) / 100.0;

//     String payload;
//     serializeJson(payloadDoc, payload);

//     if (client.available()) {
//       client.send(payload);
//       Serial.println("Sent: " + payload);
//     }
//   }
// }