# Test Chi-Kwadrat

Interaktywna aplikacja do eksploracji testu niezaleznosci chi-kwadrat. Pozwala wprowadzic tabele kontyngencji lub wygenerowac ja z procentow, a nastepnie oblicza statystyke chi-kwadrat, p-value, V Cramera i wartosci oczekiwane.

## Funkcje

- Obliczanie testu chi-kwadrat dla dowolnej tabeli kontyngencji (2-10 wierszy/kolumn)
- Generowanie tabeli z procentow i wielkosci probki
- Statystyki: chi-kwadrat, df, p-value, wartosc krytyczna, V Cramera
- Wklady poszczegolnych komorek do statystyki chi-kwadrat
- Ostrzezenia gdy wartosci oczekiwane < 5
- Wizualizacja obserwowanych vs oczekiwanych

## Uruchomienie (Development)

```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Aplikacja otworzy sie w oknie PyWebView na porcie **15003**.

## Budowanie .exe (Windows)

```powershell
python build.py
```

Plik `.exe` zostanie utworzony w `dist/ChiSquare.exe`.

## Struktura projektu

```
chi_square/
├── app.py              # Flask backend (2 endpointy API)
├── main.py             # PyWebView wrapper (port 15003)
├── build.py            # Skrypt budowania .exe
├── requirements.txt    # Zaleznosci (Flask, NumPy, SciPy)
├── templates/
│   └── index.html      # UI
└── static/
    ├── style.css       # Style
    └── script.js       # Logika frontend
```

## API Endpoints

### `POST /api/compute`

Oblicza test chi-kwadrat dla tabeli kontyngencji.

**Request:**
```json
{
  "table": [[30, 20], [10, 40]],
  "alpha": 0.05
}
```

**Walidacja tabeli:**
- Tablica 2D, minimum 2x2, maksimum 10x10
- Brak wartosci NaN, Inf lub ujemnych
- Sumy wierszy i kolumn niezerowe

**Response:**
```json
{
  "success": true,
  "chi_square": 16.6667,
  "df": 1,
  "p_value": 0.0000443,
  "critical_value": 3.8415,
  "significant": true,
  "cramers_v": 0.4082,
  "expected": [[20.0, 30.0], [20.0, 30.0]],
  "contributions": [[5.0, 3.3333], [5.0, 3.3333]],
  "warnings": []
}
```

### `POST /api/generate-from-percentages`

Generuje tabele licznosci z procentow i oblicza test.

**Request:**
```json
{
  "row_percentages": [[40, 35, 25], [35, 35, 30]],
  "n": 200,
  "row_split": [0.6, 0.4],
  "alpha": 0.05
}
```

**Parametry:**
- `row_percentages` - procenty w kazdym wierszu (normalizowane automatycznie)
- `n` - calkowita liczebnosc probki (10-10000)
- `row_split` - proporcje wierszy (normalizowane automatycznie)
- `alpha` - poziom istotnosci (0 < alpha < 1, domyslnie 0.05)

**Response:** jak `/api/compute` + dodatkowe pole `"table"` z wygenerowana tabela licznosci.

## Technologie

- **Backend**: Flask, NumPy, SciPy (`scipy.stats.chi2_contingency`)
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Desktop**: PyWebView
- **Build**: PyInstaller

## Licencja

CC BY 4.0 (patrz [LICENSE](../../LICENSE) w katalogu glownym)
