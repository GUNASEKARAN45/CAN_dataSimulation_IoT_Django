from django.urls import path
from .views import past_5_days_summary

urlpatterns = [
    path("api/past-data/", past_5_days_summary),
]