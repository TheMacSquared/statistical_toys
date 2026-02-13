# Obciazenie probkowania

Interaktywna wizualizacja pokazujaca jak niereprezentatywna (obciazona) proba prowadzi do blednych wnioskow statystycznych. Aplikacja generuje populacje i obciazone proby, wyswietlajac je jednoczesnie na wykresie rozrzutu z porownaniem korelacji.

## Funkcje

- 3 predefiniowane scenariusze z historiami wyjasniajacymi zrodlo biasu
- Wykres rozrzutu: populacja (szare) + proba (kolorowe) + linie regresji
- Porownanie statystyk: r Pearsona, p-value, n, rownanie regresji dla populacji i proby
- Tryb odkrywania: najpierw proba, potem odsloniecie populacji (element zaskoczenia)
- Zaznaczanie wlasnego regionu: narysuj prostokat na wykresie i zobacz statystyki
- Paradoks Simpsona z kolorowaniem grup (mlodzi/starsi)

## Scenariusze

| Scenariusz | Historia | Populacja r | Proba r | Efekt |
|---|---|---|---|---|
| **Ograniczenie zakresu** | Ankieta w luksusowym hotelu (dochod vs szczescie) | ~0.65 | ~0.1 | Slaba korelacja |
| **Obcinanie proby** | Analiza tylko zdanych studentow (nauka vs wynik) | ~0.7 | ~0.3 | Oslabiona korelacja |
| **Paradoks Simpsona** | Badanie w domu seniora (cwiczenia vs waga) | ~-0.5 | ~+0.3 | Odwrocona korelacja |

## Uruchomienie (Development)

```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Aplikacja otworzy sie w oknie PyWebView na porcie **15005**.

## Budowanie .exe (Windows)

```powershell
python build.py
```

Plik `.exe` zostanie utworzony w `dist/BiasedSampling.exe`.

## Struktura projektu

```
biased_sampling/
├── app.py              # Flask backend (4 endpointy API)
├── main.py             # PyWebView wrapper (port 15005)
├── build.py            # Skrypt budowania .exe
├── templates/
│   └── index.html      # UI
└── static/
    ├── style.css       # Style (prefix bs-*)
    └── script.js       # Logika frontend (Plotly.js)
```

## API Endpoints

### `GET /api/scenarios`

Zwraca liste dostepnych scenariuszy.

**Response:**
```json
{
  "success": true,
  "scenarios": [
    {
      "id": "restriction_of_range",
      "name": "Ograniczenie zakresu",
      "description": "Badaczka chce zbadac...",
      "x_label": "Dochod (tys. zl)",
      "y_label": "Poczucie szczescia (1-10)"
    }
  ]
}
```

### `POST /api/generate`

Generuje populacje i obciazona probe dla wybranego scenariusza.

**Request:**
```json
{
  "scenario_id": "restriction_of_range",
  "seed": 42
}
```

**Scenariusze:** `restriction_of_range`, `truncation_bias`, `simpsons_paradox`

**Response:**
```json
{
  "success": true,
  "scenario": {"id": "...", "name": "...", "description": "...", "x_label": "...", "y_label": "..."},
  "population": {
    "points": [{"x": 60.12, "y": 5.8}, ...],
    "stats": {"r": 0.6512, "p_value": 0.0001, "slope": 0.048, "intercept": 2.62, "n": 300},
    "groups": null
  },
  "sample": {
    "points": [{"x": 95.3, "y": 6.1}, ...],
    "stats": {"r": 0.1234, "p_value": 0.34, "slope": 0.01, "intercept": 5.8, "n": 75},
    "bias_description": "Tylko goscie luksusowego hotelu (wysokie dochody)"
  }
}
```

Dla scenariusza `simpsons_paradox`, pole `groups` zawiera etykiety `"young"` / `"old"` dla kazdego punktu populacji.

### `POST /api/compute`

Oblicza statystyki korelacji dla podanych punktow (uzywane przez tryb recznego zaznaczania).

**Request:**
```json
{
  "points": [{"x": 1, "y": 2}, {"x": 3, "y": 5}, {"x": 5, "y": 7}]
}
```

**Walidacja:**
- Lista 3-500 punktow
- Kazdy punkt musi miec pola `x` i `y` (liczby skonczone)
- Wartosci x/y nie moga byc wszystkie identyczne

**Response:**
```json
{
  "success": true,
  "r": 0.9971,
  "p_value": 0.0489,
  "slope": 1.25,
  "intercept": 0.9167,
  "n": 3
}
```

## Technologie

- **Backend**: Flask, NumPy, SciPy (`scipy.stats.pearsonr`, `scipy.stats.linregress`)
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla), Plotly.js 2.26.0
- **Desktop**: PyWebView
- **Build**: PyInstaller

## Licencja

CC BY 4.0 (patrz [LICENSE](../../LICENSE) w katalogu glownym)
