import json
import time
from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from .models import TelemetryData, EventLog


class TelemetryConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.group_name = "telemetry_group"
        self.last_saved_time = 0
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def send_telemetry(self, event):
        await self.send(text_data=json.dumps(event["data"]))

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)

           
            if data.get("command") == "get_latest":
                last = await sync_to_async(
                    TelemetryData.objects.order_by("-timestamp").first
                )()

                if last:
                    await self.send(text_data=json.dumps({
                        "restore": True,
                        "speed": last.speed,
                        "rpm": last.rpm,
                        "battery": last.battery,
                        "motor_temp": last.motor_temp,
                        "battery_temp": last.battery_temp,
                        "status": last.status,
                        "faults": last.faults,
                        "total_distance": last.total_distance,
                        "estimated_remaining_km": last.estimated_remaining_km,
                        "charging_gained_percent": last.charging_gained_percent,
                    }))
                else:
                    await self.send(text_data=json.dumps({
                        "message": "no_data"
                    }))
                return


            if "speed" in data:

                current_time = time.time()

                if current_time - self.last_saved_time >= 6:
                    await sync_to_async(TelemetryData.objects.create)(**data)
                    self.last_saved_time = current_time

                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "send_telemetry",
                        "data": data
                    }
                )
                return


            
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

                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "send_telemetry",
                        "data": {"command": command}
                    }
                )

        except Exception as e:
            print("WebSocket error:", e)