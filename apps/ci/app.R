# Przedziały Ufności - interaktywny quiz (Shiny app)
# Port z toys/confidence_intervals/ (Flask + D3.js)

library(shiny)
library(plotly)
library(bslib)
library(jsonlite)

source(file.path("..", "shared", "theme.R"), local = TRUE)
source(file.path("..", "shared", "helpers.R"), local = TRUE)

# ============================================================
# DANE
# ============================================================
CI_CONFIG <- fromJSON(file.path("data", "ci_config.json"), simplifyVector = FALSE)$modes
QUESTIONS <- list(
  single_interval = fromJSON(file.path("data", "single_interval.json"), simplifyVector = FALSE)$questions,
  two_intervals = fromJSON(file.path("data", "two_intervals.json"), simplifyVector = FALSE)$questions
)
MAX_QUESTIONS <- 10

# ============================================================
# HELPER: CI visualization with plotly
# ============================================================
draw_single_interval <- function(q, is_answered = FALSE, is_correct = FALSE) {
  ci_lower <- q$ci_lower
  ci_upper <- q$ci_upper
  tested_value <- q$tested_value
  unit <- q$unit %||% ""
  comparison <- q$comparison

  padding <- (ci_upper - ci_lower) * 0.5
  x_min <- min(ci_lower, tested_value) - padding
  x_max <- max(ci_upper, tested_value) + padding

  ci_color <- if (is_answered) { if (is_correct) "#27AE60" else "#E74C3C" } else "#4A90E2"
  val_color <- if (is_answered) "#E74C3C" else "#F39C12"

  shapes <- list(
    # CI rectangle
    list(type = "rect", x0 = ci_lower, x1 = ci_upper, y0 = 0.3, y1 = 0.7,
         fillcolor = ci_color, opacity = 0.3,
         line = list(color = ci_color, width = 2))
  )

  annotations <- list(
    list(x = (ci_lower + ci_upper) / 2, y = 0.85, text = sprintf("CI 95%%: [%s; %s]", ci_lower, ci_upper),
         showarrow = FALSE, font = list(size = 12, color = ci_color, weight = "bold"))
  )

  # Tested value region
  if (comparison == "greater") {
    shapes <- c(shapes, list(
      list(type = "rect", x0 = tested_value, x1 = x_max, y0 = -0.5, y1 = -0.1,
           fillcolor = val_color, opacity = 0.15,
           line = list(color = val_color, width = 2, dash = "dash")),
      list(type = "line", x0 = tested_value, x1 = tested_value, y0 = -0.5, y1 = -0.1,
           line = list(color = val_color, width = 3))
    ))
    annotations <- c(annotations, list(
      list(x = (tested_value + x_max) / 2, y = -0.65, text = sprintf("Pytanie: > %s", tested_value),
           showarrow = FALSE, font = list(size = 11, color = val_color, weight = "bold"))
    ))
  } else if (comparison == "less") {
    shapes <- c(shapes, list(
      list(type = "rect", x0 = x_min, x1 = tested_value, y0 = -0.5, y1 = -0.1,
           fillcolor = val_color, opacity = 0.15,
           line = list(color = val_color, width = 2, dash = "dash")),
      list(type = "line", x0 = tested_value, x1 = tested_value, y0 = -0.5, y1 = -0.1,
           line = list(color = val_color, width = 3))
    ))
    annotations <- c(annotations, list(
      list(x = (x_min + tested_value) / 2, y = -0.65, text = sprintf("Pytanie: < %s", tested_value),
           showarrow = FALSE, font = list(size = 11, color = val_color, weight = "bold"))
    ))
  }

  plot_ly(type = "scatter", mode = "none") |>
    layout(
      xaxis = list(range = c(x_min, x_max), title = if (unit != "") paste0("Wartość (", unit, ")") else "",
                    gridcolor = "#e0e0e0"),
      yaxis = list(range = c(-1, 1.2), showticklabels = FALSE, showgrid = FALSE, zeroline = FALSE, title = ""),
      shapes = shapes, annotations = annotations,
      plot_bgcolor = "#f8fafc", paper_bgcolor = "#f8fafc",
      margin = list(t = 20, b = 50, l = 20, r = 20),
      height = 200
    ) |>
    config(displayModeBar = FALSE, responsive = TRUE)
}

draw_two_intervals <- function(q, is_answered = FALSE, is_correct = FALSE) {
  ci1_color <- if (is_answered) { if (is_correct) "#27AE60" else "#E74C3C" } else "#4A90E2"
  ci2_color <- if (is_answered) { if (is_correct) "#27AE60" else "#E74C3C" } else "#F39C12"

  all_vals <- c(q$ci1_lower, q$ci1_upper, q$ci2_lower, q$ci2_upper)
  x_min <- min(all_vals) - 5
  x_max <- max(all_vals) + 5

  shapes <- list(
    list(type = "rect", x0 = q$ci1_lower, x1 = q$ci1_upper, y0 = 0.5, y1 = 0.9,
         fillcolor = ci1_color, opacity = 0.3, line = list(color = ci1_color, width = 2)),
    list(type = "rect", x0 = q$ci2_lower, x1 = q$ci2_upper, y0 = -0.1, y1 = 0.3,
         fillcolor = ci2_color, opacity = 0.3, line = list(color = ci2_color, width = 2))
  )

  annotations <- list(
    list(x = (q$ci1_lower + q$ci1_upper) / 2, y = 1.05,
         text = sprintf("%s: [%s; %s]", q$ci1_label, q$ci1_lower, q$ci1_upper),
         showarrow = FALSE, font = list(size = 11, color = ci1_color)),
    list(x = (q$ci2_lower + q$ci2_upper) / 2, y = -0.25,
         text = sprintf("%s: [%s; %s]", q$ci2_label, q$ci2_lower, q$ci2_upper),
         showarrow = FALSE, font = list(size = 11, color = ci2_color))
  )

  # Overlap/separation indicator after answer
  if (is_answered) {
    overlap_lower <- max(q$ci1_lower, q$ci2_lower)
    overlap_upper <- min(q$ci1_upper, q$ci2_upper)

    if (overlap_lower < overlap_upper) {
      highlight_color <- if (is_correct) "#F1C40F" else "#E74C3C"
      shapes <- c(shapes, list(
        list(type = "rect", x0 = overlap_lower, x1 = overlap_upper, y0 = -0.1, y1 = 0.9,
             fillcolor = highlight_color, opacity = 0.2,
             line = list(color = highlight_color, width = 2, dash = "dash"))
      ))
      annotations <- c(annotations, list(
        list(x = (overlap_lower + overlap_upper) / 2, y = 0.4,
             text = "\u2195 Nakładają się", showarrow = FALSE,
             font = list(size = 10, color = highlight_color, weight = "bold"))
      ))
    } else {
      highlight_color <- if (is_correct) "#27AE60" else "#E74C3C"
      sep_x <- (min(q$ci1_upper, q$ci2_upper) + max(q$ci1_lower, q$ci2_lower)) / 2
      annotations <- c(annotations, list(
        list(x = sep_x, y = 0.4, text = "Rozdzielone", showarrow = FALSE,
             font = list(size = 10, color = highlight_color, weight = "bold"))
      ))
    }
  }

  plot_ly(type = "scatter", mode = "none") |>
    layout(
      xaxis = list(range = c(x_min, x_max),
                    title = if (!is.null(q$unit) && q$unit != "") paste0("Wartość (", q$unit, ")") else "",
                    gridcolor = "#e0e0e0"),
      yaxis = list(range = c(-0.5, 1.3), showticklabels = FALSE, showgrid = FALSE, zeroline = FALSE, title = ""),
      shapes = shapes, annotations = annotations,
      plot_bgcolor = "#f8fafc", paper_bgcolor = "#f8fafc",
      margin = list(t = 20, b = 50, l = 80, r = 20),
      height = 200
    ) |>
    config(displayModeBar = FALSE, responsive = TRUE)
}

# ============================================================
# UI
# ============================================================
ui <- page_fluid(
  theme = st_theme(),
  class = "st-page",

  div(class = "st-card st-card--narrow", id = "app-container",

    # SCREEN: Menu
    uiOutput("menu_screen"),

    # SCREEN: Quiz
    uiOutput("quiz_screen"),

    # SCREEN: Summary
    uiOutput("summary_screen")
  )
)

# ============================================================
# SERVER
# ============================================================
server <- function(input, output, session) {

  # State
  state <- reactiveValues(
    screen = "menu",        # "menu", "start", "question", "summary"
    mode_id = NULL,
    remaining = list(),
    questions = list(),
    total = 0,
    correct = 0,
    wrong = 0,
    hints_used = 0,
    current_q = NULL,
    answered = FALSE,
    is_correct = FALSE,
    user_answer = NULL,
    hint_text = NULL
  )

  # ---- MENU SCREEN ----
  output$menu_screen <- renderUI({
    req(state$screen == "menu")

    div(
      div(class = "st-header",
        h1("Przedziały Ufności"),
        p("Naucz się interpretować przedziały ufności")
      ),
      div(class = "st-menu-grid",
        lapply(CI_CONFIG, function(mode) {
          div(class = "st-menu-card",
            onclick = sprintf("Shiny.setInputValue('select_mode', '%s', {priority: 'event'})", mode$id),
            div(class = "emoji", mode$emoji),
            h3(mode$name),
            p(mode$description)
          )
        })
      )
    )
  })

  # Mode selection
  observeEvent(input$select_mode, {
    mode_id <- input$select_mode
    questions <- QUESTIONS[[mode_id]]
    ids <- sample(sapply(questions, function(q) q$id), min(MAX_QUESTIONS, length(questions)))

    state$mode_id <- mode_id
    state$questions <- questions
    state$remaining <- as.list(ids)
    state$total <- length(ids)
    state$correct <- 0
    state$wrong <- 0
    state$hints_used <- 0
    state$answered <- FALSE
    state$hint_text <- NULL
    state$screen <- "question"

    load_next_question()
  })

  load_next_question <- function() {
    if (length(state$remaining) == 0) {
      state$screen <- "summary"
      return()
    }

    next_id <- state$remaining[[1]]
    state$remaining <- state$remaining[-1]
    state$current_q <- Filter(function(q) q$id == next_id, state$questions)[[1]]
    state$answered <- FALSE
    state$is_correct <- FALSE
    state$user_answer <- NULL
    state$hint_text <- NULL
  }

  # ---- QUIZ SCREEN ----
  output$quiz_screen <- renderUI({
    req(state$screen == "question")
    q <- state$current_q
    req(q)

    mode_config <- Filter(function(m) m$id == state$mode_id, CI_CONFIG)[[1]]
    answered_count <- state$correct + state$wrong
    progress_pct <- if (state$total > 0) round(answered_count / state$total * 100) else 0

    tagList(
      # Header nav
      div(style = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;",
        actionButton("back_to_menu", "\u2190 Menu", class = "st-btn-ghost"),
        span(class = "st-badge", sprintf("Pytanie %d/%d", answered_count + 1, state$total)),
        span(class = "st-badge", sprintf("\u2705 %d  \u274c %d", state$correct, state$wrong))
      ),

      # Progress bar
      div(class = "st-progress",
        div(class = "st-progress-fill", style = sprintf("width: %d%%;", progress_pct))
      ),

      # Question
      div(class = "st-question", p(q$question)),

      # Visualization
      div(class = "st-visualization",
        plotlyOutput("ci_plot", height = "200px")
      ),

      # Answer buttons
      div(class = "st-answer-grid",
        lapply(mode_config$answers, function(ans) {
          answer_value <- switch(ans,
            "TAK" = if (!is.null(q$comparison) && q$comparison == "greater") "tak_wieksze"
                    else if (!is.null(q$comparison) && q$comparison == "less") "tak_mniejsze"
                    else "tak_wieksze",
            "NIE" = "nie",
            "NIE MOŻNA POWIEDZIEĆ" = "nie_mozna_powiedziec",
            tolower(ans)
          )

          btn_class <- "st-btn-answer st-btn-ci"
          if (state$answered) {
            if (answer_value == q$correct) {
              btn_class <- paste(btn_class, "correct")
            } else if (answer_value == state$user_answer) {
              btn_class <- paste(btn_class, "incorrect")
            } else {
              btn_class <- paste(btn_class, "dimmed")
            }
          }

          tags$button(
            class = btn_class,
            disabled = if (state$answered) "disabled" else NULL,
            onclick = sprintf("Shiny.setInputValue('answer_click', '%s', {priority: 'event'})", answer_value),
            ans
          )
        })
      ),

      # Hint button (before answer)
      if (!state$answered) {
        div(style = "text-align: center; margin-bottom: 16px;",
          actionButton("hint_btn", "Podpowiedź", class = "st-btn-ghost")
        )
      },

      # Hint text
      if (!is.null(state$hint_text)) {
        div(class = "st-warning", state$hint_text)
      },

      # Feedback (after answer)
      if (state$answered) {
        feedback_class <- if (state$is_correct) "st-feedback st-feedback-correct" else "st-feedback st-feedback-incorrect"
        header_text <- if (state$is_correct) "\u2705 Poprawna odpowiedź!" else "\u274c Niepoprawna odpowiedź"

        tagList(
          div(class = feedback_class,
            h4(header_text),
            p(q$explanation)
          ),
          div(style = "text-align: center; margin-top: 24px;",
            actionButton("next_question", "Następne pytanie \u2192", class = "st-btn-primary")
          )
        )
      }
    )
  })

  # CI plot
  output$ci_plot <- renderPlotly({
    q <- state$current_q
    req(q)

    if (state$mode_id == "single_interval") {
      draw_single_interval(q, state$answered, state$is_correct)
    } else {
      draw_two_intervals(q, state$answered, state$is_correct)
    }
  })

  # Answer handler
  observeEvent(input$answer_click, {
    req(!state$answered)
    q <- state$current_q
    req(q)

    state$user_answer <- input$answer_click
    state$is_correct <- (input$answer_click == q$correct)
    state$answered <- TRUE

    if (state$is_correct) {
      state$correct <- state$correct + 1
    } else {
      state$wrong <- state$wrong + 1
    }
  })

  # Hint handler
  observeEvent(input$hint_btn, {
    q <- state$current_q
    req(q)

    if (state$mode_id == "single_interval") {
      state$hint_text <- sprintf(
        "Sprawdź, czy wartość testowana %s %s znajduje się wewnątrz przedziału [%s; %s]",
        q$tested_value, q$unit %||% "", q$ci_lower, q$ci_upper
      )
    } else {
      state$hint_text <- "Sprawdź, czy przedziały się nakładają"
    }
    state$hints_used <- state$hints_used + 1
  })

  # Next question
  observeEvent(input$next_question, {
    load_next_question()
  })

  # Back to menu
  observeEvent(input$back_to_menu, {
    state$screen <- "menu"
  })

  # ---- SUMMARY SCREEN ----
  output$summary_screen <- renderUI({
    req(state$screen == "summary")

    total <- state$correct + state$wrong
    pct <- if (total > 0) round(state$correct / total * 100, 1) else 0
    bar_class <- if (pct >= 80) "excellent" else if (pct >= 50) "good" else "needs-work"

    div(
      div(class = "st-header",
        h1("Przedziały Ufności"),
        p("Wyniki quizu")
      ),
      div(class = "st-score",
        h2(style = "color: var(--st-color-primary); margin-bottom: 24px;", "Twój wynik"),
        div(class = "st-score-value", sprintf("%s%%", pct)),
        p(style = "font-size: 1.125rem; color: var(--st-color-text-secondary); margin-bottom: 24px;",
          sprintf("Poprawne: %d / %d", state$correct, total)
        ),
        div(class = "st-score-bar",
          div(class = paste("st-score-bar-fill", bar_class), style = sprintf("width: %s%%;", pct))
        ),
        div(style = "display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;",
          actionButton("retry_quiz", "Spróbuj ponownie", class = "st-btn-primary"),
          actionButton("back_to_menu_summary", "\u2190 Menu", class = "st-btn-secondary")
        )
      )
    )
  })

  # Retry
  observeEvent(input$retry_quiz, {
    mode_id <- state$mode_id
    questions <- QUESTIONS[[mode_id]]
    ids <- sample(sapply(questions, function(q) q$id), min(MAX_QUESTIONS, length(questions)))

    state$remaining <- as.list(ids)
    state$total <- length(ids)
    state$correct <- 0
    state$wrong <- 0
    state$hints_used <- 0
    state$screen <- "question"
    load_next_question()
  })

  observeEvent(input$back_to_menu_summary, {
    state$screen <- "menu"
  })
}

shinyApp(ui = ui, server = server)
