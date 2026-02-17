import time
from threading import Thread

import webview

from app import app

PORT = 15006


def start_flask():
    app.run(port=PORT, debug=False, use_reloader=False)


def main():
    flask_thread = Thread(target=start_flask, daemon=True)
    flask_thread.start()

    time.sleep(1)

    webview.create_window(
        title='Przewodnik wyboru testu',
        url=f'http://127.0.0.1:{PORT}',
        width=1080,
        height=860,
        resizable=True,
        min_size=(820, 620)
    )
    webview.start()


if __name__ == '__main__':
    main()
