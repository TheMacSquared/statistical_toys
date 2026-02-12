import PyInstaller.__main__
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from common.build_utils import add_data_arg

def build():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    templates_dir = os.path.join(current_dir, 'templates')
    static_dir = os.path.join(current_dir, 'static')
    common_static_dir = os.path.join(current_dir, '..', 'common', 'static')

    if not os.path.exists(templates_dir):
        print(f"ERROR: templates/ not found: {templates_dir}")
        sys.exit(1)

    if not os.path.exists(static_dir):
        print(f"ERROR: static/ not found: {static_dir}")
        sys.exit(1)

    print("Building PearsonCorrelation.exe...")

    args = [
        'main.py',
        '--onefile',
        '--windowed',
        '--name=PearsonCorrelation',
        add_data_arg(templates_dir, 'templates'),
        add_data_arg(static_dir, 'static'),
        '--clean',
        '--noconfirm',
        '--hidden-import=proxy_tools',
    ]

    # Dodaj common/static jesli istnieje (shared.css)
    if os.path.exists(common_static_dir):
        args.append(add_data_arg(os.path.abspath(common_static_dir),
                                 os.path.join('common', 'static')))

    PyInstaller.__main__.run(args)

    print("Build complete: dist/PearsonCorrelation.exe")

if __name__ == '__main__':
    build()
