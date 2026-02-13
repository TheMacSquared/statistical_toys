# Histogram - Rozkład Normalny

Interaktywna zabawka do wizualizacji rozkładu normalnego (Gaussa).

## Co Robi Ta Zabawka?

Generuje losową próbkę z rozkładu normalnego N(μ, σ²) i wyświetla histogram wraz z:
- Krzywą teoretyczną rozkładu
- Statystykami opisowymi próbki (średnia, odchylenie, kwartyle)

### Cel Edukacyjny

Ta zabawka pomaga zrozumieć:
- Jak parametry μ (średnia) i σ (odchylenie) wpływają na kształt rozkładu
- Związek między histogramem empirycznym a krzywą teoretyczną
- Wpływ wielkości próby (n) na gładkość histogramu
- Zmienność losową - każda próbka jest inna!

## Dla Studentów

### Jak Uruchomić?

1. Pobierz plik `Histogram.exe`
2. Dwuklik - otwiera się okno aplikacji
3. Eksperymentuj z suwakami!

**Uwaga**: Windows może wyświetlić ostrzeżenie przy pierwszym uruchomieniu (aplikacja nie jest podpisana). Kliknij "Więcej informacji" → "Uruchom mimo to".

### Eksperymenty do Wypróbowania

1. **Wpływ średniej (μ)**
   - Ustaw μ = -2, potem μ = 2
   - Zaobserwuj przesunięcie rozkładu

2. **Wpływ odchylenia (σ)**
   - Ustaw σ = 0.5, potem σ = 2
   - Jak zmienia się rozproszenie danych?

3. **Reguła 68-95-99.7**
   - Ustaw μ = 0, σ = 1, n = 1000
   - ~68% danych powinno być między -1 a 1
   - ~95% danych między -2 a 2
   - Wygeneruj kilka próbek i sprawdź!

4. **Centralne Twierdzenie Graniczne (wstęp)**
   - Zwiększ n z 10 do 1000
   - Histogram staje się coraz bardziej gładki i przypomina krzywą teoretyczną

## Dla Developerów

### Struktura

```
toys/histogram/
├── app.py              # Flask backend (logika, API)
├── main.py             # PyWebView wrapper (okno aplikacji)
├── build.py            # Skrypt budowania .exe
├── requirements.txt    # Zależności
├── templates/
│   └── index.html      # UI (HTML)
└── static/
    ├── style.css       # Style
    └── script.js       # Logika frontend (fetch, Plotly)
```

### Uruchomienie Lokalne (Development)

```bash
# Aktywuj venv (z głównego katalogu projektu)
source ../../venv/bin/activate

# Uruchom aplikację
python main.py
```

**Uwaga WSL**: PyWebView wymaga X servera na WSL. Alternatywnie uruchom samo Flask:
```bash
python app.py
# Otwórz http://localhost:15000 w przeglądarce
```

### Budowanie .exe

```bash
# Z katalogu toys/histogram/
python build.py
```

Wynikowy plik: `dist/Histogram.exe`

### Testowanie

Backend API jest testowany automatycznie:
```bash
python -c "
from app import app
import json

with app.test_client() as client:
    response = client.post('/api/generate',
                           data=json.dumps({'n': 100, 'mean': 0, 'sd': 1}),
                           content_type='application/json')
    print(f'Status: {response.status_code}')
    print(f'Success: {response.get_json()[\"success\"]}')
"
```

### Stack Technologiczny

- **Backend**: Python 3.12, Flask, NumPy
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla), Plotly.js
- **Desktop**: PyWebView (natywny webview systemu)
- **Build**: PyInstaller

### API Endpoints

**POST /api/generate**

Request:
```json
{
    "n": 100,      // liczba próbek (10-10000)
    "mean": 0.0,   // średnia
    "sd": 1.0,     // odchylenie standardowe (> 0)
    "binwidth": null // szerokość binu (null = auto wg reguły Sturgesa)
}
```

Response:
```json
{
    "success": true,
    "histogram": {
        "counts": [3, 12, 25, ...],       // częstości
        "bin_centers": [-2.5, -2.0, ...], // środki binów
        "bin_edges": [-3.0, -2.5, ...]    // krawędzie binów
    },
    "stats": {
        "mean": 0.03,
        "sd": 0.98,
        "median": 0.02,
        "min": -2.83,
        "max": 2.94,
        "q25": -0.65,
        "q75": 0.71
    },
    "params": {
        "n": 100,
        "mean": 0.0,
        "sd": 1.0
    }
}
```

**GET /api/export-csv**

Eksportuje ostatnio wygenerowaną próbkę do formatu CSV. Zwraca 400 jeśli nie wygenerowano jeszcze danych.

## Licencja

CC BY 4.0 (patrz [LICENSE](../../LICENSE) w katalogu głównym)
