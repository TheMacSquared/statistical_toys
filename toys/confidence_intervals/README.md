# Przedziały Ufności - Quiz Interpretacyjny

Interaktywna aplikacja desktopowa do nauki interpretacji przedziałów ufności.

## Opis

Aplikacja pomaga studentom opanować kluczowe umiejętności:
- **Interpretację pojedynczego przedziału ufności** - kiedy możemy wnioskować o wartości parametru
- **Porównywanie dwóch przedziałów ufności** - kiedy możemy stwierdzić różnicę między grupami

Każde pytanie zawiera:
- Treść zadania z przedziałami ufności
- **Wizualizację przedziałów CI** na osi liczbowej
- Pytanie z 3 odpowiedziami: **JEST WIĘKSZE/WYŻSZE** | **JEST MNIEJSZE/NIŻSZE** | **NIE MOŻNA POWIEDZIEĆ**
- Szczegółowe wyjaśnienie po odpowiedzi
- Podświetlenie obszaru decyzyjnego na wykresie

## Tryby quizu

### 1. Pojedynczy przedział vs wartość (20 pytań)
**Przykład:** "CI 95%: [14; 22] zł. Czy średnia > 20 zł?"

**Odpowiedzi:**
- **JEST WIĘKSZE/WYŻSZE** - gdy testowana wartość jest **poza przedziałem po lewej stronie** (średnia > wartość)
- **JEST MNIEJSZE/NIŻSZE** - gdy testowana wartość jest **poza przedziałem po prawej stronie** (średnia < wartość)
- **NIE MOŻNA POWIEDZIEĆ** - gdy wartość jest **wewnątrz przedziału** lub **na granicy**

### 2. Porównanie dwóch grup (28 pytań)
**Przykład:** "CI Warszawa [18; 24] vs Wrocław [14; 20]. Czy Warszawa droższa?"

**Odpowiedzi:**
- **JEST WIĘKSZE/WYŻSZE** - gdy przedziały są **rozdzielone** i CI1 > CI2
- **JEST MNIEJSZE/NIŻSZE** - gdy przedziały są **rozdzielone** i CI1 < CI2
- **NIE MOŻNA POWIEDZIEĆ** - gdy przedziały się **nakładają** (nawet minimalnie)

## Technologie

- **Backend:** Flask (Python)
- **Frontend:** HTML/CSS/JavaScript
- **Wizualizacja:** D3.js (wykresy SVG)
- **Desktop wrapper:** PyWebView
- **Build:** PyInstaller (.exe dla Windows)

## Instalacja (deweloperska)

```bash
# Utwórz wirtualne środowisko
python3 -m venv venv

# Aktywuj środowisko
# Linux/Mac:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Zainstaluj zależności
pip install -r requirements.txt

# Uruchom aplikację
python main.py
```

Aplikacja otworzy się w oknie PyWebView na porcie 5002.

## Build (Windows)

```bash
# Aktywuj venv
source venv/bin/activate  # lub venv\Scripts\activate

# Zbuduj .exe
python build.py

# Plik znajduje się w: dist/confidence_intervals.exe
```

## Struktura projektu

```
confidence_intervals/
├── app.py                    # Flask backend (routing, API)
├── main.py                   # PyWebView wrapper
├── build.py                  # PyInstaller config
├── ci_config.json            # Konfiguracja trybów quizu
├── questions/
│   ├── single_interval.json  # 20 pytań - tryb 1
│   └── two_intervals.json    # 20 pytań - tryb 2
├── templates/
│   ├── menu.html             # Menu wyboru trybu
│   └── quiz.html             # Strona quizu
├── static/
│   ├── style.css             # Style (gradient purple)
│   ├── script.js             # Logika quizu
│   └── visualizer.js         # Wizualizacja CI (D3.js)
├── requirements.txt
└── README.md
```

## API Endpoints

### `GET /`
Menu - wybór trybu quizu

### `GET /quiz/<mode_id>`
Strona quizu dla trybu (single_interval / two_intervals)

### `POST /api/quiz/<mode_id>/start`
Inicjalizacja sesji - tasuje pytania

**Response:**
```json
{
  "success": true,
  "total_questions": 20
}
```

### `GET /api/quiz/<mode_id>/next`
Zwraca kolejne pytanie (bez odpowiedzi correct/explanation)

**Response:**
```json
{
  "success": true,
  "finished": false,
  "question": {
    "id": 1,
    "question": "...",
    "ci_lower": 14,
    "ci_upper": 22,
    "tested_value": 20,
    "unit": "zł"
  },
  "remaining": 19
}
```

### `POST /api/quiz/<mode_id>/check`
Sprawdza odpowiedź użytkownika

**Request:**
```json
{
  "question_id": 1,
  "answer": "nie_mozna_powiedziec"  // "tak_wieksze" | "tak_mniejsze" | "nie_mozna_powiedziec"
}
```

**Response:**
```json
{
  "success": true,
  "correct": true,
  "explanation": "...",
  "correct_answer": "nie_mozna_powiedziec",
  "question_data": { ... }  // Dane do wizualizacji
}
```

## Format pytań

### Tryb 1: single_interval.json
```json
{
  "id": 1,
  "question": "Przedział ufności 95% dla średniej ceny kawy wynosi [14; 22] zł. Czy można powiedzieć z ufnością 95%, że średnia cena przekracza 20 zł?",
  "ci_lower": 14,
  "ci_upper": 22,
  "tested_value": 20,
  "comparison": "greater",
  "unit": "zł",
  "correct": "nie_mozna_powiedziec",  // "tak_wieksze" | "tak_mniejsze" | "nie_mozna_powiedziec"
  "explanation": "Wartość 20 zł znajduje się WEWNĄTRZ przedziału ufności [14; 22]. ..."
}
```

**Pole `comparison`:**
- `"greater"` - pytanie o ">", "przekracza", "większa niż" → wizualizacja [value, →)
- `"less"` - pytanie o "<", "mniejsza niż", "poniżej" → wizualizacja (←, value]

### Tryb 2: two_intervals.json
```json
{
  "id": 1,
  "question": "Przedział ufności 95% dla Warszawy: [18; 24] zł. Wrocławia: [14; 20] zł. Czy Warszawa droższa?",
  "ci1_lower": 18,
  "ci1_upper": 24,
  "ci1_label": "Warszawa",
  "ci2_lower": 14,
  "ci2_upper": 20,
  "ci2_label": "Wrocław",
  "unit": "zł",
  "correct": "nie_mozna_powiedziec",  // "tak_wieksze" | "tak_mniejsze" | "nie_mozna_powiedziec"
  "explanation": "Przedziały SIĘ NAKŁADAJĄ (część wspólna: [18; 20]). ..."
}
```

## Wizualizacja

Aplikacja używa D3.js do rysowania przedziałów ufności **od razu po załadowaniu pytania**.

**Tryb 1:**
- Oś liczbowa z przedziałem CI (niebieski prostokąt)
- Testowany PRZEDZIAŁ (nie punkt): np. ">20" to [20, →), "<20" to (←, 20]
- Przedział testowany pokazany jako prostokąt ze strzałką (pomarańczowy przed, czerwony po)
- Po odpowiedzi: przedział testowany zmienia kolor + zmiana koloru CI

**Tryb 2:**
- Dwa przedziały CI na jednej osi (niebieski + pomarańczowy)
- Po odpowiedzi: podświetlenie nakładania się lub rozdzielenia + zmiana kolorów

**Kolory przed odpowiedzią:**
- Przedział CI (tryb 1): niebieski (`#4A90E2`)
- Przedział CI 1 (tryb 2): niebieski (`#4A90E2`)
- Przedział CI 2 (tryb 2): pomarańczowy (`#F39C12`)
- Przedział testowany (tryb 1): pomarańczowy (`#F39C12`)

**Kolory po odpowiedzi:**
- Poprawna odpowiedź CI: zielony (`#27AE60`)
- Błędna odpowiedź CI: czerwony (`#E74C3C`)
- Przedział testowany: czerwony (`#E74C3C`)
- Nakładanie/NIE MOŻNA (tryb 2): żółty (`#F1C40F`)

## Edycja pytań

Aby dodać/edytować pytania:

1. Otwórz plik JSON w `questions/`
2. Edytuj strukturę JSON (zachowaj format)
3. Przebuduj .exe: `python build.py`

**Uwaga:** PyInstaller pakuje pytania w .exe - po zmianie pytań należy zrobić rebuild.

## Kluczowe zasady (do wyjaśnień w quizie)

### Pojedynczy przedział vs wartość
- Przedział ufności mówi: "średnia jest gdzieś w [a; b] z ufnością 95%"
- Nie wiemy GDZIE dokładnie w tym przedziale
- Jeśli testowana wartość jest POZA przedziałem → można stwierdzić
- Jeśli testowana wartość jest WEWNĄTRZ → nie można stwierdzić

### Porównanie dwóch grup
- Jeśli przedziały się NAKŁADAJĄ → średnie mogą być zarówno różne jak i równe
- Jeśli przedziały są ROZDZIELONE → średnie są statystycznie różne
- Stykanie się = nakładanie (nie możemy wykluczyć równości)

## Autor

Aplikacja stworzona na potrzeby zajęć ze statystyki (SGGW 2025).

## Licencja

MIT
