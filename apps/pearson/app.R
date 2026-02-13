# Korelacja Pearsona - Interaktywna wizualizacja (Shiny app)
# Port z toys/pearson_correlation/ (Flask + Plotly.js)

library(shiny)
library(plotly)
library(bslib)
library(htmltools)

source(file.path("..", "shared", "theme.R"), local = TRUE)
source(file.path("..", "shared", "helpers.R"), local = TRUE)

# ============================================================
# UI
# ============================================================
ui <- page_fluid(
  theme = st_theme(),
  class = "st-page",

  # Extra CSS for Pearson-specific layout

  tags$style(HTML("
    .pc-instruction {
      text-align: center;
      padding: 12px 16px;
      margin-bottom: 24px;
      background: rgba(99, 102, 241, 0.06);
      border: 1px solid rgba(99, 102, 241, 0.15);
      border-radius: 10px;
      font-size: 0.875rem;
      color: #475569;
      font-style: italic;
    }
    .pc-presets {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;
    }
    .pc-presets__label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #475569;
      margin-right: 8px;
    }
    .pc-main-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
      margin-bottom: 32px;
    }
    @media (min-width: 1024px) {
      .pc-main-layout {
        grid-template-columns: 1fr 340px;
      }
    }
    .pc-plot-area { min-width: 0; }
    .pc-plot-container {
      background: #f8fafc;
      border-radius: 14px;
      padding: 8px;
      cursor: crosshair;
    }
    .pc-results-panel {
      background: #f8fafc;
      padding: 24px;
      border-radius: 14px;
      height: fit-content;
    }
    @media (min-width: 1024px) {
      .pc-results-panel { position: sticky; top: 24px; }
    }
    .pc-results-panel__title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 16px;
    }
    .pc-r-box {
      text-align: center;
      padding: 16px;
      margin-bottom: 16px;
      background: #ffffff;
      border-radius: 14px;
      border: 2px solid #e2e8f0;
      transition: border-color 0.25s, background 0.25s;
    }
    .pc-r-box.positive { border-color: #22c55e; background: rgba(34,197,94,0.06); }
    .pc-r-box.negative { border-color: #ef4444; background: rgba(239,68,68,0.06); }
    .pc-r-box.neutral  { border-color: #94a3b8; }
    .pc-r-box .label { font-size: 1.125rem; color: #475569; font-weight: 500; }
    .pc-r-box .value {
      font-size: 2rem; font-weight: 700; color: #1e293b;
      font-family: 'Courier New', monospace;
    }
    .pc-r-box.positive .value { color: #16a34a; }
    .pc-r-box.negative .value { color: #dc2626; }
    .pc-r-box.neutral  .value { color: #94a3b8; }
    .pc-stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .pc-interp-box {
      padding: 10px 16px;
      border-radius: 10px;
      margin-bottom: 16px;
      font-size: 0.875rem;
      font-weight: 500;
      text-align: center;
      background: #f1f5f9;
      color: #475569;
      border-left: 3px solid #e2e8f0;
    }
    .pc-interp-box.positive { background: rgba(34,197,94,0.08); border-left-color: #22c55e; color: #16a34a; }
    .pc-interp-box.negative { background: rgba(239,68,68,0.08); border-left-color: #ef4444; color: #dc2626; }
    .pc-interp-box.weak     { background: rgba(148,163,184,0.1); border-left-color: #94a3b8; color: #94a3b8; }
    .pc-regression-eq {
      padding: 10px 16px;
      margin-bottom: 16px;
      background: rgba(239,68,68,0.06);
      border-radius: 8px;
      border-left: 3px solid #ef4444;
    }
    .pc-regression-eq .lbl { display: block; font-size: 0.75rem; color: #94a3b8; margin-bottom: 2px; }
    .pc-regression-eq .val { font-size: 1rem; font-weight: 600; color: #dc2626; font-family: 'Courier New', monospace; }
    .pc-means {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }
    .pc-means__item {
      flex: 1;
      text-align: center;
      padding: 8px 12px;
      background: #ffffff;
      border-radius: 8px;
    }
    .pc-means__label { font-size: 0.875rem; color: #94a3b8; }
    .pc-means__value { font-weight: 600; color: #6366f1; font-family: 'Courier New', monospace; }
    .pc-formula-box {
      padding: 16px;
      background: #ffffff;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
    }
    .pc-formula-box .title {
      font-size: 0.75rem; font-weight: 600; color: #94a3b8;
      margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em;
    }
    .pc-formula-box .formula-static {
      text-align: center; font-size: 1rem; color: #1e293b; margin-bottom: 8px;
    }
    .pc-formula-box .formula-computed {
      text-align: center; font-size: 0.875rem; color: #475569;
      padding-top: 8px; border-top: 1px solid #f1f5f9; word-break: break-all;
    }
    .pc-formula-box .formula-computed strong { color: #6366f1; font-size: 1rem; }
    .pc-frac {
      display: inline-flex; flex-direction: column; vertical-align: middle;
      text-align: center; margin: 0 4px;
    }
    .pc-frac .num { border-bottom: 2px solid #475569; padding-bottom: 2px; font-size: 0.875rem; }
    .pc-frac .den { padding-top: 2px; font-size: 0.875rem; }
    .pc-data-section { margin-top: 24px; }
    .pc-data-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 12px; flex-wrap: wrap; gap: 8px;
    }
    .pc-data-header h3 { font-size: 1rem; font-weight: 700; color: #1e293b; margin: 0; }
    .pc-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 16px; }
    .pc-table {
      width: 100%; border-collapse: separate; border-spacing: 0;
      font-size: 0.875rem; min-width: 600px;
    }
    .pc-table thead th {
      position: sticky; top: 0; background: #f8fafc;
      padding: 10px; font-weight: 600; color: #475569;
      text-align: center; border-bottom: 2px solid #e2e8f0;
      font-size: 0.75rem; white-space: nowrap;
    }
    .pc-table tbody td {
      padding: 6px 10px; text-align: center;
      border-bottom: 1px solid #f1f5f9;
      font-family: 'Courier New', monospace; font-size: 0.75rem;
    }
    .pc-table tbody tr:hover td { background: rgba(99,102,241,0.06); }
    .pc-table__sum-row td {
      border-top: 2px solid #e2e8f0; background: #f8fafc !important;
      font-weight: 700; padding: 10px;
    }
    .pc-table tfoot td {
      padding: 10px; text-align: center;
      font-family: 'Courier New', monospace; font-size: 0.75rem;
    }
    .pc-description { margin-top: 32px; }
    .pc-description h3 { font-size: 1rem; font-weight: 700; margin-bottom: 8px; }
    .pc-description h4 { font-size: 0.875rem; font-weight: 600; margin-top: 16px; margin-bottom: 4px; }
    .pc-description p, .pc-description li { font-size: 0.875rem; color: #475569; line-height: 1.7; }
    .pc-experiments summary { cursor: pointer; color: #6366f1; font-weight: 600; }
    .pc-experiments li { margin-bottom: 8px; }
  ")),

  div(class = "st-card st-card--wide",

    # Header
    div(class = "st-header",
      h1("Korelacja Pearsona"),
      p("Interaktywna wizualizacja wsp\u00f3\u0142czynnika korelacji liniowej")
    ),

    # Instruction
    div(class = "pc-instruction",
      "Kliknij na wykresie, by doda\u0107 punkt. Kliknij istniej\u0105cy punkt, by go usun\u0105\u0107."
    ),

    # Preset buttons
    div(class = "pc-presets",
      span(class = "pc-presets__label", "Przyk\u0142adowe dane:"),
      actionButton("preset_positive", "Silna dodatnia", class = "st-btn-ghost"),
      actionButton("preset_negative", "Silna ujemna", class = "st-btn-ghost"),
      actionButton("preset_none", "Brak korelacji", class = "st-btn-ghost"),
      actionButton("preset_nonlinear", "Nieliniowa (U)", class = "st-btn-ghost"),
      actionButton("preset_outlier", "Efekt outliera", class = "st-btn-ghost"),
      actionButton("clear_points", "Wyczy\u015b\u0107", class = "st-btn-ghost",
                    style = "border-color: #ef4444; color: #ef4444;")
    ),

    # Main layout: plot + results panel
    div(class = "pc-main-layout",

      # Plot area
      div(class = "pc-plot-area",
        div(class = "pc-plot-container",
          plotlyOutput("scatter_plot", height = "500px")
        )
      ),

      # Results panel
      div(class = "pc-results-panel",
        div(class = "pc-results-panel__title", "Wyniki"),

        # r display
        uiOutput("r_display"),

        # Stats grid
        div(class = "pc-stats-grid",
          div(class = "st-stat-item",
            span(class = "st-stat-label", "R\u00b2"),
            span(class = "st-stat-value", textOutput("stat_r2", inline = TRUE))
          ),
          div(class = "st-stat-item",
            span(class = "st-stat-label", "WARTO\u015a\u0106 P"),
            span(class = "st-stat-value", textOutput("stat_pvalue", inline = TRUE))
          ),
          div(class = "st-stat-item",
            span(class = "st-stat-label", "N (PUNKTY)"),
            span(class = "st-stat-value", textOutput("stat_n", inline = TRUE))
          ),
          div(class = "st-stat-item",
            span(class = "st-stat-label", "DF"),
            span(class = "st-stat-value", textOutput("stat_df", inline = TRUE))
          )
        ),

        # Interpretation
        uiOutput("interpretation_box"),

        # Regression equation
        uiOutput("regression_eq"),

        # Means
        div(class = "pc-means",
          div(class = "pc-means__item",
            span(class = "pc-means__label", "x\u0304 = "),
            span(class = "pc-means__value", textOutput("stat_mean_x", inline = TRUE))
          ),
          div(class = "pc-means__item",
            span(class = "pc-means__label", "y\u0304 = "),
            span(class = "pc-means__value", textOutput("stat_mean_y", inline = TRUE))
          )
        ),

        # Formula display
        uiOutput("formula_box")
      )
    ),

    # Data table section
    div(class = "pc-data-section",
      div(class = "pc-data-header",
        h3("Tabela odchyle\u0144"),
        checkboxInput("show_deviations", "Poka\u017c odchylenia na wykresie", value = TRUE)
      ),
      div(class = "pc-table-scroll",
        uiOutput("data_table")
      )
    ),

    # Description
    div(class = "pc-description",
      h3("O wsp\u00f3\u0142czynniku korelacji Pearsona"),
      p(
        "Wsp\u00f3\u0142czynnik korelacji Pearsona (r) mierzy si\u0142\u0119 i kierunek ",
        tags$strong("liniowej"), " zale\u017cno\u015bci mi\u0119dzy dwiema zmiennymi. ",
        "Przyjmuje warto\u015bci od -1 (doskona\u0142a korelacja ujemna) do +1 ",
        "(doskona\u0142a korelacja dodatnia). Warto\u015b\u0107 0 oznacza brak ",
        "korelacji liniowej."
      ),
      h4("Interpretacja warto\u015bci |r|"),
      tags$ul(
        tags$li(tags$strong("|r| < 0.3"), " \u2014 s\u0142aba korelacja"),
        tags$li(tags$strong("0.3 \u2264 |r| < 0.7"), " \u2014 umiarkowana korelacja"),
        tags$li(tags$strong("|r| \u2265 0.7"), " \u2014 silna korelacja")
      ),
      h4("Wa\u017cne ograniczenie"),
      p(
        "Pearson mierzy tylko zale\u017cno\u015b\u0107 ", tags$strong("liniow\u0105"), ". ",
        "Dwie zmienne mog\u0105 by\u0107 silnie powi\u0105zane nieliniowo ",
        "(np. zale\u017cno\u015bci\u0105 kwadratow\u0105), a wsp\u00f3\u0142czynnik r mo\u017ce ",
        "by\u0107 bliski 0. Wypr\u00f3buj przyk\u0142ad \u201eNieliniowa (U)\u201d, ",
        "by to zobaczy\u0107."
      ),
      tags$details(class = "pc-experiments",
        tags$summary(tags$strong("Eksperymenty do wypr\u00f3bowania")),
        tags$ol(
          tags$li(
            tags$strong("Wra\u017cliwo\u015b\u0107 na outliery:"),
            " Za\u0142aduj \u201eBrak korelacji\u201d, ",
            "potem dodaj jeden punkt daleko od reszty (np. w rogu). ",
            "Obserwuj jak drastycznie zmienia si\u0119 r."
          ),
          tags$li(
            tags$strong("Nieliniowa zale\u017cno\u015b\u0107:"),
            " Za\u0142aduj \u201eNieliniowa (U)\u201d \u2014 ",
            "r jest bliski 0, cho\u0107 zale\u017cno\u015b\u0107 jest oczywista."
          ),
          tags$li(
            tags$strong("Dodawaj punkty jeden po drugim:"),
            " Zacznij od pustego wykresu ",
            "i buduj zbi\u00f3r danych punkt po punkcie, obserwuj\u0105c jak zmienia si\u0119 r."
          ),
          tags$li(
            tags$strong("Kolorowanie tabeli:"),
            " Obserwuj kolory w kolumnie iloczyn \u2014 ",
            "zielone (dodatnie) i czerwone (ujemne) sk\u0142adniki ",
            "pokazuj\u0105 jak ka\u017cdy punkt wp\u0142ywa na warto\u015b\u0107 r."
          )
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
  points <- reactiveVal(data.frame(x = numeric(0), y = numeric(0)))
  # Track the number of click events we've processed (to detect new clicks)
  last_click_count <- reactiveVal(0)

  # ---- Presets ----
  generate_preset <- function(type) {
    switch(type,
      "perfect_positive" = {
        n <- 20
        x <- seq(1, 10, length.out = n)
        y <- 2 * x + 1 + rnorm(n, 0, 0.3)
        data.frame(x = round(x, 2), y = round(y, 2))
      },
      "perfect_negative" = {
        n <- 20
        x <- seq(1, 10, length.out = n)
        y <- -1.5 * x + 15 + rnorm(n, 0, 0.3)
        data.frame(x = round(x, 2), y = round(y, 2))
      },
      "no_correlation" = {
        n <- 30
        x <- runif(n, 1, 10)
        y <- runif(n, 1, 10)
        data.frame(x = round(x, 2), y = round(y, 2))
      },
      "nonlinear" = {
        n <- 30
        x <- seq(-5, 5, length.out = n)
        y <- x^2 + rnorm(n, 0, 1)
        data.frame(x = round(x, 2), y = round(y, 2))
      },
      "outlier_effect" = {
        n <- 20
        x <- rnorm(n, 5, 1)
        y <- rnorm(n, 5, 1)
        x <- c(x, 15)
        y <- c(y, 15)
        data.frame(x = round(x, 2), y = round(y, 2))
      }
    )
  }

  observeEvent(input$preset_positive,  { points(generate_preset("perfect_positive")) })
  observeEvent(input$preset_negative,  { points(generate_preset("perfect_negative")) })
  observeEvent(input$preset_none,      { points(generate_preset("no_correlation")) })
  observeEvent(input$preset_nonlinear, { points(generate_preset("nonlinear")) })
  observeEvent(input$preset_outlier,   { points(generate_preset("outlier_effect")) })
  observeEvent(input$clear_points,     { points(data.frame(x = numeric(0), y = numeric(0))) })

  # ---- Click handling via plotly ----
  # We use a JS callback to capture clicks on empty plot area
  # and plotly_click for existing points
  observeEvent(event_data("plotly_click", source = "scatter"), {
    click <- event_data("plotly_click", source = "scatter")
    if (is.null(click)) return()

    pts <- points()
    click_x <- click$x
    click_y <- click$y
    curve_num <- click$curveNumber

    # If clicked on an existing data point (trace 0), remove it
    if (!is.null(curve_num) && curve_num == 0 && nrow(pts) > 0) {
      idx <- click$pointNumber + 1  # plotly is 0-indexed
      if (idx >= 1 && idx <= nrow(pts)) {
        pts <- pts[-idx, , drop = FALSE]
        rownames(pts) <- NULL
        points(pts)
        return()
      }
    }

    # If clicked on regression line or shapes, treat as adding a new point
    if (!is.null(click_x) && !is.null(click_y) &&
        !is.na(click_x) && !is.na(click_y)) {

      # Check if near existing point (distance threshold)
      if (nrow(pts) > 0) {
        x_range <- if (nrow(pts) >= 2) diff(range(pts$x)) else 20
        if (x_range == 0) x_range <- 20
        threshold <- x_range * 0.02
        distances <- sqrt((pts$x - click_x)^2 + (pts$y - click_y)^2)
        if (any(distances < threshold)) return()
      }

      # Limit to 100 points
      if (nrow(pts) >= 100) return()

      new_pt <- data.frame(x = round(click_x, 2), y = round(click_y, 2))
      points(rbind(pts, new_pt))
    }
  })

  # Also listen for clicks on empty plot area via JavaScript custom event
  observe({
    # Register custom JS to capture clicks on empty plot space
    session$onFlushed(function() {
      session$sendCustomMessage("register_plot_click", list())
    }, once = TRUE)
  })

  # Handle the custom add-point event from JS
  observeEvent(input$plot_add_point, {
    coords <- input$plot_add_point
    if (is.null(coords)) return()
    click_x <- coords$x
    click_y <- coords$y
    if (is.null(click_x) || is.null(click_y)) return()
    if (is.na(click_x) || is.na(click_y)) return()

    pts <- points()

    # Check near existing point
    if (nrow(pts) > 0) {
      x_range <- if (nrow(pts) >= 2) diff(range(pts$x)) else 20
      if (x_range == 0) x_range <- 20
      threshold <- x_range * 0.02
      distances <- sqrt((pts$x - click_x)^2 + (pts$y - click_y)^2)
      if (any(distances < threshold)) return()
    }

    if (nrow(pts) >= 100) return()

    new_pt <- data.frame(x = round(click_x, 2), y = round(click_y, 2))
    points(rbind(pts, new_pt))
  })

  # ---- Computed statistics ----
  stats_data <- reactive({
    pts <- points()
    n <- nrow(pts)

    if (n < 3) {
      return(list(
        valid = FALSE,
        n = n,
        pts = pts
      ))
    }

    x <- pts$x
    y <- pts$y

    # Check zero variance
    if (sd(x) == 0 || sd(y) == 0) {
      return(list(
        valid = FALSE,
        n = n,
        pts = pts
      ))
    }

    ct <- cor.test(x, y, method = "pearson")
    r <- ct$estimate[[1]]
    p_value <- ct$p.value
    r_sq <- r^2
    df <- n - 2

    fit <- lm(y ~ x)
    slope <- coef(fit)[["x"]]
    intercept <- coef(fit)[["(Intercept)"]]

    mean_x <- mean(x)
    mean_y <- mean(y)

    dx <- x - mean_x
    dy <- y - mean_y
    products <- dx * dy
    dx_sq <- dx^2
    dy_sq <- dy^2

    sum_products <- sum(products)
    sum_dx_sq <- sum(dx_sq)
    sum_dy_sq <- sum(dy_sq)

    abs_r <- abs(r)
    if (abs_r < 0.3) {
      strength <- "S\u0142aba"
    } else if (abs_r < 0.7) {
      strength <- "Umiarkowana"
    } else {
      strength <- "Silna"
    }

    if (r > 0) {
      direction <- "dodatnia"
    } else if (r < 0) {
      direction <- "ujemna"
    } else {
      direction <- "brak"
    }

    list(
      valid = TRUE,
      n = n,
      r = r,
      r_sq = r_sq,
      p_value = p_value,
      df = df,
      slope = slope,
      intercept = intercept,
      mean_x = mean_x,
      mean_y = mean_y,
      dx = dx,
      dy = dy,
      products = products,
      dx_sq = dx_sq,
      dy_sq = dy_sq,
      sum_products = sum_products,
      sum_dx_sq = sum_dx_sq,
      sum_dy_sq = sum_dy_sq,
      strength = strength,
      direction = direction,
      pts = pts
    )
  })

  # ---- Axis range calculation ----
  axis_range <- reactive({
    pts <- points()
    if (nrow(pts) == 0) {
      return(list(x = c(-2, 18), y = c(-2, 18)))
    }
    x_min <- min(pts$x)
    x_max <- max(pts$x)
    y_min <- min(pts$y)
    y_max <- max(pts$y)
    pad_x <- max((x_max - x_min) * 0.15, 2)
    pad_y <- max((y_max - y_min) * 0.15, 2)
    list(
      x = c(x_min - pad_x, x_max + pad_x),
      y = c(y_min - pad_y, y_max + pad_y)
    )
  })

  # ---- Scatter plot ----
  output$scatter_plot <- renderPlotly({
    pts <- points()
    st <- stats_data()
    ar <- axis_range()
    show_dev <- input$show_deviations

    shapes <- list()
    annotations <- list()

    # Add deviation shapes if enabled and we have results
    if (isTRUE(show_dev) && st$valid) {
      mean_x <- st$mean_x
      mean_y <- st$mean_y

      # Mean lines
      shapes <- c(shapes, list(
        list(
          type = "line",
          x0 = mean_x, x1 = mean_x,
          y0 = 0, y1 = 1, yref = "paper",
          line = list(color = "rgba(99,102,241,0.3)", width = 1.5, dash = "dash")
        ),
        list(
          type = "line",
          x0 = 0, x1 = 1, xref = "paper",
          y0 = mean_y, y1 = mean_y,
          line = list(color = "rgba(99,102,241,0.3)", width = 1.5, dash = "dash")
        )
      ))

      # Deviation rectangles
      for (i in seq_len(nrow(pts))) {
        fill_color <- if (st$products[i] >= 0) {
          "rgba(34,197,94,0.25)"
        } else {
          "rgba(239,68,68,0.25)"
        }
        shapes <- c(shapes, list(
          list(
            type = "rect",
            x0 = mean_x, y0 = mean_y,
            x1 = pts$x[i], y1 = pts$y[i],
            fillcolor = fill_color,
            line = list(width = 0),
            opacity = 0.4
          )
        ))
      }
    }

    # Build plot
    p <- plot_ly(source = "scatter") |>
      add_markers(
        x = if (nrow(pts) > 0) pts$x else numeric(0),
        y = if (nrow(pts) > 0) pts$y else numeric(0),
        marker = list(
          color = "#6366f1",
          size = 12,
          line = list(color = "white", width = 2),
          opacity = 0.9
        ),
        hovertemplate = "<b>(%{x:.2f}, %{y:.2f})</b><extra></extra>",
        name = "Dane"
      )

    # Add regression line if we have valid stats
    if (st$valid) {
      x_vals <- pts$x
      x_min <- min(x_vals)
      x_max <- max(x_vals)
      pad <- (x_max - x_min) * 0.2
      x_line <- c(x_min - pad, x_max + pad)
      y_line <- st$slope * x_line + st$intercept

      p <- p |> add_lines(
        x = x_line, y = y_line,
        line = list(color = "#ef4444", width = 2.5),
        hoverinfo = "skip",
        name = "Regresja"
      )
    }

    p <- p |> layout(
      xaxis = list(
        title = "X",
        range = ar$x,
        gridcolor = "#e2e8f0",
        zeroline = TRUE,
        zerolinecolor = "#cbd5e1",
        zerolinewidth = 1
      ),
      yaxis = list(
        title = "Y",
        range = ar$y,
        gridcolor = "#e2e8f0",
        zeroline = TRUE,
        zerolinecolor = "#cbd5e1",
        zerolinewidth = 1
      ),
      plot_bgcolor = "#f8fafc",
      paper_bgcolor = "transparent",
      margin = list(t = 20, b = 50, l = 60, r = 20),
      showlegend = FALSE,
      hovermode = "closest",
      dragmode = FALSE,
      shapes = shapes
    ) |>
      config(
        responsive = TRUE,
        displayModeBar = FALSE,
        displaylogo = FALSE,
        scrollZoom = FALSE,
        doubleClick = FALSE
      ) |>
      htmlwidgets::onRender("
        function(el, x) {
          // Capture clicks on empty plot area to add points
          el.addEventListener('click', function(evt) {
            var target = evt.target;
            var isPlotArea = false;
            var check = target;
            while (check && check !== el) {
              if (check.classList && (check.classList.contains('nsewdrag') || check.classList.contains('drag'))) {
                isPlotArea = true;
                break;
              }
              check = check.parentElement;
            }
            if (!isPlotArea) return;

            var xaxis = el._fullLayout.xaxis;
            var yaxis = el._fullLayout.yaxis;
            var bb = el.getBoundingClientRect();
            var px = xaxis.p2d(evt.clientX - bb.left - el._fullLayout.margin.l);
            var py = yaxis.p2d(evt.clientY - bb.top - el._fullLayout.margin.t);

            var xRange = xaxis.range;
            var yRange = yaxis.range;
            if (px < Math.min(xRange[0], xRange[1]) || px > Math.max(xRange[0], xRange[1])) return;
            if (py < Math.min(yRange[0], yRange[1]) || py > Math.max(yRange[0], yRange[1])) return;
            if (isNaN(px) || isNaN(py)) return;

            Shiny.setInputValue('plot_add_point', {x: px, y: py}, {priority: 'event'});
          });
        }
      ")

    p
  })

  # ---- Stats outputs ----

  # r display (colored box)
  output$r_display <- renderUI({
    st <- stats_data()
    if (!st$valid) {
      div(class = "pc-r-box neutral",
        span(class = "label", "r = "),
        span(class = "value", "-")
      )
    } else {
      r_class <- if (st$r > 0) "positive" else if (st$r < 0) "negative" else "neutral"
      div(class = paste("pc-r-box", r_class),
        span(class = "label", "r = "),
        span(class = "value", formatC(st$r, format = "f", digits = 4))
      )
    }
  })

  output$stat_r2 <- renderText({
    st <- stats_data()
    if (!st$valid) return("-")
    formatC(st$r_sq, format = "f", digits = 4)
  })

  output$stat_pvalue <- renderText({
    st <- stats_data()
    if (!st$valid) return("-")
    format_pvalue(st$p_value)
  })

  output$stat_n <- renderText({
    st <- stats_data()
    as.character(st$n)
  })

  output$stat_df <- renderText({
    st <- stats_data()
    if (!st$valid) return("-")
    as.character(st$df)
  })

  # Interpretation box
  output$interpretation_box <- renderUI({
    st <- stats_data()
    if (!st$valid) {
      div(class = "pc-interp-box",
        "Dodaj co najmniej 3 punkty"
      )
    } else {
      interp_class <- if (st$direction == "dodatnia") {
        "positive"
      } else if (st$direction == "ujemna") {
        "negative"
      } else {
        "weak"
      }

      interp_text <- paste0(st$strength, " korelacja")
      if (st$direction == "dodatnia") {
        interp_text <- paste0(interp_text, " dodatnia")
      } else if (st$direction == "ujemna") {
        interp_text <- paste0(interp_text, " ujemna")
      }

      if (st$p_value < 0.05) {
        interp_text <- paste0(interp_text, " (istotna statystycznie, p < 0.05)")
      } else {
        interp_text <- paste0(interp_text, " (nieistotna statystycznie, p \u2265 0.05)")
      }

      div(class = paste("pc-interp-box", interp_class), interp_text)
    }
  })

  # Regression equation
  output$regression_eq <- renderUI({
    st <- stats_data()
    if (!st$valid) {
      div(class = "pc-regression-eq",
        span(class = "lbl", "Linia regresji:"),
        span(class = "val", "-")
      )
    } else {
      slope_str <- formatC(st$slope, format = "f", digits = 4)
      if (st$intercept >= 0) {
        intercept_str <- paste0("+ ", formatC(st$intercept, format = "f", digits = 4))
      } else {
        intercept_str <- paste0("- ", formatC(abs(st$intercept), format = "f", digits = 4))
      }
      eq <- paste0("y\u0302 = ", slope_str, "\u00b7x ", intercept_str)
      div(class = "pc-regression-eq",
        span(class = "lbl", "Linia regresji:"),
        span(class = "val", eq)
      )
    }
  })

  # Means
  output$stat_mean_x <- renderText({
    st <- stats_data()
    if (!st$valid) return("-")
    formatC(st$mean_x, format = "f", digits = 4)
  })

  output$stat_mean_y <- renderText({
    st <- stats_data()
    if (!st$valid) return("-")
    formatC(st$mean_y, format = "f", digits = 4)
  })

  # Formula box
  output$formula_box <- renderUI({
    st <- stats_data()

    static_formula <- div(class = "formula-static",
      "r = ",
      span(class = "pc-frac",
        span(class = "num", HTML("&Sigma;(x<sub>i</sub> - x&#772;)(y<sub>i</sub> - y&#772;)")),
        span(class = "den", HTML("&radic;[&Sigma;(x<sub>i</sub> - x&#772;)&sup2; &middot; &Sigma;(y<sub>i</sub> - y&#772;)&sup2;]"))
      )
    )

    if (!st$valid) {
      div(class = "pc-formula-box",
        div(class = "title", "Wz\u00f3r Pearsona:"),
        static_formula
      )
    } else {
      denom <- sqrt(st$sum_dx_sq * st$sum_dy_sq)
      computed <- div(class = "formula-computed",
        "r = ",
        span(class = "pc-frac",
          span(class = "num", formatC(st$sum_products, format = "f", digits = 4)),
          span(class = "den", paste0(
            "\u221a(", formatC(st$sum_dx_sq, format = "f", digits = 4),
            " \u00b7 ", formatC(st$sum_dy_sq, format = "f", digits = 4),
            ") = ", formatC(denom, format = "f", digits = 4)
          ))
        ),
        " = ",
        tags$strong(formatC(st$r, format = "f", digits = 4))
      )

      div(class = "pc-formula-box",
        div(class = "title", "Wz\u00f3r Pearsona:"),
        static_formula,
        computed
      )
    }
  })

  # ---- Data table ----
  output$data_table <- renderUI({
    pts <- points()
    st <- stats_data()

    if (nrow(pts) == 0) {
      return(NULL)
    }

    # Build header
    header <- tags$thead(
      tags$tr(
        tags$th("#"),
        tags$th(HTML("x<sub>i</sub>")),
        tags$th(HTML("y<sub>i</sub>")),
        tags$th(HTML("x<sub>i</sub> - x&#772;")),
        tags$th(HTML("y<sub>i</sub> - y&#772;")),
        tags$th(HTML("(x<sub>i</sub> - x&#772;)(y<sub>i</sub> - y&#772;)")),
        tags$th(HTML("(x<sub>i</sub> - x&#772;)&sup2;")),
        tags$th(HTML("(y<sub>i</sub> - y&#772;)&sup2;"))
      )
    )

    # Build body rows
    rows <- lapply(seq_len(nrow(pts)), function(i) {
      if (st$valid) {
        product_class <- if (st$products[i] >= 0) {
          "pc-table__product--positive"
        } else {
          "pc-table__product--negative"
        }
        tags$tr(
          tags$td(style = "color: #94a3b8; font-weight: 600;", i),
          tags$td(formatC(pts$x[i], format = "f", digits = 2)),
          tags$td(formatC(pts$y[i], format = "f", digits = 2)),
          tags$td(formatC(st$dx[i], format = "f", digits = 4)),
          tags$td(formatC(st$dy[i], format = "f", digits = 4)),
          tags$td(class = product_class, formatC(st$products[i], format = "f", digits = 4)),
          tags$td(formatC(st$dx_sq[i], format = "f", digits = 4)),
          tags$td(formatC(st$dy_sq[i], format = "f", digits = 4))
        )
      } else {
        tags$tr(
          tags$td(style = "color: #94a3b8; font-weight: 600;", i),
          tags$td(formatC(pts$x[i], format = "f", digits = 2)),
          tags$td(formatC(pts$y[i], format = "f", digits = 2)),
          tags$td("-"), tags$td("-"), tags$td("-"), tags$td("-"), tags$td("-")
        )
      }
    })

    body <- tags$tbody(rows)

    # Build footer with sums
    foot <- if (st$valid) {
      sum_product_class <- if (st$sum_products >= 0) {
        "pc-table__product--positive"
      } else {
        "pc-table__product--negative"
      }
      tags$tfoot(
        tags$tr(class = "pc-table__sum-row",
          tags$td(colspan = "3", tags$strong("\u03a3")),
          tags$td("-"),
          tags$td("-"),
          tags$td(class = sum_product_class,
                  tags$strong(formatC(st$sum_products, format = "f", digits = 4))),
          tags$td(tags$strong(formatC(st$sum_dx_sq, format = "f", digits = 4))),
          tags$td(tags$strong(formatC(st$sum_dy_sq, format = "f", digits = 4)))
        )
      )
    } else {
      NULL
    }

    tags$table(class = "pc-table",
      header,
      body,
      foot
    )
  })
}

shinyApp(ui = ui, server = server)
