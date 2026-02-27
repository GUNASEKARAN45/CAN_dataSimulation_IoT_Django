// src/hooks/usePastData.ts
import { useEffect, useState } from "react";
import api from "../lib/axios";

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
    api
      .get<PastDayData[]>("/api/past-data/")
      .then(({ data }) => setData(data))
      .catch((err) => console.error("usePastData:", err));
  }, []);

  return data;
};