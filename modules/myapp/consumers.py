import json
from datetime import datetime
from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from .state import SIMULATOR_STATE, state_lock
from .models import EventLog, TelemetryData


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
            command = data.get("command")

            if command == "get_latest":
                # Send the most recent persisted row from database
                latest = await sync_to_async(
                    lambda: TelemetryData.objects.order_by('-timestamp').first()
                )()
                if latest:
                    payload = {
                        "speed": float(latest.speed),
                        "rpm": int(latest.rpm),
                        "battery": float(latest.battery),
                        "motor_temp": float(latest.motor_temp),
                        "battery_temp": float(latest.battery_temp),
                        "status": latest.status,
                        "faults": latest.faults,
                        "total_distance": float(latest.total_distance),
                        "estimated_remaining_km": float(latest.estimated_remaining_km),
                        "start_time": latest.start_time.isoformat() if latest.start_time else None,
                        "charging_start": latest.charging_start.isoformat() if latest.charging_start else None,
                        "charging_end": latest.charging_end.isoformat() if latest.charging_end else None,
                        "charging_gained_percent": float(latest.charging_gained_percent),
                        "timestamp": latest.timestamp.isoformat(),
                        "source": "database"  # helps debug
                    }
                    await self.send(text_data=json.dumps(payload))
                else:
                    await self.send(text_data=json.dumps({"status": "no_data_in_db"}))
                return

            with state_lock:
                if command == "start_charging":
                    if SIMULATOR_STATE["vehicle_started"]:
                        return
                    SIMULATOR_STATE["is_charging_mode"] = True
                    SIMULATOR_STATE["vehicle_started"] = False
                    SIMULATOR_STATE["charging_start"] = datetime.now()
                    SIMULATOR_STATE["charging_end"] = None
                    SIMULATOR_STATE["charging_gained_percent"] = 0.0

                elif command == "stop_charging":
                    SIMULATOR_STATE["is_charging_mode"] = False
                    SIMULATOR_STATE["charging_end"] = datetime.now()

                elif command == "start_vehicle":
                    if SIMULATOR_STATE["is_charging_mode"]:
                        SIMULATOR_STATE["is_charging_mode"] = False
                        SIMULATOR_STATE["charging_end"] = datetime.now()
                    SIMULATOR_STATE["vehicle_started"] = True
                    if SIMULATOR_STATE["start_time"] is None:
                        SIMULATOR_STATE["start_time"] = datetime.now()

                elif command == "stop_vehicle":
                    SIMULATOR_STATE["vehicle_started"] = False

            # Log events
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
                "telemetry_group",
                {"type": "send_telemetry", "data": {"status": "updated"}},
            )

        except Exception as e:
            print("WebSocket error:", e)