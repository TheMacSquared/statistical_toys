# TODO — Statystyczne Zabawki

## Otwarte

- [ ] **Odchudzić apki dla kontekstu book** — gdy app jest osadzona w rozdziale Quarto, tekst wokół już tłumaczy teorię. Usunąć zduplikowane panele/statystyki. Chi-kwadrat jako pierwszy kandydat. `[apps/]`
- [ ] **Redesign graficzny appek** — nie trzymać się starego looku Flask. Wykorzystać możliwości ggplot2/plotly w R. Przemyśleć co lepiej pasuje do kontekstu podręcznika. `[apps/]`
- [ ] **Oprawa wizualna portalu** — motyw Quarto book (kolory, typografia, branding) jest placeholder (flatly). Do zaprojektowania od nowa. `[book/_quarto.yml, book/custom.css]`

## Zrobione

- [x] Migracja 5 appek Flask → R Shiny
- [x] Quarto book szkielet + treść wykładowa
- [x] Shared bslib theme + helpers
- [x] DEPLOYMENT.md
- [x] Aktualizacja dokumentacji (README, TWORZENIE_ZABAWKI)
- [x] Fix Sass clamp()/calc() — interpolacja `#{'...'}`
- [x] Lokalny test portalu (quarto preview + 5 Shiny apps)
