# Quiz Statystyczny

Interaktywna aplikacja quizowa do nauki statystyki. Zawiera 5 roznych quizow obejmujacych typy zmiennych, rozklady prawdopodobienstwa, wybor testu, formowanie hipotez i interpretacje wynikow.

## Dostepne quizy

| Quiz | Pytania | Typ odpowiedzi | Opis |
|------|---------|----------------|------|
| **Typy Zmiennych** | 75 | Wybor z 4 opcji | Rozpoznaj typ zmiennej: ilosciowa/jakosciowa, dyskretna/ciagla |
| **Rozklady Prawdopodobienstwa** | 30 | Wybor z 3 opcji | Dopasuj zjawisko do rozkladu (dwumianowy, Poissona, normalny) |
| **Wybor Testu Statystycznego** | 35 | Losowe 3 z puli 11 | Dobierz test do sytuacji badawczej |
| **Hipotezy Statystyczne** | 24 | Losowe opcje | Dobierz poprawna pare H0/Ha i test |
| **Interpretacja Wynikow** | 20 | Interpretacja tekstu | Sformuluj poprawne wnioski statystyczne |

Kazda sesja losuje **10 pytan** z wybranego quizu (stala `MAX_QUESTIONS`).

## Uruchomienie (Development)

### Windows PowerShell

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

### Linux/Mac

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

Aplikacja otworzy sie w oknie PyWebView na porcie **15001**.

## Budowanie .exe (Windows)

```powershell
python build.py
```

Plik `.exe` zostanie utworzony w `dist/quiz_app.exe`.

## Struktura projektu

```
quiz_app/
├── app.py                  # Flask backend (6 endpointow API)
├── main.py                 # PyWebView wrapper (port 15001)
├── build.py                # Skrypt budowania .exe
├── quiz_config.json        # Konfiguracja quizow (typy, pliki pytan, opcje)
├── requirements.txt        # Zaleznosci Python
├── questions/
│   ├── typy_zmiennych.json # 75 pytan - typy zmiennych
│   ├── rozklady.json       # 30 pytan - rozklady prawdopodobienstwa
│   ├── testy.json          # 35 pytan - wybor testu statystycznego
│   ├── hipotezy.json       # 24 pytania - hipotezy H0/Ha
│   ├── interpretacja.json  # 20 pytan - interpretacja wynikow
│   └── errors_info.json    # Info o bledach interpretacyjnych
├── templates/
│   ├── menu.html           # Menu wyboru quizu
│   └── quiz.html           # Strona quizu
└── static/
    ├── style.css           # Style
    ├── script.js           # Logika quizu (fetch API)
    └── favicon.svg         # Ikona
```

## Konfiguracja quizow

Plik `quiz_config.json` definiuje dostepne quizy. Kazdy quiz ma:
- `id` - identyfikator uzywany w URL-ach API
- `name` - nazwa wyswietlana w menu
- `file` - plik z pytaniami w katalogu `questions/`
- `answer_type` - typ odpowiedzi (`multiple_choice_4`, `multiple_choice_3`, `multiple_choice_random`, `interpretation`)
- `options` (opcjonalnie) - stale opcje odpowiedzi
- `errors_file` (opcjonalnie) - plik z informacjami o bledach (quiz interpretacyjny)

## API Endpoints

### `GET /`
Menu glowne - lista quizow z `quiz_config.json`.

### `GET /quiz/<quiz_id>`
Strona quizu. Zwraca 404 jesli `quiz_id` nie istnieje w konfiguracji.

### `POST /api/quiz/<quiz_id>/start`
Inicjalizuje sesje quizu: losuje pytania, resetuje liczniki.

**Response:**
```json
{
  "success": true,
  "total_questions": 10
}
```

### `GET /api/quiz/<quiz_id>/next`
Zwraca kolejne pytanie (bez odpowiedzi `correct` i `explanation`).

**Response (quiz standardowy):**
```json
{
  "success": true,
  "finished": false,
  "question": {
    "id": 5,
    "question": "Liczba dzieci w rodzinie (0, 1, 2, 3, ...)",
    "options": ["Ilosciowa dyskretna", "Ilosciowa ciagla", "Jakosciowa porzadkowa", "Jakosciowa nominalna"]
  },
  "remaining": 9
}
```

**Response (quiz interpretacyjny):**
```json
{
  "success": true,
  "finished": false,
  "question": {
    "id": 1,
    "test_type": "t_jednej_proby",
    "context": "Badacz chce sprawdzic...",
    "results": ["Srednia w probie: 15.2 kg", "Wynik testu: t(29) = 2.34, p = 0.026"],
    "answers": [{"index": 0, "text": "Odrzucamy H0..."}]
  },
  "remaining": 9
}
```

**Response (koniec pytan):**
```json
{
  "success": true,
  "finished": true,
  "message": "Gratulacje! Przeszedles przez wszystkie pytania."
}
```

### `POST /api/quiz/<quiz_id>/check`
Sprawdza odpowiedz uzytkownika.

**Request (quiz standardowy):**
```json
{
  "question_id": 5,
  "answer": "ilosciowa_dyskretna"
}
```

**Request (quiz interpretacyjny):**
```json
{
  "question_id": 1,
  "answer_text": "Odrzucamy H0..."
}
```

**Response:**
```json
{
  "success": true,
  "correct": true,
  "explanation": "Wyjasnienie dlaczego ta odpowiedz jest poprawna.",
  "correct_answer": "ilosciowa_dyskretna"
}
```

### `GET /api/quiz/<quiz_id>/summary`
Zwraca podsumowanie wynikow sesji.

**Response:**
```json
{
  "success": true,
  "summary": {
    "total_questions": 10,
    "answered": 10,
    "correct": 7,
    "wrong": 3,
    "remaining": 0,
    "score_percent": 70.0
  }
}
```

### `GET /api/quiz-config`
Zwraca konfiguracje aktywnego quizu.

### `GET /api/quiz/<quiz_id>/errors-info`
Zwraca informacje o bledach interpretacyjnych (tylko dla quizu `interpretacja`).

## Dodawanie nowych pytan

1. Znajdz odpowiedni plik w `questions/` (np. `typy_zmiennych.json`)
2. Dodaj nowe pytanie w formacie:

**Quiz standardowy (typy_zmiennych, rozklady):**
```json
{
  "id": 76,
  "question": "Opis zmiennej (np. wartosci przykladowe)",
  "correct": "ilosciowa_dyskretna",
  "explanation": "Wyjasnienie dlaczego ta odpowiedz jest poprawna."
}
```

**Quiz z losowaniem opcji (testy, hipotezy):**
```json
{
  "id": 36,
  "question": "Opis sytuacji badawczej...",
  "correct": "Test t dla dwoch prob niezaleznych",
  "all_options": ["Test t dla dwoch prob niezaleznych", "ANOVA", "Test chi-kwadrat"],
  "explanation": "Wyjasnienie wyboru testu."
}
```

**Quiz interpretacyjny:**
```json
{
  "id": 21,
  "test_type": "t_jednej_proby",
  "context": "Kontekst badania...",
  "results": {"mean": 15.2, "sd": 3.1, "n": 30, "test_stat": "t(29) = 2.34", "p_value": "0.026"},
  "unit": "kg",
  "answers": [
    {"text": "Odrzucamy H0...", "correct": true, "feedback": "Poprawnie! Poniewaz p < 0.05..."},
    {"text": "Nie odrzucamy H0...", "correct": false, "feedback": "Niepoprawnie. p = 0.026 < 0.05..."}
  ]
}
```

3. Sprawdz poprawnosc skladni JSON
4. Przebuduj .exe: `python build.py`

## Technologie

- **Backend**: Flask 3.0+ (Python)
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Desktop**: PyWebView 5.0+ (native window)
- **Build**: PyInstaller 6.0+ (standalone .exe)

## Licencja

CC BY 4.0 (patrz [LICENSE](../../LICENSE) w katalogu glownym)
