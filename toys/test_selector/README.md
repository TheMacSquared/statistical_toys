# Test Selector - Przewodnik wyboru testu

Interaktywna aplikacja typu wizard, która prowadzi krok po kroku przez drzewo wyboru testu statystycznego i pomaga zapisać hipotezy H0/Ha.

## Co robi aplikacja

- prowadzi przez drzewo decyzji (jedna zmienna / dwie zmienne)
- rekomenduje test podstawowy
- pokazuje alternatywy przy naruszeniu założeń (normalność, wariancja)
- wyświetla gotowe szablony hipotez
- podaje przykład problemu i listę założeń
- zawiera dwa widoki UI: `wizard` (`/`) i `interaktywne drzewo` (`/tree-ui`)

## Zakres testów

- test t dla jednej próby
- test proporcji (z) i dokładny test dwumianowy
- test chi-kwadrat niezależności i test Fishera
- test t Studenta / test t Welcha / test Manna-Whitneya U
- test t dla prób zależnych / Wilcoxon signed-rank
- ANOVA jednoczynnikowa / ANOVA Welcha / Kruskal-Wallis
- korelacja Pearsona / Spearmana

## Uruchomienie (development)

```bash
cd toys/test_selector
pip install -r requirements.txt
python3 main.py
```

Aplikacja uruchamia lokalny serwer Flask na porcie `15006` i otwiera okno PyWebView.

## Build `.exe`

```bash
cd toys/test_selector
python3 build.py
```

Wynik: `dist/test_selector.exe`

## API

- `GET /api/tree` - zwraca drzewo decyzyjne
- `POST /api/resolve` - mapuje `answers` na wynik
- `POST /api/reset` - resetuje sesję wizarda
- `GET /api/health` - prosty health-check

## Pliki kluczowe

- `tree_config.json` - definicje pytań, reguły i szablony hipotez
- `app.py` - backend Flask + engine wyboru reguły
- `templates/index.html` - UI wizarda
- `static/script.js` - logika frontendu
- `static/style.css` - style aplikacji
