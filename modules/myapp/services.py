# modules/myapp/simulator.py   ← FULL COPY-PASTE THIS FILE
import random
import asyncio
import time
from datetime import datetime
from asgiref.sync import sync_to_async
from channels.layers import get_channel_layer
from .models import TelemetryData
from .state import SIMULATOR_STATE, state_lock


class TelemetrySimulator:
    def __init__(self):
        # Load latest values from DB so dashboard shows real last state
        try:
            latest = TelemetryData.objects.latest('timestamp')
            self.speed = float(latest.speed)
            self.rpm = int(latest.rpm)
            self.battery = float(latest.battery)
            self.motor_temp = float(latest.motor_temp)
            self.battery_temp = float(latest.battery_temp)
            self.status = latest.status
            self.faults = latest.faults
            self.estimated_remaining_km = float(latest.estimated_remaining_km)
            self.is_charging = latest.status == "charging"

            with state_lock:
                SIMULATOR_STATE["total_distance"] = float(latest.total_distance)
                SIMULATOR_STATE["start_time"] = latest.start_time
                SIMULATOR_STATE["charging_start"] = latest.charging_start
                SIMULATOR_STATE["charging_end"] = latest.charging_end
                SIMULATOR_STATE["charging_gained_percent"] = float(latest.charging_gained_percent)
                SIMULATOR_STATE["vehicle_started"] = latest.status in ["running", "fault"]
                SIMULATOR_STATE["is_charging_mode"] = latest.status == "charging"

        except TelemetryData.DoesNotExist:
            self.speed = 0.0
            self.rpm = 0
            self.battery = 75.0
            self.motor_temp = 32.0
            self.battery_temp = 28.0
            self.status = "stopped"
            self.faults = []
            self.is_charging = False
            self.estimated_remaining_km = round(self.battery * 3, 1)

        self.trip_phase = "idle"
        self.last_time = time.time()

    def _force_stop_if_needed(self):
        with state_lock:
            if not SIMULATOR_STATE["vehicle_started"] and self.speed > 0:
                self.speed = 0.0
                self.rpm = 0
                self.trip_phase = "stopped"

    def _update_charging(self, current_time, delta_real_time):
        if self.is_charging and self.speed == 0:
            charge_rate_per_sec = 0.1
            self.battery += charge_rate_per_sec * delta_real_time

            if self.battery >= 100:
                self.battery = 100.0
                with state_lock:
                    SIMULATOR_STATE["is_charging_mode"] = False
                    SIMULATOR_STATE["charging_end"] = current_time

            with state_lock:
                if SIMULATOR_STATE["charging_start"]:
                    elapsed_sec = (current_time - SIMULATOR_STATE["charging_start"]).total_seconds()
                    SIMULATOR_STATE["charging_gained_percent"] = min(100.0, elapsed_sec * charge_rate_per_sec)

    def _update_battery_and_distance(self, delta_real_time):
        distance_delta = (self.speed / 3600.0) * delta_real_time
        with state_lock:
            SIMULATOR_STATE["total_distance"] += distance_delta

        if self.speed > 0 and not self.is_charging:
            drain = distance_delta / 3.0
            self.battery -= drain

        self.battery = max(0, min(100, self.battery))
        self.estimated_remaining_km = round(self.battery * 3, 1)

    def _update_temperatures(self, delta_real_time):
        motor_heat = (self.speed / 100) * 0.03 if self.speed > 0 else -0.015
        self.motor_temp += motor_heat * delta_real_time
        self.motor_temp = max(28, min(95, self.motor_temp))

        batt_heat = 0.01 if self.is_charging else (self.speed / 100) * 0.015
        self.battery_temp += batt_heat * delta_real_time
        self.battery_temp = max(22, min(60, self.battery_temp))

    def _format_datetime(self, dt):
        return dt.isoformat() if dt is not None else None

    async def generate_data(self):
        current_time = datetime.now()
        delta_real_time = time.time() - self.last_time
        self.last_time = time.time()

        self._force_stop_if_needed()

        with state_lock:
            if SIMULATOR_STATE["is_charging_mode"]:
                self.is_charging = True
                if SIMULATOR_STATE["charging_start"] is None:
                    SIMULATOR_STATE["charging_start"] = current_time
            else:
                if self.is_charging:
                    SIMULATOR_STATE["charging_end"] = current_time
                    self.is_charging = False

        if SIMULATOR_STATE["vehicle_started"] and self.speed == 0 and not self.is_charging:
            if self.trip_phase in ["idle", "stopped"]:
                self.trip_phase = "accelerating"

        if self.trip_phase == "accelerating":
            self.speed += random.uniform(1, 4)
            if self.speed > 50:
                self.trip_phase = "cruising"
        elif self.trip_phase == "cruising":
            self.speed += random.uniform(-1, 1)

        self.speed = max(0, min(self.speed, 100))
        self.rpm = int(self.speed * 55) if self.speed > 0 else 0

        self._update_battery_and_distance(delta_real_time)
        self._update_temperatures(delta_real_time)
        self._update_charging(current_time, delta_real_time)

        if self.faults:
            self.status = "fault"
        elif self.is_charging:
            self.status = "charging"
        elif SIMULATOR_STATE["vehicle_started"] and self.speed > 0:
            self.status = "running"
        else:
            self.status = "stopped"

        data = {
            "speed": round(self.speed, 1),
            "rpm": self.rpm,
            "battery": round(self.battery, 1),
            "motor_temp": round(self.motor_temp, 1),
            "battery_temp": round(self.battery_temp, 1),
            "status": self.status,
            "faults": self.faults,
            "total_distance": round(SIMULATOR_STATE["total_distance"], 1),
            "estimated_remaining_km": self.estimated_remaining_km,
            "start_time": self._format_datetime(SIMULATOR_STATE["start_time"]),
            "charging_start": self._format_datetime(SIMULATOR_STATE["charging_start"]),
            "charging_end": self._format_datetime(SIMULATOR_STATE["charging_end"]),
            "charging_gained_percent": round(SIMULATOR_STATE["charging_gained_percent"], 1),
            "timestamp": current_time.isoformat(),
        }
        return data

    async def save_to_db(self, data):
        await sync_to_async(TelemetryData.objects.create)(**data)

    async def send_via_websocket(self, data):
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            "telemetry_group",
            {"type": "send_telemetry", "data": data},
        )
    async def run(self):
      save_counter = 0
      print("===== NEW SIMULATOR STARTED WITH 6-SECOND LOGIC =====")   # ← must see this
      while True:
        data = await self.generate_data()
        await self.send_via_websocket(data)

        save_counter += 1
        print(f"Loop #{save_counter} → save? {save_counter % 6 == 1}")   # ← watch this

        if save_counter % 6 == 1:
            print(">>> SAVING TO DATABASE <<<")   # ← only this should appear every ~6s
            await self.save_to_db(data)

        await asyncio.sleep(1)
    