import PyInstaller.__main__
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from common.build_utils import add_data_arg

def build_exe():
    for path in ['templates', 'static', 'data']:
        if not os.path.exists(path):
            print(f"ERROR: {path} not found!")
            sys.exit(1)

    print("Building interpretation_quiz.exe...")

    PyInstaller.__main__.run([
        'main.py',
        '--name=interpretation_quiz',
        '--onefile',
        '--windowed',
        add_data_arg('templates', 'templates'),
        add_data_arg('static', 'static'),
        add_data_arg('data', 'data'),
        '--hidden-import=bottle',
        '--hidden-import=proxy_tools',
        '--clean',
        '--noconfirm'
    ])

    print("Build complete: dist/interpretation_quiz.exe")

if __name__ == '__main__':
    build_exe()
