from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('user', 'User'),
    ]
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')

    groups = models.ManyToManyField(
        'auth.Group',
        related_name='customuser_set',
        blank=True,
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='customuser_set',
        blank=True,
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    
    


class TelemetryData(models.Model):
    speed = models.FloatField()
    rpm = models.FloatField()
    battery = models.FloatField()
    motor_temp = models.FloatField()
    battery_temp = models.FloatField()
    status = models.CharField(max_length=20)
    faults = models.JSONField(default=list)
    total_distance = models.FloatField(default=0.0)
    estimated_remaining_km = models.FloatField(default=0.0)
    start_time = models.DateTimeField(null=True, blank=True)
    charging_start = models.DateTimeField(null=True, blank=True)
    charging_end = models.DateTimeField(null=True, blank=True)
    charging_gained_percent = models.FloatField(default=0.0)
    total_daily_charge = models.FloatField(default=0.0)
    timestamp = models.DateTimeField(auto_now_add=True)


class EventLog(models.Model):
    EVENT_CHOICES = [
        ('vehicle_start', 'Vehicle Started'),
        ('vehicle_stop', 'Vehicle Stopped'),
        ('charging_start', 'Charging Started'),
        ('charging_stop', 'Charging Stopped'),
    ]
    event_type = models.CharField(max_length=20, choices=EVENT_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.JSONField(default=dict, blank=True)