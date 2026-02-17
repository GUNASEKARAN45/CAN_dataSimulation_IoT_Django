from django.apps import AppConfig
import os
import threading
import asyncio

class MyappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'modules.myapp'

    def ready(self):
        if os.environ.get('RUN_MAIN') == 'true':
            from .services import TelemetrySimulator 

            def start_simulator():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                simulator = TelemetrySimulator()
                loop.run_until_complete(simulator.run())

            thread = threading.Thread(target=start_simulator, daemon=True)
            thread.start()