# Wspólne funkcje pomocnicze dla Statystycznych Zabawek

#' Bezpieczna konwersja na liczbę - zwraca NULL dla NaN/Inf
safe_numeric <- function(val) {
  if (is.null(val) || length(val) == 0) return(NULL)
  val <- as.numeric(val)
  if (is.na(val) || is.nan(val) || is.infinite(val)) return(NULL)
  val
}

#' Formatowanie p-value
format_pvalue <- function(p) {
  if (is.null(p) || is.na(p)) return("-")
  if (p < 0.001) return("< 0.001")
  formatC(p, format = "f", digits = 4)
}

#' Zaokrąglanie z ochroną przed NULL/NA
safe_round <- function(val, digits = 4) {
  if (is.null(val) || is.na(val) || is.nan(val) || is.infinite(val)) return(0)
  round(val, digits)
}

#' Wczytywanie JSON z katalogu data/ aplikacji
load_app_json <- function(app_dir, filename) {
  path <- file.path(app_dir, "data", filename)
  jsonlite::fromJSON(path, simplifyVector = FALSE)
}
