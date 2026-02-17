export interface TelemetryData {
  speed: number;
  rpm: number;
  battery: number;
  motor_temp: number;
  battery_temp: number;
  status: "running" | "stopped" | "charging" | "fault" | "emergency_stop";
  faults: string[];
  latitude: number;
  longitude: number;
  total_distance: number;
  estimated_remaining_km: number;
  start_time?: string | null;
  charging_start?: string | null;
  charging_end?: string | null;
  charging_gained_percent: number;
  timestamp?: string;
}