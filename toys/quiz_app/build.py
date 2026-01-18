import PyInstaller.__main__
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from common.build_utils import add_data_arg

def build_exe():
    for path in ['templates', 'static', 'questions', 'quiz_config.json']:
        if not os.path.exists(path):
            print(f"ERROR: {path} not found!")
            sys.exit(1)

    print("Building quiz_app.exe...")

    PyInstaller.__main__.run([
        'main.py',
        '--name=quiz_app',
        '--onefile',
        '--windowed',
        add_data_arg('templates', 'templates'),
        add_data_arg('static', 'static'),
        add_data_arg('questions', 'questions'),
        add_data_arg('quiz_config.json', '.'),
        '--hidden-import=bottle',
        '--hidden-import=proxy_tools',
        '--clean',
        '--noconfirm'
    ])

    print("Build complete: dist/quiz_app.exe")

if __name__ == '__main__':
    build_exe()
