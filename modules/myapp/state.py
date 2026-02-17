
from datetime import datetime
from threading import Lock

SIMULATOR_STATE = {
    "is_charging_mode": False,
    "vehicle_started": False,
    "total_distance": 0.0,
    "start_time": None,
    "charging_start": None,
    "charging_end": None,
    "charging_gained_percent": 0.0
}

state_lock = Lock()