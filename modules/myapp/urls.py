from django.urls import path
from .views import past_5_days_summary, download_telemetry_csv  

urlpatterns = [
    path("api/past-data/", past_5_days_summary),
    path("api/download-csv/", download_telemetry_csv),            
]