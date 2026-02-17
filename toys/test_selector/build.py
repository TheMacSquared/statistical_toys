import os
import sys

import PyInstaller.__main__

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from common.build_utils import add_data_arg


def build_exe():
    for path in ['templates', 'static', 'tree_config.json']:
        if not os.path.exists(path):
            print(f'ERROR: {path} not found!')
            sys.exit(1)

    common_static_dir = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        '..',
        'common',
        'static'
    )

    args = [
        'main.py',
        '--name=test_selector',
        '--onefile',
        '--windowed',
        add_data_arg('templates', 'templates'),
        add_data_arg('static', 'static'),
        add_data_arg('tree_config.json', '.'),
        '--hidden-import=bottle',
        '--hidden-import=proxy_tools',
        '--clean',
        '--noconfirm'
    ]

    if os.path.exists(common_static_dir):
        args.append(add_data_arg(os.path.abspath(common_static_dir), os.path.join('common', 'static')))

    print('Building test_selector.exe...')
    PyInstaller.__main__.run(args)
    print('Build complete: dist/test_selector.exe')


if __name__ == '__main__':
    build_exe()
