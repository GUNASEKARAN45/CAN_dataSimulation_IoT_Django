import { useEffect, useState } from "react";

export interface PastDayData {
  date: string;
  total_distance: number;
  battery_gain: number;
  avg_motor_temp: number;
  max_motor_temp: number;
  min_motor_temp: number;
  avg_battery_temp: number;
  max_battery_temp: number;
  min_battery_temp: number;
}

export const usePastData = () => {
  const [data, setData] = useState<PastDayData[]>([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/past-data/")
      .then((res) => res.json())
      .then((res) => setData(res))
      .catch((err) => console.error(err));
  }, []);

  return data;
};