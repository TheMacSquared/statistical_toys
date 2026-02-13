# Quiz App - 5 typów quizów statystycznych (Shiny app)
# Port z toys/quiz_app/ (Flask)

library(shiny)
library(bslib)
library(jsonlite)

source(file.path("..", "shared", "theme.R"), local = TRUE)
source(file.path("..", "shared", "helpers.R"), local = TRUE)

# ============================================================
# DANE
# ============================================================
QUIZ_CONFIG <- fromJSON(file.path("data", "quiz_config.json"), simplifyVector = FALSE)$quizzes

QUESTIONS_CACHE <- list()
for (qc in QUIZ_CONFIG) {
  path <- file.path("data", qc$file)
  QUESTIONS_CACHE[[qc$id]] <- fromJSON(path, simplifyVector = FALSE)$questions
}

ERRORS_INFO_CACHE <- list()
MAX_QUESTIONS <- 10

load_errors_info <- function(errors_file) {
  if (!is.null(ERRORS_INFO_CACHE[[errors_file]])) return(ERRORS_INFO_CACHE[[errors_file]])
  data <- fromJSON(file.path("data", errors_file), simplifyVector = FALSE)
  ERRORS_INFO_CACHE[[errors_file]] <<- data
  data
}

# ============================================================
# HELPER: Format interpretation results
# ============================================================
format_interpretation_results <- function(question) {
  results <- question$results
  test_type <- question$test_type
  unit <- question$unit %||% ""
  unit_str <- if (unit != "") paste0(" ", unit) else ""

  lines <- character()

  if (test_type == "t_jednej_proby") {
    lines <- c(lines,
      sprintf("Średnia w próbie: %s%s", results$mean, unit_str),
      sprintf("Odchylenie standardowe: %s%s", results$sd, unit_str),
      sprintf("Liczebność próby: n = %s", results$n),
      sprintf("Wynik testu: %s, p = %s", results$test_stat, results$p_value)
    )
  } else if (test_type == "proporcji") {
    lines <- c(lines,
      sprintf("Odsetek w próbie: %d%%", as.integer(results$proportion * 100)),
      sprintf("Liczebność próby: n = %s", results$n),
      sprintf("Wynik testu: %s, p = %s", results$test_stat, results$p_value)
    )
  } else if (test_type == "t_dwoch_prob") {
    lines <- c(lines,
      sprintf("Grupa '%s': średnia = %s%s (odch. std. = %s), n = %s",
              results$label1, results$mean1, unit_str, results$sd1, results$n1),
      sprintf("Grupa '%s': średnia = %s%s (odch. std. = %s), n = %s",
              results$label2, results$mean2, unit_str, results$sd2, results$n2),
      sprintf("Wynik testu: %s, p = %s", results$test_stat, results$p_value)
    )
  } else if (test_type == "korelacja") {
    lines <- c(lines,
      sprintf("Współczynnik korelacji: r = %s", results$r),
      sprintf("Liczebność próby: n = %s", results$n),
      sprintf("Wynik testu: %s, p = %s", results$test_stat, results$p_value)
    )
  } else if (test_type == "chi_kwadrat") {
    lines <- c(lines,
      sprintf("Liczebność próby: n = %s", results$n),
      sprintf("Wynik testu: %s, p = %s", results$test_stat, results$p_value)
    )
  } else if (test_type == "anova") {
    means <- results$means
    if (!is.null(means)) {
      for (group in names(means)) {
        lines <- c(lines, sprintf("Grupa '%s': średnia = %s%s", group, means[[group]], unit_str))
      }
    }
    if (!is.null(results$n_per_group)) {
      lines <- c(lines, sprintf("Liczebność grup: n = %s każda", results$n_per_group))
    }
    lines <- c(lines, sprintf("Wynik testu: %s, p = %s", results$test_stat, results$p_value))
  }

  lines
}

# ============================================================
# HELPER: Prepare question options
# ============================================================
prepare_options <- function(question, quiz_config) {
  answer_type <- quiz_config$answer_type

  if (answer_type == "interpretation") {
    # Interpretation quiz — answers are in the question
    answers <- question$answers
    shuffled <- sample(answers)
    return(lapply(shuffled, function(a) list(text = a$text, value = a$text)))
  }

  if (answer_type == "multiple_choice_4" && !is.null(quiz_config$options)) {
    # Fixed 4 options
    opts <- quiz_config$options
    shuffled <- sample(opts)
    return(lapply(shuffled, function(o) list(text = o$label, value = o$value)))
  }

  if (answer_type == "multiple_choice_3" && !is.null(quiz_config$options)) {
    # Fixed 3 options
    opts <- quiz_config$options
    shuffled <- sample(opts)
    return(lapply(shuffled, function(o) list(text = o$label, value = o$value)))
  }

  if (answer_type == "multiple_choice_random") {
    # Random options from all_options (question level) or quiz level
    correct <- question$correct
    all_opts <- question$all_options

    if (is.null(all_opts) && !is.null(quiz_config$all_options)) {
      all_opts <- quiz_config$all_options
    }

    if (!is.null(all_opts)) {
      other_opts <- setdiff(unlist(all_opts), correct)
      n_wrong <- if (length(all_opts) <= 4) length(other_opts) else 2
      selected_wrong <- sample(other_opts, min(n_wrong, length(other_opts)))
      selected <- sample(c(selected_wrong, correct))
      return(lapply(selected, function(o) list(text = o, value = o)))
    }
  }

  # Fallback
  list()
}

# ============================================================
# UI
# ============================================================
ui <- page_fluid(
  theme = st_theme(),
  class = "st-page",

  div(class = "st-card st-card--narrow", id = "app-container",
    uiOutput("menu_screen"),
    uiOutput("start_screen"),
    uiOutput("question_screen"),
    uiOutput("summary_screen"),
    uiOutput("errors_screen")
  )
)

# ============================================================
# SERVER
# ============================================================
server <- function(input, output, session) {

  state <- reactiveValues(
    screen = "menu",       # "menu", "start", "question", "summary", "errors"
    quiz_id = NULL,
    quiz_config = NULL,
    questions = list(),
    remaining = list(),
    total = 0,
    correct = 0,
    wrong = 0,
    current_q = NULL,
    current_options = list(),
    answered = FALSE,
    is_correct = FALSE,
    user_answer = NULL,
    feedback_text = "",
    correct_answer = ""
  )

  # ---- MENU SCREEN ----
  output$menu_screen <- renderUI({
    req(state$screen == "menu")

    div(
      div(class = "st-header",
        h1("Quizy Statystyczne"),
        p("Sprawdź swoją wiedzę ze statystyki")
      ),
      div(class = "st-menu-grid",
        lapply(QUIZ_CONFIG, function(qc) {
          div(class = "st-menu-card",
            onclick = sprintf("Shiny.setInputValue('select_quiz', '%s', {priority: 'event'})", qc$id),
            div(class = "emoji", qc$emoji),
            h3(qc$name),
            p(qc$description)
          )
        })
      )
    )
  })

  # Quiz selection
  observeEvent(input$select_quiz, {
    quiz_id <- input$select_quiz
    qc <- Filter(function(q) q$id == quiz_id, QUIZ_CONFIG)[[1]]

    state$quiz_id <- quiz_id
    state$quiz_config <- qc
    state$screen <- "start"
  })

  # ---- START SCREEN ----
  output$start_screen <- renderUI({
    req(state$screen == "start")
    qc <- state$quiz_config

    div(
      div(class = "st-header",
        h1(paste(qc$emoji, qc$name)),
        p(qc$description)
      ),
      div(style = "text-align: center; padding: 48px 24px;",
        p(style = "font-size: 1.125rem; color: var(--st-color-text-secondary); margin-bottom: 24px; line-height: 1.8;",
          sprintf("Quiz składa się z maksymalnie %d pytań losowanych z puli.", MAX_QUESTIONS),
          br(),
          "Po każdej odpowiedzi zobaczysz wyjaśnienie."
        ),
        actionButton("start_quiz", "Rozpocznij quiz", class = "st-btn-primary",
                      style = "padding: 16px 40px; font-size: 1.125rem;"),
        br(), br(),
        actionButton("back_from_start", "\u2190 Wróć do menu", class = "st-btn-ghost")
      )
    )
  })

  observeEvent(input$start_quiz, {
    quiz_id <- state$quiz_id
    questions <- QUESTIONS_CACHE[[quiz_id]]
    ids <- sample(sapply(questions, function(q) q$id), min(MAX_QUESTIONS, length(questions)))

    state$questions <- questions
    state$remaining <- as.list(ids)
    state$total <- length(ids)
    state$correct <- 0
    state$wrong <- 0
    state$answered <- FALSE
    state$screen <- "question"

    load_next_question()
  })

  observeEvent(input$back_from_start, { state$screen <- "menu" })

  load_next_question <- function() {
    if (length(state$remaining) == 0) {
      state$screen <- "summary"
      return()
    }

    next_id <- state$remaining[[1]]
    state$remaining <- state$remaining[-1]
    state$current_q <- Filter(function(q) q$id == next_id, state$questions)[[1]]
    state$current_options <- prepare_options(state$current_q, state$quiz_config)
    state$answered <- FALSE
    state$is_correct <- FALSE
    state$user_answer <- NULL
    state$feedback_text <- ""
    state$correct_answer <- ""
  }

  # ---- QUESTION SCREEN ----
  output$question_screen <- renderUI({
    req(state$screen == "question")
    q <- state$current_q
    qc <- state$quiz_config
    req(q)

    answered_count <- state$correct + state$wrong
    progress_pct <- if (state$total > 0) round(answered_count / state$total * 100) else 0

    is_interpretation <- (qc$answer_type == "interpretation")

    # Build question text
    if (is_interpretation) {
      result_lines <- format_interpretation_results(q)
      question_content <- tagList(
        p(style = "margin-bottom: 16px;", q$context),
        tags$ul(style = "list-style: none; padding: 0; margin: 0;",
          lapply(result_lines, function(line) {
            tags$li(style = "padding: 4px 0; color: var(--st-color-text-secondary);", line)
          })
        )
      )
    } else {
      question_content <- p(q$question)
    }

    tagList(
      # Header nav
      div(style = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;",
        actionButton("back_to_menu_q", "\u2190 Menu", class = "st-btn-ghost"),
        span(class = "st-badge", sprintf("Pytanie %d/%d", answered_count + 1, state$total)),
        span(class = "st-badge", sprintf("\u2705 %d  \u274c %d", state$correct, state$wrong))
      ),

      # Progress bar
      div(class = "st-progress",
        div(class = "st-progress-fill", style = sprintf("width: %d%%;", progress_pct))
      ),

      # Question
      div(class = "st-question", question_content),

      # Answer buttons
      div(class = "st-answer-grid",
        lapply(seq_along(state$current_options), function(i) {
          opt <- state$current_options[[i]]
          labels <- c("A", "B", "C", "D", "E", "F")
          label <- if (i <= length(labels)) labels[i] else as.character(i)

          btn_class <- "st-btn-answer"
          if (state$answered) {
            if (is_interpretation) {
              correct_text <- Filter(function(a) a$correct, q$answers)[[1]]$text
              if (opt$value == correct_text) {
                btn_class <- paste(btn_class, "correct")
              } else if (opt$value == state$user_answer) {
                btn_class <- paste(btn_class, "incorrect")
              } else {
                btn_class <- paste(btn_class, "dimmed")
              }
            } else {
              if (opt$value == q$correct) {
                btn_class <- paste(btn_class, "correct")
              } else if (opt$value == state$user_answer) {
                btn_class <- paste(btn_class, "incorrect")
              } else {
                btn_class <- paste(btn_class, "dimmed")
              }
            }
          }

          # Escape single quotes in answer values for JS
          escaped_value <- gsub("'", "\\\\'", opt$value)

          tags$button(
            class = btn_class,
            disabled = if (state$answered) "disabled" else NULL,
            onclick = sprintf("Shiny.setInputValue('quiz_answer', '%s', {priority: 'event'})", escaped_value),
            span(class = "st-btn-answer__label",
              style = "display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 9999px; background: #f1f5f9; color: var(--st-color-text-secondary); font-weight: 700; font-size: 0.875rem; flex-shrink: 0;",
              label
            ),
            span(opt$text)
          )
        })
      ),

      # Feedback
      if (state$answered) {
        feedback_class <- if (state$is_correct) "st-feedback st-feedback-correct" else "st-feedback st-feedback-incorrect"
        header_text <- if (state$is_correct) "\u2705 Poprawna odpowiedź!" else "\u274c Niepoprawna odpowiedź"

        tagList(
          div(class = feedback_class,
            h4(header_text),
            p(state$feedback_text)
          ),
          div(style = "text-align: center; margin-top: 24px;",
            actionButton("next_q", "Następne pytanie \u2192", class = "st-btn-primary")
          )
        )
      }
    )
  })

  # Answer handler
  observeEvent(input$quiz_answer, {
    req(!state$answered)
    q <- state$current_q
    qc <- state$quiz_config
    req(q)

    user_answer <- input$quiz_answer
    state$user_answer <- user_answer

    if (qc$answer_type == "interpretation") {
      # Interpretation quiz
      selected <- Filter(function(a) a$text == user_answer, q$answers)
      correct_ans <- Filter(function(a) a$correct, q$answers)

      if (length(selected) > 0) {
        state$is_correct <- selected[[1]]$correct
        state$feedback_text <- selected[[1]]$feedback
        state$correct_answer <- if (length(correct_ans) > 0) correct_ans[[1]]$text else ""
      }
    } else {
      # Standard quiz
      state$is_correct <- (user_answer == q$correct)
      state$feedback_text <- q$explanation %||% ""
      state$correct_answer <- q$correct
    }

    state$answered <- TRUE
    if (state$is_correct) state$correct <- state$correct + 1
    else state$wrong <- state$wrong + 1
  })

  # Next question
  observeEvent(input$next_q, { load_next_question() })
  observeEvent(input$back_to_menu_q, { state$screen <- "menu" })

  # ---- SUMMARY SCREEN ----
  output$summary_screen <- renderUI({
    req(state$screen == "summary")

    total <- state$correct + state$wrong
    pct <- if (total > 0) round(state$correct / total * 100, 1) else 0
    bar_class <- if (pct >= 80) "excellent" else if (pct >= 50) "good" else "needs-work"
    qc <- state$quiz_config

    has_errors_info <- !is.null(qc$errors_file)

    div(
      div(class = "st-header",
        h1(paste(qc$emoji, qc$name)),
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
          if (has_errors_info) actionButton("show_errors", "Informacje o błędach", class = "st-btn-secondary"),
          actionButton("back_to_menu_s", "\u2190 Menu", class = "st-btn-secondary")
        )
      )
    )
  })

  observeEvent(input$retry_quiz, {
    quiz_id <- state$quiz_id
    questions <- QUESTIONS_CACHE[[quiz_id]]
    ids <- sample(sapply(questions, function(q) q$id), min(MAX_QUESTIONS, length(questions)))

    state$questions <- questions
    state$remaining <- as.list(ids)
    state$total <- length(ids)
    state$correct <- 0
    state$wrong <- 0
    state$screen <- "question"
    load_next_question()
  })

  observeEvent(input$back_to_menu_s, { state$screen <- "menu" })

  # ---- ERRORS INFO SCREEN ----
  observeEvent(input$show_errors, {
    state$screen <- "errors"
  })

  output$errors_screen <- renderUI({
    req(state$screen == "errors")
    qc <- state$quiz_config
    req(qc$errors_file)

    errors_data <- load_errors_info(qc$errors_file)

    div(
      div(class = "st-header",
        h1("Najczęstsze błędy interpretacyjne"),
        p("Przegląd typowych błędów w interpretacji wyników statystycznych")
      ),

      div(style = "margin-bottom: 24px;",
        actionButton("back_from_errors", "\u2190 Wróć do wyników", class = "st-btn-ghost")
      ),

      lapply(errors_data$errors, function(err) {
        div(style = "background: var(--st-color-background); padding: 24px; border-radius: 14px; margin-bottom: 16px; border-left: 4px solid var(--st-color-accent);",
          h3(style = "color: var(--st-color-primary); margin-bottom: 8px;", err$title %||% "Błąd"),
          p(style = "color: var(--st-color-text-secondary); line-height: 1.7;", err$description %||% "")
        )
      })
    )
  })

  observeEvent(input$back_from_errors, { state$screen <- "summary" })
}

shinyApp(ui = ui, server = server)
