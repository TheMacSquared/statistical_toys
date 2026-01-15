"""
Skrypt do budowania pliku .exe dla zabawki Histogram.

Używa PyInstaller do zapakowania aplikacji jako standalone executable.
"""

import PyInstaller.__main__
import os
import sys

def build():
    """Zbuduj plik .exe"""
    # Ścieżki
    current_dir = os.path.dirname(os.path.abspath(__file__))
    templates_dir = os.path.join(current_dir, 'templates')
    static_dir = os.path.join(current_dir, 'static')

    # Sprawdź czy katalogi istnieją
    if not os.path.exists(templates_dir):
        print(f"ERROR: Katalog templates/ nie istnieje: {templates_dir}")
        sys.exit(1)

    if not os.path.exists(static_dir):
        print(f"ERROR: Katalog static/ nie istnieje: {static_dir}")
        sys.exit(1)

    print("="*60)
    print("Budowanie Histogram.exe")
    print("="*60)
    print(f"Katalog: {current_dir}")
    print(f"Templates: {templates_dir}")
    print(f"Static: {static_dir}")
    print()

    # Parametry PyInstaller
    # UWAGA: Na Windows separator to ';', na Linux/Mac to ':'
    separator = ';' if sys.platform == 'win32' else ':'

    args = [
        'main.py',
        '--onefile',              # Pojedynczy plik .exe
        '--windowed',             # Bez okna konsoli
        '--name=Histogram',       # Nazwa .exe
        f'--add-data={templates_dir}{separator}templates',  # Dołącz templates
        f'--add-data={static_dir}{separator}static',        # Dołącz static
        '--clean',                # Wyczyść cache przed buildem
        '--noconfirm',            # Nie pytaj o potwierdzenie
        # Hidden imports (czasem potrzebne dla niektórych pakietów)
        '--hidden-import=bottle',
        '--hidden-import=proxy_tools',
    ]

    print("Uruchamianie PyInstaller...")
    print()

    try:
        PyInstaller.__main__.run(args)
        print()
        print("="*60)
        print("✓ Build zakończony sukcesem!")
        print("="*60)
        print(f"Plik .exe znajduje się w: {os.path.join(current_dir, 'dist', 'Histogram.exe')}")
        print()
        print("Testuj .exe przed dystrybucją!")
    except Exception as e:
        print()
        print("="*60)
        print("✗ Build nie powiódł się!")
        print("="*60)
        print(f"Błąd: {e}")
        sys.exit(1)

if __name__ == '__main__':
    build()
