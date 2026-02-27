from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate
from .models import CustomUser, TelemetryData
from django.utils import timezone
from datetime import timedelta
from collections import defaultdict
import json, csv

# pip install djangorestframework-simplejwt
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework_simplejwt.authentication import JWTAuthentication

User = CustomUser


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role
    refresh["username"] = user.username
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


@csrf_exempt
def signup_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        body = json.loads(request.body)
        username = body.get("username", "").strip()
        email = body.get("email", "").strip().lower()
        password = body.get("password", "")
        confirm = body.get("confirm_password", "")
        role = body.get("role", "user")

        if not all([username, email, password, confirm]):
            return JsonResponse({"error": "All fields are required"}, status=400)
        if password != confirm:
            return JsonResponse({"error": "Passwords do not match"}, status=400)
        if len(password) < 6:
            return JsonResponse({"error": "Password must be at least 6 characters"}, status=400)
        if role not in ["admin", "user"]:
            return JsonResponse({"error": "Invalid role"}, status=400)
        if User.objects.filter(email=email).exists():
            return JsonResponse({"error": "Email already registered"}, status=400)
        if User.objects.filter(username=username).exists():
            return JsonResponse({"error": "Username already taken"}, status=400)

        user = User.objects.create_user(username=username, email=email, password=password)
        user.role = role
        user.save()

        return JsonResponse({"message": "Account created successfully"}, status=201)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def login_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        body = json.loads(request.body)
        email = body.get("email", "").strip().lower()
        password = body.get("password", "")

        if not email or not password:
            return JsonResponse({"error": "Email and password required"}, status=400)

        try:
            user = CustomUser.objects.get(email=email)
            if not user.check_password(password):
                return JsonResponse({"error": "Invalid email or password"}, status=401)

            tokens = get_tokens_for_user(user)
            return JsonResponse({
                "message": "Login successful",
                "role": user.role,
                "username": user.username,
                "email": user.email,
                "access": tokens["access"],
                "refresh": tokens["refresh"],
            })
        except CustomUser.DoesNotExist:
            return JsonResponse({"error": "Invalid email or password"}, status=401)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def logout_view(request):
    """
    Blacklist the refresh token on logout.
    Requires INSTALLED_APPS to include 'rest_framework_simplejwt.token_blacklist'
    and run migrations after adding it.
    """
    try:
        body = json.loads(request.body)
        refresh_token = body.get("refresh")
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except Exception:
        pass  # even if blacklisting fails, respond with success
    return JsonResponse({"message": "Logged out"})


@csrf_exempt
def refresh_token_view(request):
    """Exchange a refresh token for a new access token."""
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        body = json.loads(request.body)
        refresh_token = body.get("refresh")
        if not refresh_token:
            return JsonResponse({"error": "Refresh token required"}, status=400)
        token = RefreshToken(refresh_token)
        return JsonResponse({"access": str(token.access_token)})
    except (TokenError, InvalidToken) as e:
        return JsonResponse({"error": "Invalid or expired refresh token"}, status=401)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


def _get_jwt_user(request):
    """Helper: validate Bearer token and return user or None."""
    jwt_auth = JWTAuthentication()
    try:
        result = jwt_auth.authenticate(request)
        if result is None:
            return None
        user, _ = result
        return user
    except Exception:
        return None


def me_view(request):
    user = _get_jwt_user(request)
    if user and user.is_authenticated:
        return JsonResponse({
            "authenticated": True,
            "role": user.role,
            "username": user.username,
            "email": user.email,
        })
    return JsonResponse({"authenticated": False}, status=401)


def past_5_days_summary(request):
    user = _get_jwt_user(request)
    if not user or not user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    today = timezone.now().date()
    filter_date_str = request.GET.get("date")

    if filter_date_str:
        try:
            filter_date = timezone.datetime.strptime(filter_date_str, "%Y-%m-%d").date()
            start_date = end_date = filter_date
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

    sorted_dates = sorted(grouped.keys(), reverse=True)

    day_end_values = {}
    for date in sorted_dates:
        entries = grouped[date]
        if entries:
            last_entry = max(entries, key=lambda e: e.timestamp)
            day_end_values[date] = last_entry.total_distance or 0.0

    result = []
    for i, date in enumerate(sorted_dates):
        entries = grouped[date]
        if not entries:
            continue

        end_value = day_end_values.get(date, 0.0)
        if i == len(sorted_dates) - 1:
            driven = end_value
        else:
            prev_date = sorted_dates[i + 1]
            driven = max(0.0, end_value - day_end_values.get(prev_date, 0.0))

        motor_temps = [e.motor_temp for e in entries if e.motor_temp is not None]
        battery_temps = [e.battery_temp for e in entries if e.battery_temp is not None]

        total_gain = session_max = previous_gain = 0
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


def download_telemetry_csv(request):
    user = _get_jwt_user(request)
    if not user or not user.is_authenticated:
        return HttpResponse("Unauthorized", status=401)

    today = timezone.now().date()
    filter_date_str = request.GET.get("date")
    raw_mode = request.GET.get("raw", "0") == "1"

    if filter_date_str:
        try:
            filter_date = timezone.datetime.strptime(filter_date_str, "%Y-%m-%d").date()
            start_date = end_date = filter_date
        except ValueError:
            return HttpResponse("Invalid Date Format, Use YYYY-MM-DD", status=400)
    else:
        start_date = today - timedelta(days=5)
        end_date = today

    if raw_mode:
        qs = (
            TelemetryData.objects
            .filter(timestamp__date__gte=start_date, timestamp__date__lte=end_date)
            .order_by("timestamp")
        )
        filename = f"telemetry_raw_{start_date}_to_{end_date}.csv"
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        writer = csv.writer(response)
        writer.writerow([
            "Timestamp", "Status", "Speed (km/h)", "RPM",
            "Battery (%)", "Motor Temp (°C)", "Battery Temp (°C)",
            "Total Distance (km)", "Estimated Remaining (km)",
            "Charging Gained (%)", "Faults",
        ])
        for entry in qs:
            writer.writerow([
                entry.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                entry.status, entry.speed, entry.rpm, entry.battery,
                entry.motor_temp, entry.battery_temp, entry.total_distance,
                entry.estimated_remaining_km, entry.charging_gained_percent, entry.faults,
            ])
        return response

    data = (
        TelemetryData.objects
        .filter(timestamp__date__gte=start_date, timestamp__date__lte=end_date)
        .order_by("timestamp")
    )
    grouped = defaultdict(list)
    for entry in data:
        grouped[entry.timestamp.date()].append(entry)

    sorted_dates = sorted(grouped.keys(), reverse=True)
    day_end_values = {}
    for date in sorted_dates:
        entries = grouped[date]
        if entries:
            last_entry = max(entries, key=lambda e: e.timestamp)
            day_end_values[date] = last_entry.total_distance or 0.0

    rows = []
    for i, date in enumerate(sorted_dates):
        entries = grouped[date]
        if not entries:
            continue
        end_value = day_end_values.get(date, 0.0)
        if i == len(sorted_dates) - 1:
            driven = end_value
        else:
            prev_date = sorted_dates[i + 1]
            driven = max(0.0, end_value - day_end_values.get(prev_date, 0.0))

        motor_temps = [e.motor_temp for e in entries if e.motor_temp is not None]
        battery_temps = [e.battery_temp for e in entries if e.battery_temp is not None]

        total_gain = session_max = previous_gain = 0
        for e in sorted(entries, key=lambda x: x.timestamp):
            gain = e.charging_gained_percent or 0
            if gain > previous_gain:
                session_max = gain
            elif gain < previous_gain:
                total_gain += session_max
                session_max = gain if gain > 0 else 0
            previous_gain = gain
        total_gain += session_max

        rows.append({
            "date": str(date),
            "total_distance": round(driven, 2),
            "battery_gain": round(total_gain, 2),
            "avg_motor_temp": round(sum(motor_temps) / len(motor_temps), 2) if motor_temps else 0,
            "min_motor_temp": min(motor_temps) if motor_temps else 0,
            "max_motor_temp": max(motor_temps) if motor_temps else 0,
            "avg_battery_temp": round(sum(battery_temps) / len(battery_temps), 2) if battery_temps else 0,
            "min_battery_temp": min(battery_temps) if battery_temps else 0,
            "max_battery_temp": max(battery_temps) if battery_temps else 0,
        })

    filename = f"telemetry_summary_{start_date}_to_{end_date}.csv"
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    writer = csv.writer(response)
    writer.writerow([
        "Date", "Total Distance (km)", "Battery Gain (%)",
        "Motor Temp Min (°C)", "Motor Temp Avg (°C)", "Motor Temp Max (°C)",
        "Battery Temp Min (°C)", "Battery Temp Avg (°C)", "Battery Temp Max (°C)",
    ])
    for row in rows:
        writer.writerow([
            row["date"], row["total_distance"], row["battery_gain"],
            row["min_motor_temp"], row["avg_motor_temp"], row["max_motor_temp"],
            row["min_battery_temp"], row["avg_battery_temp"], row["max_battery_temp"],
        ])
    return response