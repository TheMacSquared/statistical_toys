# Korelacja Pearsona

Interaktywna aplikacja do wizualizacji wspolczynnika korelacji Pearsona. Pozwala dodawac punkty na wykresie rozrzutu, oblicza korelacje, linie regresji i pokazuje szczegolowy rozklad skladowych wzoru.

## Funkcje

- Obliczanie wspolczynnika r Pearsona z p-value
- Linia regresji (nachylenie, wyraz wolny, blad standardowy)
- Wspolczynnik determinacji R-kwadrat
- Klasyfikacja sily korelacji: slaba (|r| < 0.3), umiarkowana (0.3-0.7), silna (> 0.7)
- Rozklad per-punkt skladowych wzoru (odchylenia, iloczyny)
- Gotowe eksperymenty: korelacja dodatnia/ujemna, brak korelacji, zaleznosc nieliniowa, wplyw outlierow

## Uruchomienie (Development)

```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Aplikacja otworzy sie w oknie PyWebView na porcie **15004**.

## Budowanie .exe (Windows)

```powershell
python build.py
```

Plik `.exe` zostanie utworzony w `dist/PearsonCorrelation.exe`.

## Struktura projektu

```
pearson_correlation/
├── app.py              # Flask backend (2 endpointy API)
├── main.py             # PyWebView wrapper (port 15004)
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

Oblicza wspolczynnik korelacji Pearsona dla podanych punktow.

**Request:**
```json
{
  "points": [
    {"x": 1, "y": 2},
    {"x": 3, "y": 5},
    {"x": 5, "y": 7}
  ]
}
```

**Walidacja:**
- Lista 3-100 punktow
- Kazdy punkt musi miec pola `x` i `y` (liczby skonczone)
- Wartosci x nie moga byc wszystkie identyczne (zerowa wariancja)
- Wartosci y nie moga byc wszystkie identyczne

**Response:**
```json
{
  "success": true,
  "r": 0.997054,
  "r_squared": 0.994117,
  "p_value": 0.048946,
  "n": 3,
  "df": 1,
  "mean_x": 3.0,
  "mean_y": 4.6667,
  "sum_products": 10.0,
  "sum_dx_sq": 8.0,
  "sum_dy_sq": 12.6667,
  "slope": 1.25,
  "intercept": 0.9167,
  "std_err": 0.25,
  "strength": "silna",
  "strength_label": "Silna",
  "direction": "dodatnia",
  "point_details": [
    {"x": 1, "y": 2, "dx": -2.0, "dy": -2.6667, "product": 5.3333, "dx_sq": 4.0, "dy_sq": 7.1111}
  ]
}
```

### `POST /api/generate`

Generuje przykladowy zbior danych do eksperymentow.

**Request:**
```json
{
  "type": "perfect_positive"
}
```

**Dostepne typy:**
| Typ | Opis | Punkty |
|-----|------|--------|
| `perfect_positive` | Silna korelacja dodatnia (y = 2x + 1 + szum) | 20 |
| `perfect_negative` | Silna korelacja ujemna (y = -1.5x + 15 + szum) | 20 |
| `no_correlation` | Brak korelacji - losowa chmura | 30 |
| `nonlinear` | Zaleznosc nieliniowa (U-shape, r bliskie 0) | 30 |
| `outlier_effect` | Brak korelacji + 1 outlier tworzacy pozorna korelacje | 21 |

**Response:**
```json
{
  "success": true,
  "points": [{"x": 1.0, "y": 3.12}, {"x": 1.47, "y": 4.05}]
}
```

## Technologie

- **Backend**: Flask, NumPy, SciPy (`scipy.stats.pearsonr`, `scipy.stats.linregress`)
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Desktop**: PyWebView
- **Build**: PyInstaller

## Licencja

CC BY 4.0 (patrz [LICENSE](../../LICENSE) w katalogu glownym)
