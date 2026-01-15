# Build Scripts

Ten katalog zawiera skrypty i konfiguracje do budowania plików .exe z zabawek.

## Struktura

Każda zabawka powinna mieć własny skrypt budowania w swoim katalogu (`toys/nazwa_zabawki/build.py`), ale tutaj możemy trzymać:
- Wspólne konfiguracje PyInstaller
- Skrypty do budowania wszystkich zabawek naraz
- Helpery do deploymentu

## Podstawowe Budowanie

Dla pojedynczej zabawki:
```bash
cd toys/nazwa_zabawki
python build.py
```

Wynikowy `.exe` znajdziesz w `toys/nazwa_zabawki/dist/`.

## PyInstaller - Podstawy

PyInstaller pakuje Python + zależności + kod do jednego .exe.

### Podstawowa komenda
```bash
pyinstaller --onefile --windowed main.py
```

### Ważne flagi
- `--onefile` - jeden plik .exe (nie folder z DLLkami)
- `--windowed` - bez okna konsoli (dla GUI apps)
- `--name=NazwaApp` - nazwa wynikowego .exe
- `--add-data=sciezka;folder` - dołącz pliki (templates, static)
- `--hidden-import=modul` - force include modułu
- `--clean` - wyczyść cache przed buildem
- `--icon=ikona.ico` - ikona aplikacji

### Przykład dla zabawki
```python
import PyInstaller.__main__
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
templates = os.path.join(current_dir, 'templates')
static = os.path.join(current_dir, 'static')

PyInstaller.__main__.run([
    'main.py',
    '--onefile',
    '--windowed',
    '--name=MojaZabawka',
    f'--add-data={templates};templates',
    f'--add-data={static};static',
    '--clean'
])
```

## Troubleshooting Build

### Problem: .exe jest ogromny (>200MB)
**Rozwiązanie**:
- Użyj `--exclude-module` dla nieużywanych pakietów
- Rozważ użycie virtual env tylko z potrzebnymi pakietami

### Problem: Import error w .exe
**Rozwiązanie**:
- Dodaj `--hidden-import=nazwa_modulu`
- Sprawdź czy moduł jest w requirements.txt

### Problem: Templates/static nie są znalezione
**Rozwiązanie**:
- Sprawdź ścieżki w `--add-data`
- Windows: użyj `;` nie `:`
- Użyj absolute paths

### Problem: Antywirus blokuje .exe
**Rozwiązanie**:
- Normalne dla niepodpisanych .exe
- Dodaj wyjątek w antywirusie
- Dla produkcji: podpisz certyfikatem ($300/rok)

## Rozmiary .exe

Typowe rozmiary dla naszych zabawek:
- Prosta zabawka (NumPy): ~50MB
- Z SciPy: ~80MB
- Z Matplotlib: ~100MB

To normalne - .exe zawiera cały Python runtime + biblioteki.

## Future: CI/CD

W przyszłości możemy dodać GitHub Actions do automatycznego buildowania .exe przy każdym release.

## Dokumentacja

- PyInstaller: https://pyinstaller.org/
- PyWebView build guide: https://pywebview.flowrl.com/guide/freezing.html
