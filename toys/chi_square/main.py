"""
PyWebView wrapper dla aplikacji Test Chi-Kwadrat.

Uruchamia Flask server w tle i otwiera natywne okno aplikacji.
"""

import webview
from threading import Thread
import time
from app import app

PORT = 15003


def start_flask():
    """Uruchom Flask server w osobnym watku"""
    app.run(port=PORT, debug=False, use_reloader=False)


def main():
    """Glowna funkcja - uruchom aplikacje"""
    flask_thread = Thread(target=start_flask, daemon=True)
    flask_thread.start()

    time.sleep(1)

    window = webview.create_window(
        title='Test Chi-Kwadrat',
        url=f'http://127.0.0.1:{PORT}',
        width=1200,
        height=900,
        resizable=True,
        min_size=(800, 600)
    )

    webview.start()


if __name__ == '__main__':
    main()
