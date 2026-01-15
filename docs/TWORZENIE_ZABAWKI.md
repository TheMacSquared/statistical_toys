# Tworzenie Nowej Zabawki - Instrukcja Krok po Kroku

Ten dokument przeprowadzi Cię przez cały proces tworzenia nowej interaktywnej zabawki statystycznej od zera do gotowego pliku .exe.

## Spis Treści

1. [Wymagania Wstępne](#wymagania-wstępne)
2. [Architektura Zabawki](#architektura-zabawki)
3. [Krok 1: Setup Struktury](#krok-1-setup-struktury)
4. [Krok 2: Backend Flask](#krok-2-backend-flask)
5. [Krok 3: Frontend (HTML/CSS/JS)](#krok-3-frontend-htmlcssjs)
6. [Krok 4: PyWebView Wrapper](#krok-4-pywebview-wrapper)
7. [Krok 5: Testowanie Lokalne](#krok-5-testowanie-lokalne)
8. [Krok 6: Budowanie .exe](#krok-6-budowanie-exe)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)
11. [Checklist Przed Publishem](#checklist-przed-publishem)

---

## Wymagania Wstępne

### Software
- **Python 3.10+**
  - Pobierz z [python.org](https://www.python.org/downloads/)
  - Podczas instalacji zaznacz "Add Python to PATH"

- **Git** (opcjonalnie, ale zalecane)
  - Pobierz z [git-scm.com](https://git-scm.com/)

### Umiejętności
- Podstawowa znajomość Python (pisanie funkcji, listy, słowniki)
- Podstawowa HTML/CSS (struktura strony, style)
- Podstawowa JavaScript (zmienne, funkcje, fetch API)
- **Nie musisz być ekspertem!** - dostarczone template wystarczą do startu

### Setup Projektu
```bash
cd statistical_toys
pip install -r requirements.txt
```

---

## Architektura Zabawki

Każda zabawka składa się z trzech warstw:

```
┌─────────────────────────────────────┐
│   PyWebView (Natywne Okno)         │
│   ┌─────────────────────────────┐   │
│   │  Frontend (HTML/CSS/JS)     │   │ ← UI (suwaki, wykresy)
│   │  - index.html               │   │
│   │  - script.js                │   │
│   │  - style.css                │   │
│   └──────────┬──────────────────┘   │
│              │ HTTP (fetch)          │
│   ┌──────────▼──────────────────┐   │
│   │  Backend (Flask)            │   │ ← Logika (Python)
│   │  - app.py                   │   │
│   │  - endpointy API            │   │
│   └─────────────────────────────┘   │
│   ┌─────────────────────────────┐   │
│   │  main.py                    │   │ ← Wrapper (uruchamia wszystko)
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Przepływ danych**:
1. Student przesuwa suwak w UI
2. JavaScript wywołuje fetch() do Flask endpoint
3. Flask wykonuje obliczenia w Python (numpy, scipy)
4. Flask zwraca JSON z wynikami
5. JavaScript aktualizuje wykres Plotly.js

---

## Krok 1: Setup Struktury

Stwórz nową zabawkę w katalogu `toys/`:

```bash
cd toys
mkdir nazwa_zabawki
cd nazwa_zabawki
mkdir templates static
```

Struktura powinna wyglądać tak:

```
toys/nazwa_zabawki/
├── app.py              # Backend Flask
├── main.py             # PyWebView wrapper
├── requirements.txt    # Zależności
├── templates/
│   └── index.html      # UI (strona HTML)
└── static/
    ├── style.css       # Style
    └── script.js       # Logika JavaScript
```

---

## Krok 2: Backend Flask

Stwórz plik `app.py` z podstawową strukturą Flask:

```python
from flask import Flask, render_template, jsonify, request
import numpy as np

app = Flask(__name__)

# Strona główna (renderuje index.html)
@app.route('/')
def index():
    return render_template('index.html')

# Endpoint API do obliczeń
@app.route('/api/calculate', methods=['POST'])
def calculate():
    """
    Przyjmuje parametry z frontendu, wykonuje obliczenia, zwraca wyniki.
    """
    try:
        # Odbierz parametry z JSON
        data = request.json
        param1 = float(data.get('param1', 0))
        param2 = float(data.get('param2', 1))

        # === TUTAJ TWOJA LOGIKA ===
        # Przykład: generowanie danych dla histogramu
        n = int(data.get('n', 100))
        mean = float(data.get('mean', 0))
        sd = float(data.get('sd', 1))

        # Generuj dane z rozkładu normalnego
        samples = np.random.normal(mean, sd, n)

        # Oblicz histogram (30 binów)
        hist, bin_edges = np.histogram(samples, bins=30)

        # Przygotuj dane do wysłania
        result = {
            'success': True,
            'histogram': {
                'counts': hist.tolist(),
                'bins': bin_edges.tolist()
            },
            'stats': {
                'mean': float(np.mean(samples)),
                'sd': float(np.std(samples)),
                'min': float(np.min(samples)),
                'max': float(np.max(samples))
            }
        }

        return jsonify(result)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

# Do testowania (uruchom tylko jeśli wywołane bezpośrednio)
if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

**Kluczowe punkty**:
- `@app.route('/')` - obsługuje stronę główną
- `@app.route('/api/calculate')` - endpoint do obliczeń
- `request.json` - odbiera dane z JavaScript
- `jsonify()` - zwraca JSON do frontendu
- Try/except - obsługa błędów

---

## Krok 3: Frontend (HTML/CSS/JS)

### 3.1 HTML (`templates/index.html`)

```html
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nazwa Zabawki</title>

    <!-- Plotly.js dla wykresów -->
    <script src="https://cdn.plot.ly/plotly-2.26.0.min.js"></script>

    <!-- Nasze style -->
    <link rel="stylesheet" href="{{ url_for('static', filename='style.css') }}">
</head>
<body>
    <div class="container">
        <header>
            <h1>📊 Nazwa Zabawki</h1>
            <p class="subtitle">Krótki opis czego uczy ta zabawka</p>
        </header>

        <div class="controls">
            <h2>Parametry</h2>

            <!-- Przykładowy suwak -->
            <div class="control-group">
                <label for="param-n">
                    Liczba próbek (n): <span id="value-n">100</span>
                </label>
                <input type="range" id="param-n"
                       min="10" max="1000" value="100" step="10">
            </div>

            <div class="control-group">
                <label for="param-mean">
                    Średnia (μ): <span id="value-mean">0</span>
                </label>
                <input type="range" id="param-mean"
                       min="-5" max="5" value="0" step="0.1">
            </div>

            <div class="control-group">
                <label for="param-sd">
                    Odchylenie (σ): <span id="value-sd">1</span>
                </label>
                <input type="range" id="param-sd"
                       min="0.1" max="3" value="1" step="0.1">
            </div>

            <button id="btn-regenerate">🔄 Regeneruj</button>
        </div>

        <div class="plot-container">
            <div id="plot"></div>
        </div>

        <div class="info">
            <h3>Statystyki</h3>
            <div id="stats">
                <p>Średnia: <strong id="stat-mean">-</strong></p>
                <p>Odchylenie: <strong id="stat-sd">-</strong></p>
            </div>
        </div>
    </div>

    <!-- Nasz JavaScript -->
    <script src="{{ url_for('static', filename='script.js') }}"></script>
</body>
</html>
```

### 3.2 CSS (`static/style.css`)

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    padding: 20px;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    padding: 30px;
}

header {
    text-align: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid #f0f0f0;
}

h1 {
    color: #333;
    font-size: 2.5em;
    margin-bottom: 10px;
}

.subtitle {
    color: #666;
    font-size: 1.1em;
}

.controls {
    background: #f8f9fa;
    padding: 25px;
    border-radius: 8px;
    margin-bottom: 30px;
}

.controls h2 {
    margin-bottom: 20px;
    color: #444;
}

.control-group {
    margin-bottom: 20px;
}

.control-group label {
    display: block;
    margin-bottom: 8px;
    color: #555;
    font-weight: 500;
}

.control-group span {
    color: #667eea;
    font-weight: bold;
    float: right;
}

input[type="range"] {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #d3d3d3;
    outline: none;
    -webkit-appearance: none;
}

input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    border: none;
}

button {
    width: 100%;
    padding: 12px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1.1em;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.3s;
}

button:hover {
    background: #5568d3;
}

button:active {
    transform: scale(0.98);
}

.plot-container {
    margin-bottom: 30px;
    padding: 20px;
    background: #fafafa;
    border-radius: 8px;
}

#plot {
    width: 100%;
    height: 400px;
}

.info {
    background: #e8f4f8;
    padding: 20px;
    border-radius: 8px;
    border-left: 4px solid #667eea;
}

.info h3 {
    margin-bottom: 15px;
    color: #444;
}

#stats p {
    margin: 8px 0;
    color: #555;
}

#stats strong {
    color: #667eea;
}
```

### 3.3 JavaScript (`static/script.js`)

```javascript
// Parametry globalne
let params = {
    n: 100,
    mean: 0,
    sd: 1
};

// Inicjalizacja przy załadowaniu strony
document.addEventListener('DOMContentLoaded', function() {
    // Podpięcie event listenerów do suwaków
    setupSliders();

    // Podpięcie przycisku
    document.getElementById('btn-regenerate').addEventListener('click', updatePlot);

    // Pierwszy wykres
    updatePlot();
});

function setupSliders() {
    const sliders = [
        { id: 'param-n', param: 'n', valueId: 'value-n' },
        { id: 'param-mean', param: 'mean', valueId: 'value-mean' },
        { id: 'param-sd', param: 'sd', valueId: 'value-sd' }
    ];

    sliders.forEach(slider => {
        const element = document.getElementById(slider.id);
        const valueDisplay = document.getElementById(slider.valueId);

        element.addEventListener('input', function() {
            const value = slider.param === 'n'
                ? parseInt(this.value)
                : parseFloat(this.value);

            params[slider.param] = value;
            valueDisplay.textContent = value;

            // Auto-update (możesz dodać debouncing jeśli wolne)
            updatePlot();
        });
    });
}

async function updatePlot() {
    try {
        // Wyślij request do Flask backend
        const response = await fetch('/api/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });

        const data = await response.json();

        if (data.success) {
            // Narysuj wykres
            plotHistogram(data.histogram);

            // Zaktualizuj statystyki
            updateStats(data.stats);
        } else {
            console.error('Error:', data.error);
            alert('Błąd: ' + data.error);
        }

    } catch (error) {
        console.error('Network error:', error);
        alert('Błąd połączenia z serwerem');
    }
}

function plotHistogram(data) {
    const trace = {
        x: data.bins,
        y: data.counts,
        type: 'bar',
        marker: {
            color: '#667eea',
            line: {
                color: '#5568d3',
                width: 1
            }
        },
        name: 'Histogram'
    };

    const layout = {
        title: {
            text: 'Histogram Rozkładu Normalnego',
            font: { size: 20 }
        },
        xaxis: {
            title: 'Wartość',
            gridcolor: '#e0e0e0'
        },
        yaxis: {
            title: 'Częstość',
            gridcolor: '#e0e0e0'
        },
        plot_bgcolor: '#fafafa',
        paper_bgcolor: '#fafafa',
        margin: { t: 50, b: 50, l: 60, r: 30 }
    };

    const config = {
        responsive: true,
        displayModeBar: false
    };

    Plotly.newPlot('plot', [trace], layout, config);
}

function updateStats(stats) {
    document.getElementById('stat-mean').textContent = stats.mean.toFixed(2);
    document.getElementById('stat-sd').textContent = stats.sd.toFixed(2);
}
```

**Kluczowe punkty JavaScript**:
- `fetch('/api/calculate')` - wywołuje backend Flask
- `async/await` - czeka na odpowiedź
- `Plotly.newPlot()` - rysuje wykres
- Event listeners - reagują na zmiany suwaków

---

## Krok 4: PyWebView Wrapper

Stwórz `main.py` - uruchamia Flask i otwiera okno aplikacji:

```python
import webview
from threading import Thread
from app import app

def start_flask():
    """Uruchom Flask server w tle"""
    app.run(port=5000, debug=False, use_reloader=False)

if __name__ == '__main__':
    # Uruchom Flask w osobnym wątku
    flask_thread = Thread(target=start_flask, daemon=True)
    flask_thread.start()

    # Poczekaj chwilę na start serwera
    import time
    time.sleep(1)

    # Otwórz natywne okno aplikacji
    webview.create_window(
        title='Nazwa Zabawki',
        url='http://127.0.0.1:5000',
        width=1200,
        height=800,
        resizable=True
    )
    webview.start()
```

---

## Krok 5: Testowanie Lokalne

### 5.1 Stwórz `requirements.txt` dla zabawki

```txt
flask>=3.0.0
numpy>=1.26.0
```

### 5.2 Zainstaluj zależności

```bash
cd toys/nazwa_zabawki
pip install -r requirements.txt
```

### 5.3 Uruchom aplikację

```bash
python main.py
```

Powinna otworzyć się okno aplikacji. Przetestuj:
- [ ] Suwaki działają
- [ ] Wykres się aktualizuje
- [ ] Statystyki się zmieniają
- [ ] Brak błędów w konsoli

**Debugowanie**: Jeśli coś nie działa:
1. Uruchom samego Flask: `python app.py` i otwórz http://localhost:5000
2. Sprawdź konsole Python (błędy backend)
3. Sprawdź Console w przeglądarce F12 (błędy JavaScript)

---

## Krok 6: Budowanie .exe

### 6.1 Stwórz skrypt budowania

W katalogu `toys/nazwa_zabawki/` stwórz `build.py`:

```python
import PyInstaller.__main__
import os

# Ścieżki
current_dir = os.path.dirname(os.path.abspath(__file__))
templates_dir = os.path.join(current_dir, 'templates')
static_dir = os.path.join(current_dir, 'static')

PyInstaller.__main__.run([
    'main.py',
    '--onefile',
    '--windowed',
    '--name=NazwaZabawki',
    f'--add-data={templates_dir};templates',
    f'--add-data={static_dir};static',
    '--clean',
    '--noconfirm'
])
```

### 6.2 Zbuduj .exe

```bash
python build.py
```

Proces budowania zajmie 1-3 minuty. Wynikowy plik znajdziesz w `dist/NazwaZabawki.exe`.

### 6.3 Testuj .exe

```bash
cd dist
./NazwaZabawki.exe
```

**WAŻNE**: Testuj na czystym systemie (bez zainstalowanego Pythona), żeby upewnić się że .exe jest standalone!

---

## Best Practices

### Organizacja Kodu
- Trzymaj logikę statystyczną w oddzielnych funkcjach (łatwiejsze testy)
- Nie mieszaj backendu i frontendu - komunikacja tylko przez API
- Używaj try/except dla błędów użytkownika (złe parametry)

### Wydajność
- **Debouncing**: Jeśli obliczenia są ciężkie, dodaj opóźnienie przy suwa kach:
  ```javascript
  let debounceTimer;
  slider.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => updatePlot(), 300);
  });
  ```
- **Cache**: Dla powtarzalnych obliczeń, cache wyniki
- **Limit danych**: Nie wysyłaj gigantycznych tablic (max 10000 punktów)

### UI/UX
- Responsywny design (działa na małych ekranach)
- Loading indicator dla wolnych obliczeń
- Sensowne domyślne wartości parametrów
- Tooltips wyjaśniające parametry

### Error Handling
- Backend: zawsze try/except + zwracaj error message
- Frontend: catch błędy fetch + wyświetl komunikat
- Walidacja input (min/max wartości)

---

## Troubleshooting

### PyInstaller nie znajduje templates/static
**Problem**: `.exe` buduje się, ale po uruchomieniu brak UI lub 404 errors.

**Rozwiązanie**: Upewnij się że ścieżki w `build.py` są poprawne:
```python
# Windows wymaga ; a nie :
f'--add-data={templates_dir};templates'
```

### CORS Errors w przeglądarce
**Problem**: JavaScript nie może wywołać fetch do Flask.

**Rozwiązanie**: Flask CORS jeśli potrzebne:
```python
from flask_cors import CORS
app = Flask(__name__)
CORS(app)
```

### PyWebView nie startuje (Windows)
**Problem**: Błąd przy `webview.start()`.

**Rozwiązanie**:
1. Zainstaluj Edge WebView2 Runtime
2. Lub użyj `webview.create_window(..., on_top=True)`

### Import errors po zbudowaniu .exe
**Problem**: Moduł X nie znaleziony w .exe.

**Rozwiązanie**: Dodaj hidden import:
```python
PyInstaller.__main__.run([
    # ...
    '--hidden-import=scipy.special._ufuncs',
])
```

### Antywirus blokuje .exe
**Problem**: Windows Defender/inny antywirus usuwa .exe.

**Rozwiązanie**:
1. To normalne dla niepodpisanych .exe z PyInstaller
2. Wyłącz tymczasowo antywirus podczas testów
3. Dla produkcji: podpisz .exe certyfikatem (kosztuje $$$)

---

## Checklist Przed Publishem

- [ ] Aplikacja działa lokalnie (`python main.py`)
- [ ] `.exe` buduje się bez błędów
- [ ] `.exe` działa standalone (testowane bez Pythona)
- [ ] UI jest responsywny (różne rozdzielczości)
- [ ] Wszystkie suwaki działają
- [ ] Wykres się aktualizuje poprawnie
- [ ] Błędy są obsłużone gracefully (nie crashuje)
- [ ] README w `toys/nazwa_zabawki/` opisuje zabawkę
- [ ] Dodane sensowne wartości domyślne
- [ ] Przetestowane na czystym Windows

---

## Przykład Referencyjny

Zobacz `toys/histogram/` jako kompletny przykład działającej zabawki.

---

## Potrzebujesz Pomocy?

- Sprawdź istniejące zabawki jako referencję
- Otwórz Issue na GitHub
- Dokumentacja Flask: [flask.palletsprojects.com](https://flask.palletsprojects.com/)
- Dokumentacja Plotly: [plotly.com/javascript/](https://plotly.com/javascript/)
- Dokumentacja PyWebView: [pywebview.flowrl.com](https://pywebview.flowrl.com/)

Powodzenia w tworzeniu zabawek! 🚀
