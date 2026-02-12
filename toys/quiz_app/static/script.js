// Konfiguracja quizu (przekazana z backend przez quiz.html)
const QUIZ_CONFIG = window.QUIZ_CONFIG;
const QUIZ_ID = document.body.dataset.quizId;

// Czy to quiz interpretacyjny?
const IS_INTERPRETATION = QUIZ_CONFIG.answer_type === 'interpretation';

// Stan quizu
let currentQuestion = null;
let answered = false;
let correctCount = 0;
let totalAnswered = 0;
let totalQuestions = 0;

// Elementy DOM
let startScreen, errorsScreen, questionScreen, finishScreen, loadingEl;
let btnStart, btnStartAfterErrors, btnNext, btnRestart;
let questionText, questionBox, feedbackBox, feedbackHeader, feedbackText;
let answersGrid;
let questionCounter, scoreCounter, scoreResult, scorePercent, scoreBar;
let progressBar, progressFill;

// Etykiety odpowiedzi (A, B, C, D...)
const ANSWER_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

// Elementy dla quizu interpretacyjnego
let interpretationContext, contextText, resultsBox;
let correctAnswerBox, correctAnswerText;
let errorsTitle, errorsIntroText, errorsList;

document.addEventListener('DOMContentLoaded', function() {
    // Pobranie elementów
    startScreen = document.getElementById('start-screen');
    errorsScreen = document.getElementById('errors-screen');
    questionScreen = document.getElementById('question-screen');
    finishScreen = document.getElementById('finish-screen');
    loadingEl = document.getElementById('loading');

    btnStart = document.getElementById('btn-start');
    btnStartAfterErrors = document.getElementById('btn-start-after-errors');
    btnNext = document.getElementById('btn-next');
    btnRestart = document.getElementById('btn-restart');

    questionText = document.getElementById('question-text');
    questionBox = document.querySelector('.st-question');
    feedbackBox = document.getElementById('feedback-box');
    feedbackHeader = document.getElementById('feedback-header');
    feedbackText = document.getElementById('feedback-text');
    answersGrid = document.getElementById('answers-grid');
    questionCounter = document.getElementById('question-counter');
    scoreCounter = document.getElementById('score-counter');
    scoreResult = document.getElementById('score-result');
    scorePercent = document.getElementById('score-percent');
    scoreBar = document.getElementById('score-bar');
    progressBar = document.getElementById('progress-bar');
    progressFill = document.getElementById('progress-fill');

    // Elementy dla quizu interpretacyjnego
    interpretationContext = document.getElementById('interpretation-context');
    contextText = document.getElementById('context-text');
    resultsBox = document.getElementById('results-box');
    correctAnswerBox = document.getElementById('correct-answer-box');
    correctAnswerText = document.getElementById('correct-answer-text');
    errorsTitle = document.getElementById('errors-title');
    errorsIntroText = document.getElementById('errors-intro-text');
    errorsList = document.getElementById('errors-list');

    // Event listeners
    btnStart.addEventListener('click', handleStartClick);
    if (btnStartAfterErrors) {
        btnStartAfterErrors.addEventListener('click', startQuiz);
    }
    btnRestart.addEventListener('click', handleRestartClick);
    btnNext.addEventListener('click', loadNextQuestion);

    // Dla quizu interpretacyjnego - załaduj informacje o błędach
    if (IS_INTERPRETATION) {
        loadErrorsInfo();
    }
});

/**
 * Obsługa kliknięcia przycisku Start
 */
function handleStartClick() {
    if (IS_INTERPRETATION) {
        showScreen('errors');
    } else {
        startQuiz();
    }
}

/**
 * Obsługa kliknięcia przycisku Restart
 */
function handleRestartClick() {
    if (IS_INTERPRETATION) {
        showScreen('errors');
    } else {
        startQuiz();
    }
}

/**
 * Załaduj informacje o błędach interpretacyjnych
 */
async function loadErrorsInfo() {
    try {
        const response = await fetch(`/api/quiz/${QUIZ_ID}/errors-info`);
        if (!response.ok) return;

        const data = await response.json();

        if (data.success) {
            displayErrorsInfo(data.data);
        }
    } catch (error) {
        console.error('Błąd ładowania informacji o błędach:', error);
    }
}

/**
 * Wyświetl informacje o błędach
 */
function displayErrorsInfo(errorsData) {
    if (!errorsTitle || !errorsIntroText || !errorsList) return;

    errorsTitle.textContent = errorsData.title;
    errorsIntroText.textContent = errorsData.intro;

    errorsList.innerHTML = '';

    errorsData.errors.forEach(error => {
        const card = document.createElement('div');
        card.className = 'st-error-card';

        card.innerHTML = `
            <div class="st-error-card__header">
                <span class="st-error-card__icon">${error.icon}</span>
                <span class="st-error-card__name">${error.name}</span>
            </div>
            <p class="st-error-card__description">${error.description}</p>
            <div class="st-error-examples">
                <div class="st-example-bad">
                    <div class="st-example-label">Niepoprawnie:</div>
                    <div>"${error.example_bad}"</div>
                </div>
                <div class="st-example-good">
                    <div class="st-example-label">Poprawnie:</div>
                    <div>"${error.example_good}"</div>
                </div>
            </div>
        `;

        errorsList.appendChild(card);
    });
}

/**
 * Rozpocznij quiz - inicjalizacja sesji
 */
async function startQuiz() {
    try {
        showLoading();

        const response = await fetch(`/api/quiz/${QUIZ_ID}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.success) {
            totalQuestions = data.total_questions;
            correctCount = 0;
            totalAnswered = 0;

            // Pokaż progress bar i zresetuj wynik
            progressBar.style.display = '';
            updateProgress();
            updateScoreCounter();

            showScreen('question');
            loadNextQuestion();
        } else {
            alert('Błąd inicjalizacji: ' + data.error);
        }
    } catch (error) {
        console.error('Błąd startu quizu:', error);
        alert('Błąd połączenia: ' + error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Załaduj kolejne pytanie
 */
async function loadNextQuestion() {
    try {
        showLoading();

        answered = false;
        feedbackBox.classList.add('st-feedback--hidden');
        if (correctAnswerBox) {
            correctAnswerBox.classList.add('st-correct-answer--hidden');
        }

        const response = await fetch(`/api/quiz/${QUIZ_ID}/next`);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.success) {
            if (data.finished) {
                showFinishScreen();
            } else {
                currentQuestion = data.question;

                if (IS_INTERPRETATION) {
                    displayInterpretationQuestion(data.question);
                } else {
                    questionText.textContent = currentQuestion.question;
                    // Upewnij się że question-box jest widoczny
                    if (questionBox) questionBox.style.display = '';
                    if (interpretationContext) interpretationContext.classList.add('st-interpretation-context--hidden');
                }

                const questionNum = totalAnswered + 1;
                questionCounter.textContent = `Pytanie ${questionNum} / ${totalQuestions}`;
                updateProgress();

                generateAnswerButtons();
            }
        } else {
            alert('Błąd: ' + data.error);
        }
    } catch (error) {
        console.error('Błąd ładowania pytania:', error);
        alert('Błąd połączenia: ' + error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Aktualizuj progress bar
 */
function updateProgress() {
    const progress = totalQuestions > 0
        ? ((totalAnswered) / totalQuestions) * 100
        : 0;
    progressFill.style.width = `${progress}%`;
}

/**
 * Aktualizuj wyświetlanie wyniku (poprawne / odpowiedzi)
 */
function updateScoreCounter() {
    if (!scoreCounter) return;
    if (totalAnswered > 0) {
        scoreCounter.textContent = `Wynik: ${correctCount}/${totalAnswered}`;
        scoreCounter.style.display = '';
    } else {
        scoreCounter.style.display = 'none';
    }
}

/**
 * Wyświetl pytanie interpretacyjne (z kontekstem i wynikami)
 */
function displayInterpretationQuestion(question) {
    // Ukryj standardowy question-box, pokaż interpretation-context
    if (questionBox) questionBox.style.display = 'none';
    if (interpretationContext) interpretationContext.classList.remove('st-interpretation-context--hidden');

    // Wypełnij kontekst
    if (contextText) contextText.textContent = question.context;

    // Wypełnij wyniki
    if (resultsBox) {
        resultsBox.innerHTML = '';
        question.results.forEach(line => {
            const p = document.createElement('p');
            p.textContent = line;
            resultsBox.appendChild(p);
        });
    }
}

/**
 * Generuj przyciski odpowiedzi
 */
function generateAnswerButtons() {
    answersGrid.innerHTML = '';

    let options = [];

    if (IS_INTERPRETATION) {
        // Quiz interpretacyjny - odpowiedzi z pytania
        options = currentQuestion.answers;
        answersGrid.className = 'st-answer-grid st-answer-grid--cols-1';

        options.forEach((option, index) => {
            const btn = document.createElement('button');
            btn.className = 'st-btn-answer';
            btn.dataset.answerText = option.text;

            const label = document.createElement('span');
            label.className = 'st-btn-answer__label';
            label.textContent = ANSWER_LABELS[index];

            const text = document.createElement('span');
            text.textContent = option.text;
            text.style.textAlign = 'left';

            btn.appendChild(label);
            btn.appendChild(text);
            btn.addEventListener('click', handleAnswer);
            answersGrid.appendChild(btn);
        });
    } else {
        // Standardowy quiz
        if (QUIZ_CONFIG.answer_type === 'multiple_choice_4' ||
            QUIZ_CONFIG.answer_type === 'multiple_choice_3') {
            options = QUIZ_CONFIG.options;
        } else if (QUIZ_CONFIG.answer_type === 'multiple_choice_random') {
            options = currentQuestion.options;
        }

        // Grid layout based on option count and length
        if (options.length <= 3) {
            answersGrid.className = 'st-answer-grid st-answer-grid--cols-1';
        } else {
            const maxLen = Math.max(...options.map(o => (typeof o === 'string' ? o : o.label).length));
            answersGrid.className = maxLen > 50
                ? 'st-answer-grid st-answer-grid--cols-1'
                : 'st-answer-grid st-answer-grid--cols-2';
        }

        options.forEach((option, index) => {
            const btn = document.createElement('button');
            btn.className = 'st-btn-answer';

            const label = document.createElement('span');
            label.className = 'st-btn-answer__label';
            label.textContent = ANSWER_LABELS[index];

            const text = document.createElement('span');

            if (typeof option === 'string') {
                btn.dataset.answer = option;
                text.textContent = option;
            } else {
                btn.dataset.answer = option.value;
                text.textContent = option.label;
            }

            btn.appendChild(label);
            btn.appendChild(text);
            btn.addEventListener('click', handleAnswer);
            answersGrid.appendChild(btn);
        });
    }
}

/**
 * Obsługa wyboru odpowiedzi
 */
async function handleAnswer(event) {
    if (answered) return;

    const btn = event.target.closest('.st-btn-answer');
    if (!btn) return;

    try {
        showLoading();

        let body;
        if (IS_INTERPRETATION) {
            body = JSON.stringify({
                question_id: currentQuestion.id,
                answer_text: btn.dataset.answerText
            });
        } else {
            body = JSON.stringify({
                question_id: currentQuestion.id,
                answer: btn.dataset.answer
            });
        }

        const response = await fetch(`/api/quiz/${QUIZ_ID}/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.success) {
            answered = true;
            totalAnswered++;
            if (data.correct) correctCount++;
            disableAnswerButtons();
            updateProgress();
            updateScoreCounter();

            // Feedback with SVG icons
            const icon = data.correct
                ? '<span class="st-feedback__icon st-feedback__icon--correct"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span>'
                : '<span class="st-feedback__icon st-feedback__icon--incorrect"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>';

            if (data.correct) {
                feedbackHeader.innerHTML = icon + ' Poprawna odpowiedź!';
                feedbackHeader.className = 'st-feedback__header st-feedback__header--correct';
            } else {
                feedbackHeader.innerHTML = icon + ' Niepoprawna odpowiedź';
                feedbackHeader.className = 'st-feedback__header st-feedback__header--incorrect';

                // Pokaż poprawną odpowiedź (dla quizu interpretacyjnego)
                if (IS_INTERPRETATION && correctAnswerBox && correctAnswerText) {
                    correctAnswerText.textContent = data.correct_answer;
                    correctAnswerBox.classList.remove('st-correct-answer--hidden');
                }
            }

            feedbackText.textContent = data.explanation;
            feedbackBox.classList.remove('st-feedback--hidden');

            // Podświetl poprawną odpowiedź
            if (IS_INTERPRETATION) {
                highlightCorrectAnswerByText(data.correct_answer);
            } else {
                highlightCorrectAnswer(data.correct_answer, btn.dataset.answer);
            }
        } else {
            alert('Błąd: ' + data.error);
        }
    } catch (error) {
        console.error('Błąd sprawdzania odpowiedzi:', error);
        alert('Błąd połączenia: ' + error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Podświetl odpowiedzi
 */
function highlightCorrectAnswer(correctAnswer, userAnswer) {
    const answerButtons = answersGrid.querySelectorAll('.st-btn-answer');

    answerButtons.forEach(btn => {
        const answer = btn.dataset.answer;

        if (answer === correctAnswer) {
            btn.classList.add('st-btn-answer--correct');
        } else if (answer === userAnswer && userAnswer !== correctAnswer) {
            btn.classList.add('st-btn-answer--incorrect');
        } else {
            btn.classList.add('st-btn-answer--dimmed');
        }
    });
}

/**
 * Podświetl poprawną odpowiedź po tekście (dla quizu interpretacyjnego)
 */
function highlightCorrectAnswerByText(correctText) {
    const answerButtons = answersGrid.querySelectorAll('.st-btn-answer');

    answerButtons.forEach(btn => {
        if (btn.dataset.answerText === correctText) {
            btn.classList.add('st-btn-answer--correct');
        }
    });
}

/**
 * Wyłącz przyciski odpowiedzi
 */
function disableAnswerButtons() {
    const answerButtons = answersGrid.querySelectorAll('.st-btn-answer');
    answerButtons.forEach(btn => {
        btn.disabled = true;
    });
}

/**
 * Pokaż określony ekran (start/errors/question/finish)
 */
function showScreen(screenName) {
    startScreen.classList.remove('st-screen--active');
    if (errorsScreen) errorsScreen.classList.remove('st-screen--active');
    questionScreen.classList.remove('st-screen--active');
    finishScreen.classList.remove('st-screen--active');

    if (screenName === 'start') startScreen.classList.add('st-screen--active');
    else if (screenName === 'errors' && errorsScreen) errorsScreen.classList.add('st-screen--active');
    else if (screenName === 'question') questionScreen.classList.add('st-screen--active');
    else if (screenName === 'finish') finishScreen.classList.add('st-screen--active');
}

function showLoading() {
    loadingEl.classList.add('st-loading--active');
}

function hideLoading() {
    loadingEl.classList.remove('st-loading--active');
}

/**
 * Pokaż ekran końcowy z podsumowaniem z serwera
 */
async function showFinishScreen() {
    // Pobierz podsumowanie z backendu
    try {
        const response = await fetch(`/api/quiz/${QUIZ_ID}/summary`);
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const s = data.summary;
                scoreResult.textContent = `${s.correct} / ${s.answered}`;
                scorePercent.textContent = `${s.score_percent}%`;
                scoreBar.style.width = `${s.score_percent}%`;

                if (s.score_percent >= 70) {
                    scoreBar.className = 'st-score__bar-fill st-score__bar-fill--excellent';
                } else if (s.score_percent >= 50) {
                    scoreBar.className = 'st-score__bar-fill st-score__bar-fill--good';
                } else {
                    scoreBar.className = 'st-score__bar-fill st-score__bar-fill--needs-work';
                }

                // Ukryj progress bar i wynik na ekranie końcowym
                progressBar.style.display = 'none';
                if (scoreCounter) scoreCounter.style.display = 'none';

                showScreen('finish');
                return;
            }
        }
    } catch (error) {
        console.error('Błąd pobierania podsumowania:', error);
    }

    // Fallback - użyj danych klienckich jeśli serwer niedostępny
    const percent = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    scoreResult.textContent = `${correctCount} / ${totalAnswered}`;
    scorePercent.textContent = `${percent}%`;
    scoreBar.style.width = `${percent}%`;

    if (percent >= 70) {
        scoreBar.className = 'st-score__bar-fill st-score__bar-fill--excellent';
    } else if (percent >= 50) {
        scoreBar.className = 'st-score__bar-fill st-score__bar-fill--good';
    } else {
        scoreBar.className = 'st-score__bar-fill st-score__bar-fill--needs-work';
    }

    // Ukryj progress bar i wynik na ekranie końcowym
    progressBar.style.display = 'none';
    if (scoreCounter) scoreCounter.style.display = 'none';

    showScreen('finish');
}
