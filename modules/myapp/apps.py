from django.apps import AppConfig
import os
import threading
import asyncio

class MyappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'modules.myapp'

    def ready(self):
        # Only run in the actual server process (not the reloader parent)
        if os.environ.get('RUN_MAIN') == 'true':
            from .services import TelemetrySimulator  # adjust import path

            def start_simulator():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                simulator = TelemetrySimulator()
                loop.run_until_complete(simulator.run())

            thread = threading.Thread(target=start_simulator, daemon=True)
            thread.start()