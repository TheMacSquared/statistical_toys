import PyInstaller.__main__
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from common.build_utils import add_data_arg

def build():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    templates_dir = os.path.join(current_dir, 'templates')
    static_dir = os.path.join(current_dir, 'static')

    if not os.path.exists(templates_dir):
        print(f"ERROR: templates/ not found: {templates_dir}")
        sys.exit(1)

    if not os.path.exists(static_dir):
        print(f"ERROR: static/ not found: {static_dir}")
        sys.exit(1)

    print("Building Histogram.exe...")

    PyInstaller.__main__.run([
        'main.py',
        '--onefile',
        '--windowed',
        '--name=Histogram',
        add_data_arg(templates_dir, 'templates'),
        add_data_arg(static_dir, 'static'),
        '--clean',
        '--noconfirm',
        '--hidden-import=bottle',
        '--hidden-import=proxy_tools',
    ])

    print("Build complete: dist/Histogram.exe")

if __name__ == '__main__':
    build()
