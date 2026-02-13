# Histogram - Rozkład Normalny (Shiny app)
# Port z toys/histogram/ (Flask + Plotly.js)

library(shiny)
library(plotly)
library(bslib)

source(file.path("..", "shared", "theme.R"), local = TRUE)
source(file.path("..", "shared", "helpers.R"), local = TRUE)

# ============================================================
# UI
# ============================================================
ui <- page_fluid(
  theme = st_theme(),
  class = "st-page",

  div(class = "st-card st-card--wide",

    # Header
    div(class = "st-header",
      h1("Rozkład Normalny"),
      p("Generuj próbki z rozkładu normalnego i obserwuj histogram")
    ),

    # 2-column layout
    layout_columns(
      col_widths = c(3, 9),
      fill = FALSE,

      # Sidebar - parametry
      div(class = "st-sidebar",
        h3("Parametry"),

        sliderInput("n", "Liczba próbek (n)",
          min = 10, max = 10000, value = 100, step = 10
        ),

        numericInput("mean", "Średnia (\u03bc)", value = 0, step = 0.1),

        numericInput("sd", "Odchylenie std. (\u03c3)", value = 1, min = 0.01, step = 0.1),

        numericInput("binwidth", "Szerokość binu (puste = auto)",
          value = NA, min = 0.01, step = 0.1
        ),

        actionButton("regenerate", "Regeneruj",
          class = "st-btn-primary", style = "width: 100%; margin-top: 16px;"
        ),

        downloadButton("export_csv", "Eksport CSV",
          class = "st-btn-ghost", style = "width: 100%; margin-top: 8px;"
        )
      ),

      # Main content
      div(
        # Plot
        div(style = "background: #f8fafc; border-radius: 14px; padding: 16px; margin-bottom: 32px; min-height: 450px;",
          plotlyOutput("histogram_plot", height = "450px")
        ),

        # Stats panel
        div(class = "st-stats",
          h3("Statystyki opisowe"),
          layout_columns(
            col_widths = c(3, 3, 3, 3, 3, 3, 3),
            div(class = "st-stat-item",
              span(class = "st-stat-label", "ŚREDNIA"),
              span(class = "st-stat-value", textOutput("stat_mean", inline = TRUE))
            ),
            div(class = "st-stat-item",
              span(class = "st-stat-label", "ODCH. STD."),
              span(class = "st-stat-value", textOutput("stat_sd", inline = TRUE))
            ),
            div(class = "st-stat-item",
              span(class = "st-stat-label", "MEDIANA"),
              span(class = "st-stat-value", textOutput("stat_median", inline = TRUE))
            ),
            div(class = "st-stat-item",
              span(class = "st-stat-label", "MIN"),
              span(class = "st-stat-value", textOutput("stat_min", inline = TRUE))
            ),
            div(class = "st-stat-item",
              span(class = "st-stat-label", "Q1 (25%)"),
              span(class = "st-stat-value", textOutput("stat_q25", inline = TRUE))
            ),
            div(class = "st-stat-item",
              span(class = "st-stat-label", "Q3 (75%)"),
              span(class = "st-stat-value", textOutput("stat_q75", inline = TRUE))
            ),
            div(class = "st-stat-item",
              span(class = "st-stat-label", "MAX"),
              span(class = "st-stat-value", textOutput("stat_max", inline = TRUE))
            )
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

  # Reaktywne wartości
  samples <- reactiveVal(NULL)
  trigger <- reactiveVal(0)

  # Debounce parametrów (300ms)
  params <- reactive({
    list(
      n = input$n,
      mean = input$mean,
      sd = input$sd,
      binwidth = input$binwidth
    )
  }) |> debounce(300)

  # Generuj próbkę gdy parametry się zmienią lub kliknieto regeneruj
  observe({
    p <- params()
    trigger()

    n <- p$n
    mu <- p$mean
    sigma <- p$sd

    # Walidacja
    req(n >= 10, n <= 10000, sigma > 0)

    s <- rnorm(n, mean = mu, sd = sigma)
    samples(s)
  })

  # Klik na regeneruj
  observeEvent(input$regenerate, {
    trigger(trigger() + 1)
  })

  # Histogram plot
  output$histogram_plot <- renderPlotly({
    s <- samples()
    req(s)

    p <- params()
    mu <- p$mean
    sigma <- p$sd
    n <- length(s)
    bw <- p$binwidth

    # Oblicz biny
    fixed_range <- c(-10, 10)

    if (!is.na(bw) && !is.null(bw) && bw > 0) {
      # Manual binwidth
      n_bins <- ceiling((fixed_range[2] - fixed_range[1]) / bw)
      n_bins <- min(max(n_bins, 5), 200)
    } else {
      # Auto (Sturges)
      n_bins <- ceiling(log2(n) + 1)
      n_bins <- min(max(n_bins, 10), 50)
    }

    h <- hist(s, breaks = seq(fixed_range[1], fixed_range[2], length.out = n_bins + 1),
              plot = FALSE)

    bin_width <- h$breaks[2] - h$breaks[1]

    # Krzywa teoretyczna
    x_curve <- seq(-10, 10, length.out = 200)
    y_curve <- dnorm(x_curve, mean = mu, sd = sigma) * n * bin_width

    # Plotly
    plot_ly() |>
      add_bars(
        x = h$mids, y = h$counts,
        width = bin_width * 0.98,
        name = "Histogram",
        marker = list(color = "#6366f1", line = list(color = "#4f46e5", width = 0)),
        hovertemplate = paste0(
          "<b>Przedział:</b> %{x:.2f}<br>",
          "<b>Częstość:</b> %{y}<extra></extra>"
        )
      ) |>
      add_trace(
        x = x_curve, y = y_curve,
        type = "scatter", mode = "lines",
        name = "Krzywa teoretyczna",
        line = list(color = "#8b5cf6", width = 3, shape = "spline"),
        hovertemplate = paste0(
          "<b>x:</b> %{x:.2f}<br>",
          "<b>Gęstość:</b> %{y:.2f}<extra></extra>"
        )
      ) |>
      layout(
        title = list(
          text = sprintf("Rozkład Normalny N(%s, %s\u00b2)", mu, sigma),
          font = list(size = 20, family = "Arial, sans-serif")
        ),
        xaxis = list(
          title = "Wartość",
          range = fixed_range,
          gridcolor = "#e0e0e0",
          zeroline = TRUE, zerolinecolor = "#999"
        ),
        yaxis = list(
          title = "Częstość",
          gridcolor = "#e0e0e0"
        ),
        plot_bgcolor = "#f8fafc",
        paper_bgcolor = "#f8fafc",
        margin = list(t = 60, b = 60, l = 70, r = 40),
        showlegend = TRUE,
        legend = list(
          x = 1, xanchor = "right", y = 1,
          bgcolor = "rgba(255, 255, 255, 0.8)",
          bordercolor = "#ddd", borderwidth = 1
        ),
        hovermode = "closest"
      ) |>
      config(
        responsive = TRUE,
        displayModeBar = FALSE,
        displaylogo = FALSE
      )
  })

  # Statystyki
  output$stat_mean <- renderText({
    s <- samples(); req(s); formatC(mean(s), format = "f", digits = 3)
  })
  output$stat_sd <- renderText({
    s <- samples(); req(s); formatC(sd(s), format = "f", digits = 3)
  })
  output$stat_median <- renderText({
    s <- samples(); req(s); formatC(median(s), format = "f", digits = 3)
  })
  output$stat_min <- renderText({
    s <- samples(); req(s); formatC(min(s), format = "f", digits = 2)
  })
  output$stat_q25 <- renderText({
    s <- samples(); req(s); formatC(quantile(s, 0.25), format = "f", digits = 2)
  })
  output$stat_q75 <- renderText({
    s <- samples(); req(s); formatC(quantile(s, 0.75), format = "f", digits = 2)
  })
  output$stat_max <- renderText({
    s <- samples(); req(s); formatC(max(s), format = "f", digits = 2)
  })

  # Eksport CSV
  output$export_csv <- downloadHandler(
    filename = function() "histogram_data.csv",
    content = function(file) {
      s <- samples()
      if (is.null(s)) return()
      df <- data.frame(index = seq_along(s) - 1, value = s)
      write.csv(df, file, row.names = FALSE)
    }
  )
}

shinyApp(ui = ui, server = server)
