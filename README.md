# Statystyczne Zabawki

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)

System modułowych interaktywnych aplikacji do nauki statystyki. Każda "zabawka" to samodzielna aplikacja desktopowa (.exe), którą studenci mogą pobrać i uruchomić bez instalacji R czy Pythona.

## Wizja Projektu

Celem jest stworzenie biblioteki małych, łatwych w użyciu narzędzi edukacyjnych, które:
- **Działają offline** - studenci pobierają i uruchamiają lokalnie
- **Nie wymagają instalacji** - jeden plik .exe, zero konfiguracji
- **Są interaktywne** - suwaki, parametry, live wykresy
- **Uczą przez eksplorację** - wizualizacja pojęć statystycznych

## Architektura

Każda zabawka to aplikacja zbudowana w stacku:
- **Backend**: Python + Flask (logika, obliczenia statystyczne)
- **Frontend**: HTML/CSS/JavaScript + Plotly.js (UI, wykresy)
- **Wrapper**: PyWebView (natywne okno aplikacji)
- **Deployment**: PyInstaller (pakowanie do .exe dla Windows)

Aplikacje są:
- **Modułowe** - każda zabawka to osobny folder w `toys/`
- **Niezależne** - osobne .exe, można pobrać tylko jedną
- **Rozszerzalne** - łatwo dodać nowe

## Struktura Projektu

```
statistical_toys/
├── toys/                   # Katalog z zabawkami
│   ├── histogram/          # Przykładowa zabawka
│   │   ├── app.py          # Flask backend
│   │   ├── main.py         # PyWebView wrapper
│   │   ├── templates/      # HTML UI
│   │   ├── static/         # CSS, JS
│   │   └── requirements.txt
│   └── ...                 # Przyszłe zabawki
├── build/                  # Skrypty do budowania .exe
├── docs/                   # Dokumentacja
│   ├── TWORZENIE_ZABAWKI.md  # Jak stworzyć nową zabawkę
│   └── ...
├── README.md               # Ten plik
└── requirements.txt        # Globalne zależności
```

## Dostępne Zabawki

| Zabawka | Opis | Pobierz |
|---------|------|---------|
| **Histogram** | Wizualizacja wpływu parametrów (n, μ, σ) na kształt histogramu | [Releases](../../releases) |
| **Quiz Statystyczny** | Quiz z 3 trybami: typy zmiennych, rozkłady, wybór testu | [Releases](../../releases) |
| **Przedziały Ufności** | Interaktywna nauka interpretacji przedziałów ufności | [Releases](../../releases) |

### Przyszłe Pomysły
- Test t-Studenta (wizualizacja mocy testu)
- Centralne Twierdzenie Graniczne (symulacja)
- Regresja liniowa (interaktywne dopasowanie)

## Pobieranie

### Dla Studentów (Windows)

1. Przejdź do **[Releases](../../releases)** → kliknij najnowszą wersję
2. Pobierz plik `.exe` dla interesującej Cię zabawki
3. Dwuklik na pobranym pliku - otwiera się okno aplikacji
4. Eksploruj!

**💡 Tip**: Link do najnowszej wersji: [github.com/.../releases/latest](../../releases/latest)

**⚠️ Uwaga Windows**: Przy pierwszym uruchomieniu może pojawić się ostrzeżenie SmartScreen (aplikacja nie jest podpisana certyfikatem). Kliknij **"Więcej informacji"** → **"Uruchom mimo to"**.

### Dla Mac/Linux

Obecnie nie ma gotowych buildów dla Mac/Linux. Możesz uruchomić aplikacje z kodu źródłowego:

```bash
cd toys/nazwa_zabawki
pip install -r requirements.txt
python main.py
```

## Dla Developerów

### Wymagania

- Python 3.10+
- Git
- Podstawowa znajomość HTML/CSS/JavaScript (dla frontendu)

### Jak Stworzyć Nową Zabawkę

Szczegółowa instrukcja krok po kroku znajduje się w [docs/TWORZENIE_ZABAWKI.md](docs/TWORZENIE_ZABAWKI.md).

### Szybki Start

1. Sklonuj repo i zainstaluj zależności:
```bash
git clone https://github.com/your-username/statistical_toys.git
cd statistical_toys
pip install -r requirements.txt
```

2. Stwórz nową zabawkę w `toys/nazwa_zabawki/`
3. Testuj lokalnie:
```bash
cd toys/nazwa_zabawki
python main.py
```

4. Zbuduj .exe:
```bash
pyinstaller --onefile --windowed main.py
```

## Roadmap

### Faza 1: Fundament (w trakcie)
- [x] Setup projektu
- [x] Dokumentacja architektury
- [ ] Pierwsza zabawka (histogram)
- [ ] Pipeline budowania .exe
- [ ] Dokumentacja dla studentów

### Faza 2: Rozbudowa
- [ ] 3-5 podstawowych zabawek
- [ ] Testy użytkownika (feedback od studentów)
- [ ] Iteracja na podstawie feedbacku

### Faza 3: Przyszłość (opcjonalnie)
- [ ] Wersje online (gdy dostępny serwer)
- [ ] Wersje dla Mac/Linux
- [ ] Zaawansowane zabawki (modele mieszane, Bayesian, etc.)

## Możliwości Technologiczne

Rozważane były różne podejścia:
- **PyWebView** (wybrane) - balans prostoty i możliwości
- **Pure HTML/JS** - maksymalnie proste, ale ograniczone
- **Electron** - profesjonalne, ale zbyt ciężkie
- **Shiny Server** (przyszłość) - gdy dostępny serwer z R

Pełna analiza wszystkich opcji (offline i online) znajduje się w osobnym dokumencie dla przyszłej referencji.

## Licencja

Ten projekt jest udostępniony na licencji [Creative Commons Attribution 4.0 International (CC BY 4.0)](LICENSE).

Możesz swobodnie:
- **Udostępniać** — kopiować i rozpowszechniać materiał
- **Adaptować** — zmieniać, przekształcać i tworzyć na jego podstawie

Pod warunkiem **podania autorstwa**.

## Kontakt

Projekt tworzony dla potrzeb dydaktycznych. Feedback i sugestie mile widziane!
