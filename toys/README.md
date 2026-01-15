# Zabawki Statystyczne

Ten katalog zawiera wszystkie interaktywne zabawki. Każda zabawka to oddzielny folder z kompletną aplikacją.

## Struktura

Każda zabawka powinna mieć następującą strukturę:

```
toys/nazwa_zabawki/
├── app.py              # Flask backend (logika, obliczenia)
├── main.py             # PyWebView wrapper (uruchamia aplikację)
├── requirements.txt    # Zależności Pythona
├── README.md           # Opis zabawki
├── templates/
│   └── index.html      # UI (interfejs użytkownika)
└── static/
    ├── style.css       # Style
    └── script.js       # Logika JavaScript
```

## Dostępne Zabawki

### Planowane
- [ ] **histogram** - Histogram z rozkładem normalnym

### Przyszłe Pomysły
- Test t-Studenta
- Centralne Twierdzenie Graniczne
- Regresja liniowa
- Porównanie rozkładów prawdopodobieństwa
- ANOVA wizualizacja
- Power analysis
- Bootstrap
- Testy nieparametryczne

## Jak Dodać Nową Zabawkę

1. Przeczytaj [../docs/TWORZENIE_ZABAWKI.md](../docs/TWORZENIE_ZABAWKI.md)
2. Stwórz nowy folder `toys/nazwa_zabawki/`
3. Użyj struktury opisanej powyżej
4. Testuj lokalnie: `cd toys/nazwa_zabawki && python main.py`
5. Zbuduj .exe: `python build.py`
6. Dodaj do listy powyżej

## Zasady

- Każda zabawka jest **niezależna** - oddzielny .exe
- Każda zabawka ma własny `requirements.txt`
- Dokumentuj co zabawka robi (README w folderze zabawki)
- Testuj przed budowaniem .exe
- Używaj sensownych domyślnych wartości parametrów
