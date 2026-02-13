# Statystyczne Zabawki

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)

Interaktywny podręcznik do nauki statystyki z osadzonymi aplikacjami Shiny. Quarto book + R Shiny Server — studenci otwierają stronę w przeglądarce, serwer liczy.

## Co to jest?

**Statystyczne Zabawki** to Quarto book (interaktywny skrypt wykładowy) z 5 aplikacjami R Shiny osadzonymi w rozdziałach. Każdy rozdział zawiera:

- Materiał wykładowy (wzory, definicje, interpretacje)
- Interaktywną aplikację do eksploracji koncepcji
- Callout-y z wskazówkami dla studentów

## Aplikacje

| Aplikacja | Rozdział | Co robi? |
|-----------|----------|----------|
| **Histogram** | Rozkład normalny | Generuj próbki, obserwuj histogram i krzywą teoretyczną |
| **Test Chi-Kwadrat** | Test niezależności | Eksploracja/własne dane, tabela kontyngencji, V Craméra |
| **Korelacja Pearsona** | Korelacja | Klikaj by dodawać punkty, regresja, odchylenia, wzór Pearsona |
| **Przedziały Ufności** | Przedziały ufności | Quiz z wizualizacją CI — interpretacja przedziałów |
| **Quiz Statystyczny** | Quizy | 5 quizów: zmienne, rozkłady, testy, hipotezy, interpretacja |

## Architektura

```
Serwer
├── nginx (port 80/443)
│   ├── /              → Quarto book (statyczny HTML)
│   └── /shiny/        → reverse proxy do Shiny Server
│
└── Shiny Server (port 3838)
    ├── histogram/app.R
    ├── chi_square/app.R
    ├── pearson/app.R
    ├── quiz/app.R
    └── ci/app.R
```

## Struktura repozytorium

```
statistical_toys/
├── book/                    # Quarto book
│   ├── _quarto.yml          # Konfiguracja booka
│   ├── index.qmd            # Strona tytułowa
│   ├── rozklad-normalny.qmd # Rozdział + embed histogram
│   ├── chi-kwadrat.qmd      # Rozdział + embed chi_square
│   ├── korelacja.qmd        # Rozdział + embed pearson
│   ├── przedzialy-ufnosci.qmd
│   ├── quizy.qmd
│   └── custom.css
│
├── apps/                    # Aplikacje Shiny
│   ├── shared/              # Wspólny kod
│   │   ├── theme.R          # bslib theme + CSS
│   │   └── helpers.R        # Funkcje pomocnicze
│   ├── histogram/app.R
│   ├── chi_square/app.R
│   ├── pearson/app.R
│   ├── quiz/app.R + data/
│   └── ci/app.R + data/
│
├── toys/                    # Stary kod Flask (archiwum/referencja)
├── DEPLOYMENT.md            # Instrukcja wdrożenia na serwerze
└── docs/TWORZENIE_ZABAWKI.md # Jak dodać nową zabawkę
```

## Uruchomienie lokalne

### Wymagania

- R >= 4.3
- Quarto >= 1.4
- Pakiety R: `shiny`, `bslib`, `plotly`, `jsonlite`, `htmlwidgets`, `htmltools`

```bash
# Instalacja pakietów R
Rscript -e 'install.packages(c("shiny", "bslib", "plotly", "jsonlite", "htmlwidgets", "htmltools"))'
```

### Podgląd Quarto book

```bash
cd book/
quarto preview
```

### Testowanie pojedynczej aplikacji Shiny

```bash
Rscript -e 'shiny::runApp("apps/histogram/")'
Rscript -e 'shiny::runApp("apps/chi_square/")'
Rscript -e 'shiny::runApp("apps/pearson/")'
Rscript -e 'shiny::runApp("apps/quiz/")'
Rscript -e 'shiny::runApp("apps/ci/")'
```

## Deployment

Instrukcja wdrożenia na serwerze uczelni (nginx + Shiny Server): [DEPLOYMENT.md](DEPLOYMENT.md)

## Technologie

- **R Shiny** — aplikacje interaktywne (server-side rendering)
- **Quarto** — podręcznik/book ze statycznym HTML
- **bslib** — Bootstrap 5 theme
- **plotly** — wykresy interaktywne
- **nginx** — reverse proxy
- **Shiny Server Open Source** — hosting aplikacji Shiny

## Licencja

Projekt na licencji [CC BY 4.0](LICENSE) — możesz swobodnie używać i udostępniać, pod warunkiem podania autorstwa.

## Autor

Maciej Karczewski, Uniwersytet Przyrodniczy we Wrocławiu
