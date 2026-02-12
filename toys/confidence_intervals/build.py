import PyInstaller.__main__
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from common.build_utils import add_data_arg

def build_exe():
    for path in ['templates', 'static', 'questions', 'ci_config.json']:
        if not os.path.exists(path):
            print(f"ERROR: {path} not found!")
            sys.exit(1)

    common_static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                     '..', 'common', 'static')

    print("Building confidence_intervals.exe...")

    args = [
        'main.py',
        '--name=confidence_intervals',
        '--onefile',
        '--windowed',
        add_data_arg('templates', 'templates'),
        add_data_arg('static', 'static'),
        add_data_arg('questions', 'questions'),
        add_data_arg('ci_config.json', '.'),
        '--hidden-import=bottle',
        '--hidden-import=proxy_tools',
        '--clean',
        '--noconfirm'
    ]

    # Dodaj common/static jesli istnieje (shared.css)
    if os.path.exists(common_static_dir):
        args.append(add_data_arg(os.path.abspath(common_static_dir),
                                 os.path.join('common', 'static')))

    PyInstaller.__main__.run(args)

    print("Build complete: dist/confidence_intervals.exe")

if __name__ == '__main__':
    build_exe()
