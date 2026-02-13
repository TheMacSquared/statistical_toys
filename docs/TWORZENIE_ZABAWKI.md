# Tworzenie Nowej Zabawki — Instrukcja

Jak dodać nową interaktywną aplikację Shiny do projektu Statystyczne Zabawki.

## Spis Treści

1. [Wymagania](#wymagania)
2. [Architektura](#architektura)
3. [Krok 1: Struktura plików](#krok-1-struktura-plików)
4. [Krok 2: app.R — UI](#krok-2-appr--ui)
5. [Krok 3: app.R — Server](#krok-3-appr--server)
6. [Krok 4: Testowanie lokalne](#krok-4-testowanie-lokalne)
7. [Krok 5: Rozdział w Quarto book](#krok-5-rozdział-w-quarto-book)
8. [Krok 6: Deploy](#krok-6-deploy)
9. [Wspólny theme i helpery](#wspólny-theme-i-helpery)
10. [Best Practices](#best-practices)

---

## Wymagania

### Software
- **R >= 4.3** — [cran.r-project.org](https://cran.r-project.org/)
- **Quarto >= 1.4** — [quarto.org](https://quarto.org/docs/get-started/)
- Pakiety R: `shiny`, `bslib`, `plotly`, `jsonlite`, `htmlwidgets`, `htmltools`

```bash
Rscript -e 'install.packages(c("shiny", "bslib", "plotly", "jsonlite", "htmlwidgets", "htmltools"))'
```

### Umiejętności
- Podstawowa znajomość R (funkcje, listy, data.frame)
- Podstawy Shiny (reactive, renderPlotly, observeEvent)
- Podstawy Quarto (pliki .qmd, YAML header)

---

## Architektura

Każda zabawka to samodzielna aplikacja Shiny (`app.R`) osadzona w rozdziale Quarto book przez iframe:

```
Quarto book (statyczny HTML)
│
├── rozdzial.qmd
│   └── <iframe src="/shiny/nazwa_zabawki/">
│
Shiny Server (port 3838)
│
└── nazwa_zabawki/
    └── app.R  ← UI + Server w jednym pliku
```

**Przepływ:**
1. Student otwiera rozdział w przeglądarce
2. Iframe ładuje aplikację Shiny z serwera
3. Student zmienia parametry (suwaki, przyciski, kliknięcia)
4. Shiny Server przelicza po stronie serwera
5. Przeglądarka wyświetla zaktualizowany wykres/wynik

---

## Krok 1: Struktura plików

```bash
mkdir apps/nazwa_zabawki
```

Minimalna struktura:

```
apps/nazwa_zabawki/
└── app.R              # Cała logika (UI + Server)
```

Z danymi JSON (jak quiz, CI):

```
apps/nazwa_zabawki/
├── app.R
└── data/
    └── pytania.json
```

---

## Krok 2: app.R — UI

Każda zabawka używa wspólnego theme z `apps/shared/theme.R`:

```r
library(shiny)
library(plotly)
library(bslib)

# Wspólny theme i helpery
source(file.path("..", "shared", "theme.R"), local = TRUE)
source(file.path("..", "shared", "helpers.R"), local = TRUE)

ui <- page_fluid(
  theme = st_theme(),       # Wspólny motyw Bootstrap 5
  class = "st-page",        # Klasa CSS z theme.R

  div(class = "st-card st-card--wide",

    # Header
    div(class = "st-header",
      h1("Nazwa Zabawki"),
      p("Krótki opis co robi")
    ),

    # Layout: sidebar + main
    layout_columns(
      col_widths = c(3, 9),
      fill = FALSE,

      # Sidebar — parametry
      div(class = "st-sidebar",
        h3("Parametry"),

        sliderInput("param1", "Parametr 1",
          min = 1, max = 100, value = 50
        ),

        numericInput("param2", "Parametr 2",
          value = 0, step = 0.1
        ),

        actionButton("regenerate", "Regeneruj",
          class = "st-btn-primary", style = "width: 100%;"
        )
      ),

      # Main — wykres + statystyki
      div(
        div(style = "background: #f8fafc; border-radius: 14px; padding: 16px;",
          plotlyOutput("main_plot", height = "450px")
        ),

        div(class = "st-stats",
          h3("Wyniki"),
          layout_columns(
            col_widths = c(4, 4, 4),
            div(class = "st-stat-item",
              span(class = "st-stat-label", "STATYSTYKA"),
              span(class = "st-stat-value", textOutput("stat1", inline = TRUE))
            )
            # ... więcej statystyk
          )
        )
      )
    )
  )
)
```

### Dostępne klasy CSS (z `theme.R`)

| Klasa | Zastosowanie |
|-------|-------------|
| `st-page` | Główny kontener strony |
| `st-card`, `st-card--wide` | Karta (panel) |
| `st-header` | Nagłówek z tytułem |
| `st-sidebar` | Panel boczny z parametrami |
| `st-stats`, `st-stat-item` | Panel statystyk |
| `st-btn-primary`, `st-btn-ghost` | Przyciski |
| `st-answer-grid`, `st-btn-answer` | Quizy — siatka odpowiedzi |
| `st-question`, `st-feedback` | Quizy — pytanie i feedback |
| `st-menu-grid`, `st-menu-card` | Menu wyboru trybu |
| `st-warning` | Ostrzeżenie |

---

## Krok 3: app.R — Server

```r
server <- function(input, output, session) {

  # Reaktywne dane z debounce (300ms)
  params <- reactive({
    list(
      param1 = input$param1,
      param2 = input$param2
    )
  }) |> debounce(300)

  # Obliczenia
  result <- reactive({
    p <- params()
    # ... logika obliczeniowa
    list(data = rnorm(p$param1), stat = mean(rnorm(p$param1)))
  })

  # Wykres plotly
  output$main_plot <- renderPlotly({
    r <- result()
    req(r)

    plot_ly() |>
      add_bars(x = ~seq_along(r$data), y = ~r$data) |>
      layout(
        xaxis = list(title = "X"),
        yaxis = list(title = "Y"),
        plot_bgcolor = "#f8fafc",
        paper_bgcolor = "#f8fafc"
      ) |>
      config(responsive = TRUE, displayModeBar = FALSE)
  })

  # Statystyki
  output$stat1 <- renderText({
    r <- result(); req(r)
    formatC(r$stat, format = "f", digits = 3)
  })
}

shinyApp(ui = ui, server = server)
```

### Wzorce z istniejących zabawek

| Wzorzec | Przykład | Plik referencyjny |
|---------|----------|-------------------|
| Prosty slider → wykres | Histogram | `apps/histogram/app.R` |
| Dwa tryby (exploration/custom) | Chi-kwadrat | `apps/chi_square/app.R` |
| Click-to-add na wykresie | Korelacja | `apps/pearson/app.R` |
| Quiz z ekranami (menu→pytanie→podsumowanie) | Quiz, CI | `apps/quiz/app.R`, `apps/ci/app.R` |
| Ładowanie danych z JSON | Quiz, CI | `load_app_json()` w `helpers.R` |

---

## Krok 4: Testowanie lokalne

```bash
# Z głównego katalogu projektu
Rscript -e 'shiny::runApp("apps/nazwa_zabawki/")'
```

Aplikacja otworzy się w przeglądarce (domyślnie http://127.0.0.1:xxxx).

### Checklist testowania

- [ ] Suwaki/przyciski działają
- [ ] Wykres się aktualizuje
- [ ] Statystyki się przeliczają
- [ ] Brak błędów w konsoli R
- [ ] Responsywność — Chrome DevTools → toggle device toolbar → 360px szerokości
- [ ] Touch targets >= 48px (telefony)

---

## Krok 5: Rozdział w Quarto book

Stwórz plik `book/nazwa-rozdzialu.qmd`:

```markdown
---
title: "Tytuł Rozdziału"
---

## Treść wykładowa

Tekst z teorią, wzorami, definicjami...

$$
\text{wzór} = \frac{a}{b}
$$

::: {.callout-tip}
## Wypróbuj samodzielnie
Zmień parametry i obserwuj co się dzieje.
:::

```{=html}
<iframe src="/shiny/nazwa_zabawki/"
        width="100%" height="700px"
        frameborder="0"
        style="border: 1px solid #e2e8f0; border-radius: 8px;">
</iframe>
```

Dalszy tekst z interpretacją...
```

Dodaj rozdział do `book/_quarto.yml`:

```yaml
book:
  chapters:
    - index.qmd
    # ... istniejące rozdziały
    - nazwa-rozdzialu.qmd   # ← nowy
```

---

## Krok 6: Deploy

Po przetestowaniu lokalnie:

1. Skopiuj aplikację na serwer:
   ```bash
   sudo cp -r apps/nazwa_zabawki /srv/shiny-server/
   sudo chown -R shiny:shiny /srv/shiny-server/nazwa_zabawki
   ```

2. Wyrenderuj Quarto book:
   ```bash
   cd book/
   quarto render
   sudo cp -r _book/* /var/www/statistical-toys/
   ```

3. Sprawdź:
   - Shiny app: `http://domena/shiny/nazwa_zabawki/`
   - Rozdział: `http://domena/nazwa-rozdzialu.html`

Pełna instrukcja serwera: [DEPLOYMENT.md](../DEPLOYMENT.md)

---

## Wspólny theme i helpery

### `apps/shared/theme.R`

Funkcja `st_theme()` zwraca bslib Bootstrap 5 theme z pełnym zestawem CSS. Używaj zawsze:

```r
ui <- page_fluid(
  theme = st_theme(),
  class = "st-page",
  # ...
)
```

### `apps/shared/helpers.R`

| Funkcja | Opis |
|---------|------|
| `safe_numeric(val)` | Konwersja na liczbę, NULL dla NaN/Inf |
| `format_pvalue(p)` | Formatowanie p-value (< 0.001 itd.) |
| `safe_round(val, digits)` | Zaokrąglanie z ochroną przed NULL/NA |
| `load_app_json(app_dir, filename)` | Wczytaj JSON z `data/` aplikacji |

---

## Best Practices

### UI/UX
- **Mobile-first** — studenci głównie na telefonach
- Responsywny layout: `layout_columns()` z bslib
- Minimalne target size 48px dla przycisków (touch)
- Plotly: `config(responsive = TRUE, displayModeBar = FALSE)`
- Sensowne wartości domyślne parametrów

### Wydajność
- `debounce(300)` na reaktywnych parametrach (unikaj zbyt częstych przeliczeń)
- Plotly zamiast ggplot2 (interaktywność bez dodatkowego kodu)
- Nie generuj więcej danych niż potrzeba (max 10000 punktów)

### Organizacja kodu
- Cała logika w jednym `app.R` (UI + Server)
- Wspólny theme: `source("../shared/theme.R")`
- Dane zewnętrzne (pytania, konfiguracja) w `data/*.json`
- Walidacja inputów: `req()`, `safe_numeric()`

### Nazewnictwo
- Folder aplikacji: `snake_case` (np. `chi_square`, `nazwa_zabawki`)
- Plik Quarto: `kebab-case` (np. `chi-kwadrat.qmd`)
- ID inputów Shiny: `snake_case` (np. `input$bin_width`)

---

## Przykład referencyjny

Najprostszy kompletny przykład: `apps/histogram/app.R` (~270 linii).

Dla quizu/ekranów: `apps/quiz/app.R` lub `apps/ci/app.R`.
