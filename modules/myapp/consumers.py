import json
from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from .models import TelemetryData, EventLog


class TelemetryConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "telemetry_group"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def send_telemetry(self, event):
        await self.send(text_data=json.dumps(event["data"]))

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)

            # ===============================
            # ✅ CASE 1: ESP32 sending telemetry
            # ===============================
            if "speed" in data:
                await sync_to_async(TelemetryData.objects.create)(**data)

                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "send_telemetry",
                        "data": data
                    }
                )
                return

            # ===============================
            # ✅ CASE 2: React sending command
            # ===============================
            command = data.get("command")

            event_map = {
                "start_vehicle": "vehicle_start",
                "stop_vehicle": "vehicle_stop",
                "start_charging": "charging_start",
                "stop_charging": "charging_stop",
            }

            if command in event_map:
                await sync_to_async(EventLog.objects.create)(
                    event_type=event_map[command],
                    details={"command": command}
                )

                # Send command back to ESP32
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "send_telemetry",
                        "data": {"command": command}
                    }
                )

        except Exception as e:
            print("WebSocket error:", e)