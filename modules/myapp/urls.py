from django.urls import path
from .views import (
    past_5_days_summary,
    download_telemetry_csv,
    signup_view,
    login_view,
    logout_view,
    refresh_token_view,
    me_view,
)

urlpatterns = [
    path("api/past-data/", past_5_days_summary),
    path("api/download-csv/", download_telemetry_csv),
    path("api/auth/signup/", signup_view),
    path("api/auth/login/", login_view),
    path("api/auth/logout/", logout_view),
    path("api/auth/refresh/", refresh_token_view),
    path("api/auth/me/", me_view),
]