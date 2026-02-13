# Test Chi-Kwadrat Niezaleznosci (Shiny app)
# Port z toys/chi_square/ (Flask + Plotly.js)

library(shiny)
library(plotly)
library(bslib)

source(file.path("..", "shared", "theme.R"), local = TRUE)
source(file.path("..", "shared", "helpers.R"), local = TRUE)

# ============================================================
# PRESETS
# ============================================================
PRESETS <- list(
  independent = list(
    rowLabels = c("Kobiety", "Mezczyzni"),
    colLabels = c("Zadowolony", "Niezadowolony"),
    rowPercentages = list(c(60, 40), c(60, 40)),
    sampleSize = 200, rowSplitPct = 50
  ),
  weak = list(
    rowLabels = c("Kobiety", "Mezczyzni"),
    colLabels = c("Zadowolony", "Niezadowolony"),
    rowPercentages = list(c(60, 40), c(50, 50)),
    sampleSize = 200, rowSplitPct = 50
  ),
  strong = list(
    rowLabels = c("Kobiety", "Mezczyzni"),
    colLabels = c("Zadowolony", "Niezadowolony"),
    rowPercentages = list(c(75, 25), c(30, 70)),
    sampleSize = 200, rowSplitPct = 50
  ),
  medicine = list(
    rowLabels = c("Lek", "Placebo"),
    colLabels = c("Poprawa", "Brak poprawy"),
    rowPercentages = list(c(70, 30), c(40, 60)),
    sampleSize = 300, rowSplitPct = 50
  )
)

ROW_COLORS <- c("#6366f1", "#f59e0b", "#22c55e", "#ef4444")

# ============================================================
# HELPER: generate table from percentages (mirrors Flask backend)
# ============================================================
generate_from_percentages <- function(row_percentages, n, row_split_pct) {
  nRows <- length(row_percentages)
  nCols <- length(row_percentages[[1]])

  # Normalize row_split to sum to 1
  row_split <- rep(row_split_pct / 100, nRows)
  if (nRows == 2) {
    row_split <- c(row_split_pct / 100, 1 - row_split_pct / 100)
  } else {
    row_split <- rep(1 / nRows, nRows)
  }
  row_split <- row_split / sum(row_split)

  # Compute row totals

  row_totals <- round(n * row_split)
  row_totals[nRows] <- n - sum(row_totals[-nRows])

  # Generate counts per row
  table_mat <- matrix(0L, nrow = nRows, ncol = nCols)
  for (i in seq_len(nRows)) {
    pcts <- row_percentages[[i]]
    pcts_norm <- pcts / sum(pcts) * 100
    counts <- round(row_totals[i] * pcts_norm / 100)
    counts[nCols] <- row_totals[i] - sum(counts[-nCols])
    table_mat[i, ] <- pmax(counts, 0)
  }

  table_mat
}

# ============================================================
# HELPER: compute chi-square results
# ============================================================
compute_chi_square <- function(table_mat, alpha) {
  # Basic validation
  if (any(is.na(table_mat)) || any(is.nan(table_mat)) || any(is.infinite(table_mat))) {
    return(list(error = "Tabela zawiera niepoprawne wartosci"))
  }
  if (any(table_mat < 0)) {
    return(list(error = "Wartosci nie moga byc ujemne"))
  }
  if (sum(table_mat) == 0) {
    return(list(error = "Tabela nie moze byc pusta"))
  }
  if (any(rowSums(table_mat) == 0)) {
    return(list(error = "Suma wiersza nie moze byc zerowa"))
  }
  if (any(colSums(table_mat) == 0)) {
    return(list(error = "Suma kolumny nie moze byc zerowa"))
  }

  res <- tryCatch({
    ct <- chisq.test(table_mat, correct = FALSE)
    chi2 <- ct$statistic[[1]]
    df <- ct$parameter[[1]]
    p_value <- ct$p.value
    expected <- ct$expected

    critical_value <- qchisq(1 - alpha, df)

    n <- sum(table_mat)
    min_dim <- min(nrow(table_mat) - 1, ncol(table_mat) - 1)
    cramers_v <- if (min_dim > 0 && n > 0) sqrt(chi2 / (n * min_dim)) else 0

    contributions <- (table_mat - expected)^2 / expected

    warnings_list <- character(0)
    if (any(expected < 5)) {
      warnings_list <- c(warnings_list,
        "Uwaga: niektorze wartosci oczekiwane sa mniejsze niz 5. Wynik testu moze byc niewiarygodny.")
    }

    list(
      success = TRUE,
      chi_square = safe_round(chi2, 4),
      df = as.integer(df),
      p_value = p_value,
      critical_value = safe_round(critical_value, 4),
      significant = !is.na(p_value) && p_value < alpha,
      cramers_v = safe_round(cramers_v, 4),
      expected = expected,
      contributions = contributions,
      warnings = warnings_list
    )
  }, error = function(e) {
    list(success = FALSE, error = conditionMessage(e))
  })

  res
}

# ============================================================
# UI
# ============================================================
ui <- page_fluid(
  theme = st_theme(),
  class = "st-page",

  # Extra CSS for chi-square specific layout

  tags$style(HTML("
    .chi-mode-toggle { display: flex; gap: 8px; margin-bottom: 16px; }
    .chi-mode-toggle .btn { flex: 1; }
    .chi-preset-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .chi-slider-row { margin-bottom: 16px; padding: 12px; background: #fff; border-radius: 8px;
                      border: 1px solid var(--st-color-border); }
    .chi-slider-row__title { font-weight: 600; margin-bottom: 8px; color: var(--st-color-text); font-size: 0.9rem; }
    .chi-pct-computed { font-size: 0.85rem; color: var(--st-color-text-muted); margin-top: 4px; font-style: italic; }
    .chi-dim-row { display: flex; gap: 12px; margin-bottom: 16px; }
    .chi-dim-row .form-group { flex: 1; margin-bottom: 0; }
    .chi-label-input { width: 100%; border: 1px solid var(--st-color-border); border-radius: 6px;
                       padding: 4px 8px; font-size: 0.85rem; text-align: center; }
    .chi-color-legend { font-size: 0.75rem; color: var(--st-color-text-muted); margin-bottom: 8px; }
    .chi-color-legend span { padding: 1px 6px; border-radius: 3px; }
    .chi-toggle-row { display: flex; align-items: center; justify-content: space-between;
                      flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
  ")),

  div(class = "st-card st-card--wide",

    # Header
    div(class = "st-header",
      h1("Test Chi-Kwadrat Niezaleznosci"),
      p("Zbadaj relacje miedzy rozkladem w tabeli a wynikiem testu statystycznego")
    ),

    # 2-column layout
    layout_columns(
      col_widths = c(3, 9),
      fill = FALSE,

      # ---- SIDEBAR ----
      div(class = "st-sidebar",
        h3("Tryb"),

        # Mode toggle
        div(class = "chi-mode-toggle",
          actionButton("btn_exploration", "Eksploracja",
            class = "st-btn-primary", style = "flex: 1;"),
          actionButton("btn_custom", "Wlasne dane",
            class = "st-btn-secondary", style = "flex: 1;")
        ),

        # --- Exploration controls ---
        conditionalPanel(
          condition = "output.current_mode == 'exploration'",

          h3("Rozklad procentowy"),
          uiOutput("slider_controls"),

          sliderInput("param_n", "Wielkosc proby (N)",
            min = 50, max = 2000, value = 200, step = 10),

          sliderInput("param_split", "Podzial wierszy (%)",
            min = 10, max = 90, value = 50, step = 5),

          h3("Scenariusze"),
          div(class = "chi-preset-group",
            actionButton("preset_independent", "Brak zaleznosci",
              class = "st-btn-secondary", style = "width: 100%;"),
            actionButton("preset_weak", "Slaba zaleznosc",
              class = "st-btn-secondary", style = "width: 100%;"),
            actionButton("preset_strong", "Silna zaleznosc",
              class = "st-btn-secondary", style = "width: 100%;"),
            actionButton("preset_medicine", "Lek vs placebo",
              class = "st-btn-secondary", style = "width: 100%;")
          )
        ),

        # --- Custom controls ---
        conditionalPanel(
          condition = "output.current_mode == 'custom'",

          h3("Wymiary tabeli"),
          div(class = "chi-dim-row",
            numericInput("param_rows", "Wiersze", value = 2, min = 2, max = 10, step = 1),
            numericInput("param_cols", "Kolumny", value = 2, min = 2, max = 10, step = 1)
          )
        ),

        # --- Common controls ---
        selectInput("param_alpha", "Poziom istotnosci (alpha)",
          choices = c("0.01" = 0.01, "0.05" = 0.05, "0.10" = 0.10),
          selected = 0.05),

        checkboxInput("show_expected", "Pokaz wartosci oczekiwane", value = TRUE)
      ),

      # ---- MAIN CONTENT ----
      div(
        # Warnings
        uiOutput("warnings_box"),

        # Contingency table
        div(style = "margin-bottom: 24px;",
          div(class = "chi-toggle-row",
            h3("Tabela kontyngencji", style = "margin: 0;"),
            div(class = "chi-color-legend",
              span(style = "background: rgba(239,68,68,0.3);",
                HTML("&#9650; obs. &gt; ocz.")),
              " ",
              span(style = "background: rgba(99,102,241,0.3);",
                HTML("&#9660; obs. &lt; ocz."))
            )
          ),
          uiOutput("contingency_table")
        ),

        # Stats panel
        div(class = "st-stats",
          h3("Wynik testu Chi-kwadrat"),
          layout_columns(
            col_widths = c(3, 2, 3, 2, 12),
            div(class = "st-stat-item",
              span(class = "st-stat-label", HTML("&chi;&sup2; (chi-kwadrat)")),
              span(class = "st-stat-value", textOutput("stat_chi2", inline = TRUE))
            ),
            div(class = "st-stat-item",
              span(class = "st-stat-label", "STOPNIE SWOBODY (df)"),
              span(class = "st-stat-value", textOutput("stat_df", inline = TRUE))
            ),
            div(class = "st-stat-item",
              span(class = "st-stat-label", "WARTOSC p"),
              span(class = "st-stat-value", textOutput("stat_pvalue", inline = TRUE))
            ),
            div(class = "st-stat-item",
              span(class = "st-stat-label", HTML("V CRAM&Eacute;RA")),
              span(class = "st-stat-value", textOutput("stat_cramers", inline = TRUE))
            ),
            uiOutput("stat_verdict")
          )
        ),

        # Grouped bar chart
        div(style = "background: #f8fafc; border-radius: 14px; padding: 16px; margin-top: 24px; min-height: 400px;",
          plotlyOutput("bar_chart", height = "400px")
        )
      )
    )
  )
)

# ============================================================
# SERVER
# ============================================================
server <- function(input, output, session) {

  # ---- Reactive state ----
  mode <- reactiveVal("exploration")
  nRows <- reactiveVal(2)
  nCols <- reactiveVal(2)
  rowLabels <- reactiveVal(c("Kobiety", "Mezczyzni"))
  colLabels <- reactiveVal(c("Zadowolony", "Niezadowolony"))

  # Exploration state
  rowPercentages <- reactiveVal(list(c(60, 40), c(55, 45)))
  sampleSize <- reactiveVal(200)
  rowSplitPct <- reactiveVal(50)

  # Custom table state
  customTable <- reactiveVal(matrix(c(48, 30, 28, 24), nrow = 2, byrow = TRUE))

  # Results
  results <- reactiveVal(NULL)

  # ---- Expose mode to conditionalPanel ----
  output$current_mode <- reactive({ mode() })
  outputOptions(output, "current_mode", suspendWhenHidden = FALSE)

  # ---- Mode toggle ----
  observeEvent(input$btn_exploration, {
    mode("exploration")
    updateActionButton(session, "btn_exploration", class = "st-btn-primary")
    updateActionButton(session, "btn_custom", class = "st-btn-secondary")
  })

  observeEvent(input$btn_custom, {
    mode("custom")
    updateActionButton(session, "btn_custom", class = "st-btn-primary")
    updateActionButton(session, "btn_exploration", class = "st-btn-secondary")
  })

  # ---- Presets ----
  apply_preset <- function(preset_name) {
    p <- PRESETS[[preset_name]]
    if (is.null(p)) return()

    mode("exploration")
    updateActionButton(session, "btn_exploration", class = "st-btn-primary")
    updateActionButton(session, "btn_custom", class = "st-btn-secondary")

    nr <- length(p$rowPercentages)
    nc <- length(p$rowPercentages[[1]])
    nRows(nr)
    nCols(nc)
    rowLabels(p$rowLabels)
    colLabels(p$colLabels)
    rowPercentages(p$rowPercentages)
    sampleSize(p$sampleSize)
    rowSplitPct(p$rowSplitPct)

    updateSliderInput(session, "param_n", value = p$sampleSize)
    updateSliderInput(session, "param_split", value = p$rowSplitPct)
  }

  observeEvent(input$preset_independent, apply_preset("independent"))
  observeEvent(input$preset_weak, apply_preset("weak"))
  observeEvent(input$preset_strong, apply_preset("strong"))
  observeEvent(input$preset_medicine, apply_preset("medicine"))

  # ---- Sync sliders to reactive state ----
  observeEvent(input$param_n, { sampleSize(input$param_n) })
  observeEvent(input$param_split, { rowSplitPct(input$param_split) })

  # ---- Custom mode: dimension change ----
  observeEvent(list(input$param_rows, input$param_cols), {
    req(mode() == "custom")
    new_r <- input$param_rows
    new_c <- input$param_cols
    req(new_r >= 2, new_r <= 10, new_c >= 2, new_c <= 10)

    old_mat <- customTable()
    new_mat <- matrix(10L, nrow = new_r, ncol = new_c)
    # Copy over old values where possible
    copy_r <- min(nrow(old_mat), new_r)
    copy_c <- min(ncol(old_mat), new_c)
    new_mat[seq_len(copy_r), seq_len(copy_c)] <- old_mat[seq_len(copy_r), seq_len(copy_c)]
    customTable(new_mat)

    nRows(new_r)
    nCols(new_c)

    # Extend labels
    rl <- rowLabels()
    while (length(rl) < new_r) rl <- c(rl, paste("Wiersz", length(rl) + 1))
    rowLabels(rl[seq_len(new_r)])

    cl <- colLabels()
    while (length(cl) < new_c) cl <- c(cl, paste("Kolumna", length(cl) + 1))
    colLabels(cl[seq_len(new_c)])

    # Extend rowPercentages for exploration
    rp <- rowPercentages()
    equal_pct <- floor(100 / new_c)
    last_pct <- 100 - equal_pct * (new_c - 1)
    default_pcts <- c(rep(equal_pct, new_c - 1), last_pct)
    while (length(rp) < new_r) rp <- c(rp, list(default_pcts))
    rp <- rp[seq_len(new_r)]
    # Adjust columns in each row
    for (i in seq_along(rp)) {
      row_pcts <- rp[[i]]
      if (length(row_pcts) < new_c) {
        row_pcts <- c(row_pcts, rep(equal_pct, new_c - length(row_pcts)))
      }
      rp[[i]] <- row_pcts[seq_len(new_c)]
    }
    rowPercentages(rp)
  }, ignoreInit = TRUE)

  # ---- Exploration mode: slider UI ----
  output$slider_controls <- renderUI({
    nr <- nRows()
    nc <- nCols()
    rl <- rowLabels()
    cl <- colLabels()
    rp <- rowPercentages()

    slider_list <- lapply(seq_len(nr), function(r) {
      row_pcts <- rp[[r]]
      # Sliders for first (nc-1) columns
      col_sliders <- lapply(seq_len(nc - 1), function(c_idx) {
        input_id <- paste0("pct_", r, "_", c_idx)
        col_name <- if (c_idx <= length(cl)) cl[c_idx] else paste("Kol.", c_idx)
        current_val <- if (c_idx <= length(row_pcts)) row_pcts[c_idx] else 50
        sliderInput(input_id, paste0(col_name, " (%)"),
          min = 0, max = 100, value = current_val, step = 1)
      })

      # Computed last column
      last_col_name <- if (nc <= length(cl)) cl[nc] else paste("Kol.", nc)

      div(class = "chi-slider-row",
        div(class = "chi-slider-row__title",
          if (r <= length(rl)) rl[r] else paste("Wiersz", r)),
        col_sliders,
        div(class = "chi-pct-computed", id = paste0("pct_computed_", r),
          textOutput(paste0("pct_last_", r), inline = TRUE))
      )
    })

    tagList(slider_list)
  })

  # ---- Computed last column percentages (text output) ----
  observe({
    nr <- nRows()
    nc <- nCols()
    cl <- colLabels()

    lapply(seq_len(nr), function(r) {
      output[[paste0("pct_last_", r)]] <- renderText({
        nc_local <- nCols()
        cl_local <- colLabels()
        total <- 0
        for (c_idx in seq_len(nc_local - 1)) {
          val <- input[[paste0("pct_", r, "_", c_idx)]]
          if (!is.null(val)) total <- total + val
        }
        last_pct <- max(0, 100 - total)
        last_name <- if (nc_local <= length(cl_local)) cl_local[nc_local] else paste("Kol.", nc_local)
        paste0(last_name, ": ", last_pct, "%")
      })
    })
  })

  # ---- Collect current percentages from sliders ----
  current_percentages <- reactive({
    nr <- nRows()
    nc <- nCols()
    rp <- list()
    for (r in seq_len(nr)) {
      row_pcts <- numeric(nc)
      for (c_idx in seq_len(nc - 1)) {
        val <- input[[paste0("pct_", r, "_", c_idx)]]
        if (is.null(val)) val <- 50
        row_pcts[c_idx] <- val
      }
      row_pcts[nc] <- max(0, 100 - sum(row_pcts[-nc]))
      rp[[r]] <- row_pcts
    }
    rp
  })

  # ---- Collect custom table values from inputs ----
  current_custom_table <- reactive({
    nr <- nRows()
    nc <- nCols()
    mat <- matrix(0L, nrow = nr, ncol = nc)
    for (r in seq_len(nr)) {
      for (c_idx in seq_len(nc)) {
        val <- input[[paste0("cell_", r, "_", c_idx)]]
        if (is.null(val)) val <- customTable()[r, c_idx]
        mat[r, c_idx] <- max(0, as.integer(val))
      }
    }
    mat
  })

  # ---- Debounced computation trigger ----
  compute_params <- reactive({
    m <- mode()
    alpha <- as.numeric(input$param_alpha)
    if (m == "exploration") {
      list(
        mode = m,
        percentages = current_percentages(),
        n = sampleSize(),
        split = rowSplitPct(),
        alpha = alpha,
        nRows = nRows(),
        nCols = nCols()
      )
    } else {
      list(
        mode = m,
        table = current_custom_table(),
        alpha = alpha,
        nRows = nRows(),
        nCols = nCols()
      )
    }
  }) |> debounce(300)

  # ---- Compute chi-square ----
  observe({
    p <- compute_params()
    alpha <- if (is.null(p$alpha) || is.na(p$alpha)) 0.05 else p$alpha

    if (p$mode == "exploration") {
      rp <- p$percentages
      req(length(rp) >= 2)
      req(length(rp[[1]]) >= 2)

      table_mat <- generate_from_percentages(rp, p$n, p$split)
      res <- compute_chi_square(table_mat, alpha)
      if (isTRUE(res$success)) {
        res$table <- table_mat
      }
      results(res)
    } else {
      table_mat <- p$table
      req(nrow(table_mat) >= 2, ncol(table_mat) >= 2)
      res <- compute_chi_square(table_mat, alpha)
      if (isTRUE(res$success)) {
        res$table <- table_mat
      }
      results(res)
    }
  })

  # ---- Warnings ----
  output$warnings_box <- renderUI({
    res <- results()
    if (is.null(res)) return(NULL)

    msgs <- character(0)
    if (!isTRUE(res$success) && !is.null(res$error)) {
      msgs <- res$error
    } else if (length(res$warnings) > 0) {
      msgs <- res$warnings
    }

    if (length(msgs) == 0) return(NULL)

    div(class = "st-warning",
      lapply(msgs, function(m) p(m))
    )
  })

  # ---- Contingency table (HTML) ----
  output$contingency_table <- renderUI({
    res <- results()
    req(res, isTRUE(res$success))

    m <- mode()
    table_mat <- res$table
    expected <- res$expected
    contributions <- res$contributions
    show_exp <- isTRUE(input$show_expected)

    nr <- nrow(table_mat)
    nc <- ncol(table_mat)
    rl <- rowLabels()
    cl <- colLabels()

    row_totals <- rowSums(table_mat)
    col_totals <- colSums(table_mat)
    grand_total <- sum(table_mat)

    # Max contribution for color normalization
    max_contrib <- max(max(contributions, na.rm = TRUE), 1)

    # Build HTML table
    # Header row
    header_cells <- list(tags$th(""))
    for (c_idx in seq_len(nc)) {
      col_name <- if (c_idx <= length(cl)) cl[c_idx] else paste("Kol.", c_idx)
      if (m == "custom") {
        header_cells[[c_idx + 1]] <- tags$th(
          tags$input(type = "text", class = "chi-label-input",
            value = col_name,
            id = paste0("collabel_", c_idx),
            onchange = sprintf(
              "Shiny.setInputValue('collabel_%d_val', this.value, {priority: 'event'})", c_idx)
          )
        )
      } else {
        header_cells[[c_idx + 1]] <- tags$th(col_name)
      }
    }
    header_cells[[nc + 2]] <- tags$th("Suma")

    # Body rows
    body_rows <- lapply(seq_len(nr), function(r) {
      row_name <- if (r <= length(rl)) rl[r] else paste("Wiersz", r)

      row_header <- if (m == "custom") {
        tags$th(
          tags$input(type = "text", class = "chi-label-input",
            value = row_name,
            id = paste0("rowlabel_", r),
            onchange = sprintf(
              "Shiny.setInputValue('rowlabel_%d_val', this.value, {priority: 'event'})", r)
          )
        )
      } else {
        tags$th(row_name)
      }

      cells <- list(row_header)
      for (c_idx in seq_len(nc)) {
        obs <- table_mat[r, c_idx]
        exp_val <- expected[r, c_idx]
        contrib <- contributions[r, c_idx]
        row_total <- row_totals[r]
        pct <- if (row_total > 0) round(obs / row_total * 100, 1) else 0

        # Color by contribution
        intensity <- min(contrib / max(max_contrib, 3), 1) * 0.4
        if (obs > exp_val) {
          bg_color <- sprintf("rgba(239, 68, 68, %.2f)", intensity)
          title_text <- sprintf("Wiecej niz oczekiwane (wklad: %.2f)", contrib)
        } else if (obs < exp_val) {
          bg_color <- sprintf("rgba(99, 102, 241, %.2f)", intensity)
          title_text <- sprintf("Mniej niz oczekiwane (wklad: %.2f)", contrib)
        } else {
          bg_color <- ""
          title_text <- "Zgodne z oczekiwanymi"
        }

        exp_class <- if (show_exp) "chi-expected" else "chi-expected chi-expected--hidden"

        cell_content <- if (m == "custom") {
          tagList(
            tags$input(type = "number", class = "chi-cell-input",
              value = obs, min = 0,
              id = paste0("cell_", r, "_", c_idx),
              `data-row` = r, `data-col` = c_idx),
            tags$span(class = exp_class,
              paste0("ocz: ", formatC(exp_val, format = "f", digits = 1))),
            tags$span(class = "chi-pct", paste0(pct, "%"))
          )
        } else {
          tagList(
            tags$strong(obs),
            tags$span(class = exp_class,
              paste0("ocz: ", formatC(exp_val, format = "f", digits = 1))),
            tags$span(class = "chi-pct", paste0(pct, "%"))
          )
        }

        cells[[c_idx + 1]] <- tags$td(
          style = if (nchar(bg_color) > 0) paste0("background-color: ", bg_color) else NULL,
          title = title_text,
          cell_content
        )
      }

      # Row total
      cells[[nc + 2]] <- tags$td(class = "chi-total", row_totals[r])

      do.call(tags$tr, cells)
    })

    # Footer row
    footer_cells <- list(tags$th("Suma"))
    for (c_idx in seq_len(nc)) {
      marginal_pct <- if (grand_total > 0) round(col_totals[c_idx] / grand_total * 100, 1) else 0
      footer_cells[[c_idx + 1]] <- tags$td(class = "chi-total",
        col_totals[c_idx],
        tags$span(class = "chi-pct", paste0(marginal_pct, "%"))
      )
    }
    footer_cells[[nc + 2]] <- tags$td(class = "chi-grand-total", grand_total)

    tags$table(class = "chi-table",
      tags$thead(do.call(tags$tr, header_cells)),
      tags$tbody(body_rows),
      tags$tfoot(do.call(tags$tr, footer_cells))
    )
  })

  # ---- Custom mode: update labels from text inputs ----
  observe({
    nr <- nRows()
    for (r in seq_len(nr)) {
      local({
        local_r <- r
        observeEvent(input[[paste0("rowlabel_", local_r, "_val")]], {
          rl <- rowLabels()
          rl[local_r] <- input[[paste0("rowlabel_", local_r, "_val")]]
          rowLabels(rl)
        }, ignoreInit = TRUE)
      })
    }
    nc <- nCols()
    for (c_idx in seq_len(nc)) {
      local({
        local_c <- c_idx
        observeEvent(input[[paste0("collabel_", local_c, "_val")]], {
          cl <- colLabels()
          cl[local_c] <- input[[paste0("collabel_", local_c, "_val")]]
          colLabels(cl)
        }, ignoreInit = TRUE)
      })
    }
  })

  # ---- Stats outputs ----
  output$stat_chi2 <- renderText({
    res <- results()
    if (is.null(res) || !isTRUE(res$success)) return("-")
    formatC(res$chi_square, format = "f", digits = 4)
  })

  output$stat_df <- renderText({
    res <- results()
    if (is.null(res) || !isTRUE(res$success)) return("-")
    as.character(res$df)
  })

  output$stat_pvalue <- renderText({
    res <- results()
    if (is.null(res) || !isTRUE(res$success)) return("-")
    format_pvalue(res$p_value)
  })

  output$stat_cramers <- renderText({
    res <- results()
    if (is.null(res) || !isTRUE(res$success)) return("-")
    formatC(res$cramers_v, format = "f", digits = 4)
  })

  output$stat_verdict <- renderUI({
    res <- results()
    if (is.null(res) || !isTRUE(res$success)) {
      return(div(class = "st-stat-item",
        span(class = "st-stat-label", "WERDYKT"),
        span(class = "st-stat-value", "-")
      ))
    }

    alpha <- as.numeric(input$param_alpha)
    if (isTRUE(res$significant)) {
      verdict_text <- sprintf(
        "Odrzucamy H0 (p < %s) -- istnieja istotne przeslanki zaleznosci", alpha)
      verdict_class <- "chi-verdict--significant"
    } else {
      verdict_text <- sprintf(
        "Brak podstaw do odrzucenia H0 (p >= %s)", alpha)
      verdict_class <- "chi-verdict--not-significant"
    }

    div(class = paste("st-stat-item", verdict_class),
      span(class = "st-stat-label", "WERDYKT"),
      span(class = "st-stat-value", verdict_text)
    )
  })

  # ---- Grouped bar chart (plotly) ----
  output$bar_chart <- renderPlotly({
    res <- results()
    req(res, isTRUE(res$success))

    table_mat <- res$table
    expected <- res$expected
    nr <- nrow(table_mat)
    nc <- ncol(table_mat)
    rl <- rowLabels()
    cl <- colLabels()

    col_names <- sapply(seq_len(nc), function(c_idx) {
      if (c_idx <= length(cl)) cl[c_idx] else paste("Kol.", c_idx)
    })

    p <- plot_ly()

    for (r in seq_len(nr)) {
      row_label <- if (r <= length(rl)) rl[r] else paste("Wiersz", r)
      color <- ROW_COLORS[((r - 1) %% length(ROW_COLORS)) + 1]

      # Observed bars
      p <- p |> add_bars(
        x = col_names,
        y = table_mat[r, ],
        name = paste0(row_label, " (obs.)"),
        marker = list(color = color),
        legendgroup = row_label,
        hovertemplate = paste0(
          "<b>", row_label, "</b><br>Obserwowane: %{y}<extra></extra>")
      )

      # Expected scatter markers
      p <- p |> add_trace(
        x = col_names,
        y = expected[r, ],
        type = "scatter",
        mode = "markers",
        name = paste0(row_label, " (ocz.)"),
        marker = list(
          symbol = "line-ew-open",
          size = 18,
          color = color,
          line = list(width = 3, color = color)
        ),
        legendgroup = row_label,
        hovertemplate = paste0(
          "<b>", row_label, "</b><br>Oczekiwane: %{y:.1f}<extra></extra>")
      )
    }

    p |> layout(
      title = list(
        text = "Czestosci obserwowane vs oczekiwane",
        font = list(size = 16, family = "Arial, sans-serif")
      ),
      barmode = "group",
      xaxis = list(title = "", gridcolor = "#e0e0e0"),
      yaxis = list(title = "Liczebnosc", gridcolor = "#e0e0e0"),
      plot_bgcolor = "#f8fafc",
      paper_bgcolor = "#f8fafc",
      margin = list(t = 50, b = 50, l = 60, r = 20),
      showlegend = TRUE,
      legend = list(
        x = 1, xanchor = "right", y = 1,
        bgcolor = "rgba(255,255,255,0.8)",
        bordercolor = "#ddd", borderwidth = 1,
        font = list(size = 11)
      ),
      hovermode = "closest"
    ) |> config(
      responsive = TRUE,
      displayModeBar = FALSE,
      displaylogo = FALSE
    )
  })
}

shinyApp(ui = ui, server = server)
