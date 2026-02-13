# Deployment — Statystyczne Zabawki

Instrukcja wdrożenia Quarto book + Shiny Server na serwerze uczelnianym.

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

## 1. Wymagania systemowe

- Ubuntu 22.04+ / Debian 12+
- R >= 4.3
- Quarto >= 1.4
- nginx
- Shiny Server Open Source

## 2. Instalacja R i pakietów

```bash
# Instalacja R (jeśli nie zainstalowany)
sudo apt install r-base r-base-dev

# Instalacja wymaganych pakietów R
sudo Rscript -e '
install.packages(c(
  "shiny",
  "bslib",
  "plotly",
  "jsonlite",
  "htmlwidgets",
  "htmltools"
), repos = "https://cloud.r-project.org")
'
```

## 3. Instalacja Shiny Server

```bash
# Pobierz i zainstaluj Shiny Server
# (sprawdź aktualną wersję na: https://posit.co/download/shiny-server/)
wget https://download3.rstudio.org/ubuntu-18.04/x86_64/shiny-server-1.5.22.1017-amd64.deb
sudo dpkg -i shiny-server-*.deb
sudo apt-get install -f  # rozwiąż zależności
```

## 4. Konfiguracja Shiny Server

Edytuj `/etc/shiny-server/shiny-server.conf`:

```
run_as shiny;

server {
  listen 3838;

  location / {
    site_dir /srv/shiny-server;
    log_dir /var/log/shiny-server;
    directory_index on;
  }
}
```

## 5. Deploy aplikacji Shiny

```bash
# Skopiuj aplikacje do katalogu Shiny Server
sudo cp -r apps/histogram /srv/shiny-server/
sudo cp -r apps/chi_square /srv/shiny-server/
sudo cp -r apps/pearson /srv/shiny-server/
sudo cp -r apps/quiz /srv/shiny-server/
sudo cp -r apps/ci /srv/shiny-server/

# Skopiuj shared (współdzielony kod)
sudo cp -r apps/shared /srv/shiny-server/

# Ustaw uprawnienia
sudo chown -R shiny:shiny /srv/shiny-server/
```

## 6. Render Quarto book

```bash
# Instalacja Quarto (jeśli nie zainstalowany)
# https://quarto.org/docs/get-started/

# Render booka
cd book/
quarto render

# Wynik: book/_book/ (statyczny HTML)
```

## 7. Konfiguracja nginx

Edytuj `/etc/nginx/sites-available/statistical-toys`:

```nginx
server {
    listen 80;
    server_name your-domain.edu.pl;

    # Quarto book (statyczny HTML)
    root /var/www/statistical-toys;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Reverse proxy do Shiny Server
    location /shiny/ {
        rewrite ^/shiny/(.*)$ /$1 break;
        proxy_pass http://localhost:3838;
        proxy_redirect / /shiny/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 20d;
        proxy_buffering off;
    }
}
```

```bash
# Aktywuj konfigurację
sudo ln -s /etc/nginx/sites-available/statistical-toys /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Skopiuj Quarto book
sudo mkdir -p /var/www/statistical-toys
sudo cp -r book/_book/* /var/www/statistical-toys/
```

## 8. Uruchomienie

```bash
# Uruchom Shiny Server
sudo systemctl start shiny-server
sudo systemctl enable shiny-server

# Sprawdź status
sudo systemctl status shiny-server
```

## 9. Weryfikacja

- Quarto book: `http://your-domain.edu.pl/`
- Shiny histogram: `http://your-domain.edu.pl/shiny/histogram/`
- Shiny chi_square: `http://your-domain.edu.pl/shiny/chi_square/`
- Shiny pearson: `http://your-domain.edu.pl/shiny/pearson/`
- Shiny quiz: `http://your-domain.edu.pl/shiny/quiz/`
- Shiny CI: `http://your-domain.edu.pl/shiny/ci/`

## 10. Logi

```bash
# Logi Shiny Server
sudo tail -f /var/log/shiny-server/*.log

# Logi nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Testowanie lokalne

```bash
# Podgląd Quarto book
cd book/
quarto preview

# Testowanie pojedynczej aplikacji Shiny
Rscript -e 'shiny::runApp("apps/histogram/")'
```
