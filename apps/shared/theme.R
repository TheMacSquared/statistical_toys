# Wspólny motyw bslib dla Statystycznych Zabawek
# Bootstrap 5, kolory zbliżone do shared.css

library(bslib)

st_theme <- function() {
  bs_theme(
    version = 5,
    primary = "#6366f1",
    secondary = "#8b5cf6",
    success = "#22c55e",
    danger = "#ef4444",
    warning = "#f59e0b",
    info = "#6366f1",
    "body-bg" = "#f8fafc",
    "body-color" = "#1e293b",
    "font-family-base" = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    "border-radius" = "10px",
    "border-color" = "#e2e8f0",
    "card-bg" = "#ffffff"
  ) |>
    bs_add_rules(st_custom_css())
}

st_custom_css <- function() {
  "
  /* ==================== DESIGN TOKENS ==================== */
  :root {
    --st-color-primary: #6366f1;
    --st-color-primary-light: #818cf8;
    --st-color-primary-dark: #4f46e5;
    --st-color-primary-bg: rgba(99, 102, 241, 0.06);
    --st-color-accent: #8b5cf6;
    --st-color-success: #22c55e;
    --st-color-error: #ef4444;
    --st-color-text: #1e293b;
    --st-color-text-secondary: #475569;
    --st-color-text-muted: #94a3b8;
    --st-color-border: #e2e8f0;
    --st-color-background: #f8fafc;
    --st-gradient-primary: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    --st-gradient-bg: linear-gradient(135deg, #6366f1 0%, #7c3aed 50%, #8b5cf6 100%);
    --st-gradient-success: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    --st-gradient-error: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    --st-radius-md: 10px;
    --st-radius-lg: 14px;
    --st-radius-xl: 20px;
  }

  /* ==================== PAGE ==================== */
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .st-page {
    background: var(--st-gradient-bg);
    min-height: 100vh;
    padding: 16px;
  }

  @media (min-width: 640px) {
    .st-page { padding: 24px; }
  }

  /* ==================== CARD ==================== */
  .st-card {
    background: #ffffff;
    border-radius: var(--st-radius-xl);
    box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 6px 24px rgba(0,0,0,0.06);
    padding: 24px;
    animation: st-fadeIn 0.4s ease-out;
  }

  @media (min-width: 640px) { .st-card { padding: 32px; } }
  @media (min-width: 1024px) { .st-card { padding: 48px; } }

  .st-card--narrow { max-width: 900px; margin: 0 auto; }
  .st-card--wide { max-width: 1400px; margin: 0 auto; }

  /* ==================== HEADER ==================== */
  .st-header {
    text-align: center;
    margin-bottom: 24px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--st-color-border);
  }

  .st-header h1 {
    font-size: #{'clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem)'};
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--st-color-text);
    margin-bottom: 8px;
    line-height: 1.2;
  }

  .st-header p {
    font-size: #{'clamp(1rem, 0.95rem + 0.3vw, 1.125rem)'};
    color: var(--st-color-text-secondary);
  }

  /* ==================== STATS PANEL ==================== */
  .st-stats {
    background: var(--st-color-primary-bg);
    padding: 24px;
    border-radius: var(--st-radius-lg);
    border-left: 4px solid var(--st-color-primary);
  }

  .st-stats h3 {
    font-size: #{'clamp(1rem, 0.95rem + 0.3vw, 1.125rem)'};
    font-weight: 700;
    color: var(--st-color-text);
    margin-bottom: 16px;
  }

  .st-stat-item {
    display: flex;
    flex-direction: column;
    padding: 16px;
    background: #ffffff;
    border-radius: var(--st-radius-md);
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }

  .st-stat-label {
    font-size: #{'clamp(0.7rem, 0.65rem + 0.25vw, 0.8rem)'};
    color: var(--st-color-text-muted);
    margin-bottom: 4px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .st-stat-value {
    font-size: #{'clamp(1.1rem, 1rem + 0.5vw, 1.25rem)'};
    color: var(--st-color-primary);
    font-weight: 700;
  }

  /* ==================== BUTTONS ==================== */
  .st-btn-primary {
    padding: 12px 28px;
    background: var(--st-gradient-primary);
    color: white !important;
    border: none;
    border-radius: var(--st-radius-md);
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
    transition: transform 150ms, box-shadow 150ms;
    -webkit-tap-highlight-color: transparent;
  }

  .st-btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
    color: white !important;
  }

  .st-btn-secondary {
    padding: 12px 28px;
    background: #f1f5f9;
    color: var(--st-color-text-secondary);
    border: none;
    border-radius: var(--st-radius-md);
    font-weight: 600;
    cursor: pointer;
  }

  .st-btn-secondary:hover {
    background: var(--st-color-border);
    transform: translateY(-1px);
  }

  .st-btn-ghost {
    padding: 8px 16px;
    background: transparent;
    color: var(--st-color-text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    border: 1px solid var(--st-color-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .st-btn-ghost:hover {
    background: #f1f5f9;
    border-color: rgba(99, 102, 241, 0.2);
    color: var(--st-color-primary);
  }

  /* ==================== ANSWER BUTTONS (quiz/CI) ==================== */
  .st-answer-grid {
    display: grid;
    gap: 16px;
    margin-bottom: 24px;
  }

  .st-btn-answer {
    position: relative;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    background: #ffffff;
    border: 2px solid var(--st-color-border);
    border-radius: var(--st-radius-lg);
    font-size: 1rem;
    font-weight: 500;
    color: var(--st-color-text);
    cursor: pointer;
    transition: all 250ms;
    text-align: left;
    line-height: 1.5;
    min-height: 56px;
    width: 100%;
  }

  .st-btn-answer:hover:not(:disabled) {
    border-color: var(--st-color-primary);
    background: var(--st-color-primary-bg);
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.06);
  }

  .st-btn-answer:disabled { cursor: not-allowed; opacity: 0.7; }

  .st-btn-answer.correct {
    border-color: var(--st-color-success) !important;
    background: #f0fdf4 !important;
  }

  .st-btn-answer.incorrect {
    border-color: var(--st-color-error) !important;
    background: #fef2f2 !important;
  }

  .st-btn-answer.dimmed { opacity: 0.5; }

  /* CI-style buttons */
  .st-btn-ci {
    justify-content: center;
    text-align: center;
    padding: 18px 24px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    border: none;
    color: white;
    background: var(--st-gradient-primary);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  .st-btn-ci:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
  }

  .st-btn-ci.correct {
    background: var(--st-gradient-success) !important;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4) !important;
    color: white !important;
  }

  .st-btn-ci.incorrect {
    background: var(--st-gradient-error) !important;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4) !important;
    color: white !important;
  }

  /* ==================== QUESTION BOX ==================== */
  .st-question {
    background: var(--st-color-background);
    padding: 24px;
    border-radius: var(--st-radius-lg);
    margin-bottom: 24px;
    border-left: 4px solid var(--st-color-primary);
  }

  @media (min-width: 640px) {
    .st-question { padding: 32px 24px; }
  }

  .st-question p {
    font-size: #{'clamp(1.1rem, 1rem + 0.5vw, 1.25rem)'};
    color: var(--st-color-text);
    font-weight: 500;
    line-height: 1.6;
    margin: 0;
  }

  /* ==================== FEEDBACK BOX ==================== */
  .st-feedback {
    padding: 24px;
    border-radius: var(--st-radius-lg);
    margin-top: 24px;
    border-left: 4px solid var(--st-color-primary);
    background: var(--st-color-background);
    animation: st-slideDown 0.35s ease-out;
  }

  .st-feedback-correct { border-left-color: var(--st-color-success); }
  .st-feedback-incorrect { border-left-color: var(--st-color-error); }

  .st-feedback h4 {
    font-weight: 700;
    margin-bottom: 16px;
  }

  .st-feedback-correct h4 { color: #16a34a; }
  .st-feedback-incorrect h4 { color: #dc2626; }

  .st-feedback p {
    font-size: 1rem;
    color: var(--st-color-text-secondary);
    line-height: 1.7;
  }

  /* ==================== PROGRESS BAR ==================== */
  .st-progress {
    width: 100%;
    height: 6px;
    background: var(--st-color-border);
    border-radius: 9999px;
    overflow: hidden;
    margin-bottom: 24px;
  }

  .st-progress-fill {
    height: 100%;
    background: var(--st-gradient-primary);
    border-radius: 9999px;
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* ==================== SCORE ==================== */
  .st-score {
    text-align: center;
    padding: 48px 24px;
  }

  .st-score-value {
    font-size: #{'clamp(2rem, 1.5rem + 2.5vw, 3.5rem)'};
    font-weight: 700;
    background: var(--st-gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.1;
    margin-bottom: 8px;
  }

  .st-score-bar {
    width: 100%;
    max-width: 400px;
    height: 12px;
    background: var(--st-color-border);
    border-radius: 9999px;
    margin: 0 auto 48px;
    overflow: hidden;
  }

  .st-score-bar-fill {
    height: 100%;
    border-radius: 9999px;
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .st-score-bar-fill.excellent { background: var(--st-gradient-success); }
  .st-score-bar-fill.good { background: linear-gradient(135deg, #f59e0b, #d97706); }
  .st-score-bar-fill.needs-work { background: var(--st-gradient-error); }

  /* ==================== MENU CARDS ==================== */
  .st-menu-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    max-width: 1000px;
    margin: 0 auto;
  }

  @media (min-width: 640px) {
    .st-menu-grid {
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    }
  }

  .st-menu-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 32px 24px;
    background: #ffffff;
    border: 1px solid var(--st-color-border);
    border-radius: var(--st-radius-xl);
    cursor: pointer;
    transition: all 250ms;
    overflow: hidden;
  }

  .st-menu-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4px;
    background: var(--st-gradient-primary);
    transition: height 250ms;
  }

  .st-menu-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(99, 102, 241, 0.15), 0 2px 8px rgba(0,0,0,0.06);
    border-color: rgba(99, 102, 241, 0.2);
  }

  .st-menu-card:hover::before { height: 5px; }

  .st-menu-card .emoji { font-size: 3rem; margin-bottom: 16px; margin-top: 8px; }
  .st-menu-card h3 { font-size: 1.25rem; font-weight: 700; margin-bottom: 8px; }
  .st-menu-card p { font-size: 0.875rem; color: var(--st-color-text-secondary); line-height: 1.6; }

  /* ==================== VISUALIZATION (CI) ==================== */
  .st-visualization {
    background: var(--st-color-background);
    border: 2px solid var(--st-color-border);
    border-radius: var(--st-radius-lg);
    padding: 8px;
    margin-bottom: 24px;
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @media (min-width: 640px) {
    .st-visualization { padding: 16px; min-height: 240px; }
  }

  /* ==================== PLOTLY FIXES ==================== */
  .js-plotly-plot .plotly .modebar { display: none !important; }

  /* ==================== SIDEBAR ==================== */
  .st-sidebar {
    background: var(--st-color-background);
    padding: 24px;
    border-radius: var(--st-radius-lg);
    height: fit-content;
  }

  .st-sidebar h3 {
    font-size: #{'clamp(1rem, 0.95rem + 0.3vw, 1.125rem)'};
    font-weight: 700;
    margin-bottom: 24px;
  }

  /* ==================== CHI-SQUARE TABLE ==================== */
  .chi-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
    margin-bottom: 16px;
  }

  .chi-table th, .chi-table td {
    border: 1px solid var(--st-color-border);
    padding: 10px 12px;
    text-align: center;
  }

  .chi-table th {
    background: #f1f5f9;
    font-weight: 600;
    color: var(--st-color-text-secondary);
  }

  .chi-table .chi-expected {
    display: block;
    font-size: 0.75rem;
    color: var(--st-color-text-muted);
    font-style: italic;
  }

  .chi-table .chi-expected--hidden { display: none; }
  .chi-table .chi-pct { display: block; font-size: 0.75rem; color: var(--st-color-text-muted); }

  .chi-total { font-weight: 600; background: #f8fafc; }
  .chi-grand-total { font-weight: 700; background: #f1f5f9; }

  .chi-cell-input {
    width: 70px;
    text-align: center;
    border: 1px solid var(--st-color-border);
    border-radius: 6px;
    padding: 4px;
    font-size: 0.875rem;
  }

  .chi-verdict--significant { color: var(--st-color-error); font-weight: 600; }
  .chi-verdict--not-significant { color: var(--st-color-success); font-weight: 600; }

  /* ==================== PEARSON SPECIFICS ==================== */
  .pc-r-display { font-size: 2rem; font-weight: 700; text-align: center; padding: 16px; }
  .pc-r-display--positive { color: var(--st-color-success); }
  .pc-r-display--negative { color: var(--st-color-error); }
  .pc-r-display--neutral { color: var(--st-color-text-muted); }

  .pc-interpretation--positive { border-left: 4px solid var(--st-color-success); }
  .pc-interpretation--negative { border-left: 4px solid var(--st-color-error); }
  .pc-interpretation--weak { border-left: 4px solid var(--st-color-text-muted); }

  .pc-table__product--positive { color: var(--st-color-success); }
  .pc-table__product--negative { color: var(--st-color-error); }

  /* ==================== BADGE ==================== */
  .st-badge {
    display: inline-flex;
    align-items: center;
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    background: #f1f5f9;
    color: var(--st-color-text-secondary);
  }

  /* ==================== WARNINGS ==================== */
  .st-warning {
    background: #fffbeb;
    border-left: 4px solid var(--st-color-warning);
    padding: 12px 16px;
    border-radius: var(--st-radius-md);
    margin-bottom: 16px;
    font-size: 0.875rem;
    color: #92400e;
  }

  /* ==================== ANIMATIONS ==================== */
  @keyframes st-fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes st-slideDown {
    from { opacity: 0; transform: translateY(-12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ==================== TOUCH TARGETS ==================== */
  @media (pointer: coarse) {
    .st-btn-answer { min-height: 56px; }
    .st-btn-primary, .st-btn-secondary { min-height: 48px; }
    .shiny-input-container .form-control { min-height: 44px; font-size: 16px; }
  }

  /* ==================== SAFE AREA (notched phones) ==================== */
  @supports (padding: env(safe-area-inset-bottom)) {
    .st-page {
      padding-bottom: #{'calc(16px + env(safe-area-inset-bottom))'};
      padding-left: #{'calc(16px + env(safe-area-inset-left))'};
      padding-right: #{'calc(16px + env(safe-area-inset-right))'};
    }
  }

  /* ==================== SHINY OVERRIDES ==================== */
  .shiny-input-container { margin-bottom: 16px; }

  .shiny-input-container label {
    color: var(--st-color-text-secondary);
    font-weight: 500;
    font-size: 0.875rem;
  }

  .form-range::-webkit-slider-thumb { background: var(--st-color-primary); }
  .form-range::-moz-range-thumb { background: var(--st-color-primary); }

  .btn-default {
    background: var(--st-gradient-primary);
    color: white;
    border: none;
    font-weight: 600;
  }

  .btn-default:hover {
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
    color: white;
  }
  "
}
