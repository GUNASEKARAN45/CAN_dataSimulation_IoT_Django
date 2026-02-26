from django.http import JsonResponse
from django.utils import timezone
from datetime import timedelta
from collections import defaultdict
from .models import TelemetryData

def past_5_days_summary(request):
    today = timezone.now().date()
    filter_date_str = request.GET.get('date')  

    if filter_date_str:
        try:
            filter_date = timezone.datetime.strptime(filter_date_str, '%Y-%m-%d').date()
            start_date = filter_date
            end_date = filter_date
        except ValueError:
            return JsonResponse({"error": "Invalid date format"}, status=400)
    else:
        start_date = today - timedelta(days=5)
        end_date = today

    data = (
        TelemetryData.objects
        .filter(timestamp__date__gte=start_date, timestamp__date__lte=end_date)
        .order_by("timestamp")
    )

    grouped = defaultdict(list)
    for entry in data:
        grouped[entry.timestamp.date()].append(entry)

    result = []

    sorted_dates = sorted(grouped.keys(), reverse=True)

    day_end_values = {}
    for date in sorted_dates:
        entries = grouped[date]
        if entries:
            last_entry = max(entries, key=lambda e: e.timestamp)
            day_end_values[date] = last_entry.total_distance or 0.0

    for i, date in enumerate(sorted_dates):
        entries = grouped[date]
        if not entries:
            continue

        end_value = day_end_values.get(date, 0.0)

        if i == len(sorted_dates) - 1:
            driven = end_value
        else:
            prev_date = sorted_dates[i + 1]
            prev_end = day_end_values.get(prev_date, 0.0)
            driven = max(0.0, end_value - prev_end)

        motor_temps = [e.motor_temp for e in entries if e.motor_temp is not None]
        battery_temps = [e.battery_temp for e in entries if e.battery_temp is not None]

        total_gain = 0
        session_max = 0
        previous_gain = 0
        for e in sorted(entries, key=lambda x: x.timestamp):
            gain = e.charging_gained_percent or 0
            if gain > previous_gain:
                session_max = gain
            elif gain < previous_gain:
                total_gain += session_max
                session_max = gain if gain > 0 else 0
            previous_gain = gain
        total_gain += session_max

        result.append({
            "date": str(date),
            "total_distance": round(driven, 2),
            "avg_motor_temp": round(sum(motor_temps) / len(motor_temps), 2) if motor_temps else 0,
            "max_motor_temp": max(motor_temps) if motor_temps else 0,
            "min_motor_temp": min(motor_temps) if motor_temps else 0,
            "avg_battery_temp": round(sum(battery_temps) / len(battery_temps), 2) if battery_temps else 0,
            "max_battery_temp": max(battery_temps) if battery_temps else 0,
            "min_battery_temp": min(battery_temps) if battery_temps else 0,
            "battery_gain": round(total_gain, 2),
        })

    return JsonResponse(result, safe=False)