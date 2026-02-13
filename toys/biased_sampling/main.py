"""
PyWebView wrapper dla aplikacji Obciazenie probkowania.

Uruchamia Flask server w tle i otwiera natywne okno aplikacji.
"""

import webview
from threading import Thread
import time
from app import app

PORT = 15005


def start_flask():
    """Uruchom Flask server w osobnym watku"""
    app.run(port=PORT, debug=False, use_reloader=False)


def main():
    """Glowna funkcja - uruchom aplikacje"""
    flask_thread = Thread(target=start_flask, daemon=True)
    flask_thread.start()

    time.sleep(1)

    window = webview.create_window(
        title='Obciazenie probkowania',
        url=f'http://127.0.0.1:{PORT}',
        width=1400,
        height=900,
        resizable=True,
        min_size=(900, 600)
    )

    webview.start()


if __name__ == '__main__':
    main()
