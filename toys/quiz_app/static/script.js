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
let questionCounter, scoreResult, scorePercent, scoreBar;

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
    questionBox = document.querySelector('.question-box');
    feedbackBox = document.getElementById('feedback-box');
    feedbackHeader = document.getElementById('feedback-header');
    feedbackText = document.getElementById('feedback-text');
    answersGrid = document.getElementById('answers-grid');
    questionCounter = document.getElementById('question-counter');
    scoreResult = document.getElementById('score-result');
    scorePercent = document.getElementById('score-percent');
    scoreBar = document.getElementById('score-bar');

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
        // Pokaż ekran z błędami
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
        card.className = 'error-card';

        card.innerHTML = `
            <div class="error-card-header">
                <span class="error-icon">${error.icon}</span>
                <span class="error-name">${error.name}</span>
            </div>
            <p class="error-description">${error.description}</p>
            <div class="error-examples">
                <div class="example-bad">
                    <div class="example-label">Niepoprawnie:</div>
                    <div>"${error.example_bad}"</div>
                </div>
                <div class="example-good">
                    <div class="example-label">Poprawnie:</div>
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

        // Wywołaj /api/quiz/{id}/start
        const response = await fetch(`/api/quiz/${QUIZ_ID}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.success) {
            // Reset wyników
            totalQuestions = data.total_questions;
            correctCount = 0;
            totalAnswered = 0;

            // Przejdź do ekranu pytań
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

        // Reset stanu
        answered = false;
        feedbackBox.classList.add('hidden');
        if (correctAnswerBox) {
            correctAnswerBox.classList.add('hidden');
        }

        // Pobierz pytanie z /api/quiz/{id}/next
        const response = await fetch(`/api/quiz/${QUIZ_ID}/next`);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.success) {
            if (data.finished) {
                // Koniec pytań - pokaż wynik
                showFinishScreen();
            } else {
                // Wyświetl pytanie
                currentQuestion = data.question;

                if (IS_INTERPRETATION) {
                    displayInterpretationQuestion(data.question);
                } else {
                    questionText.textContent = currentQuestion.question;
                    // Upewnij się że question-box jest widoczny
                    if (questionBox) questionBox.style.display = '';
                    if (interpretationContext) interpretationContext.classList.add('hidden');
                }

                // Aktualizuj licznik pytań
                const questionNum = totalAnswered + 1;
                questionCounter.textContent = `Pytanie ${questionNum} / ${totalQuestions}`;

                // Wygeneruj przyciski odpowiedzi
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
 * Wyświetl pytanie interpretacyjne (z kontekstem i wynikami)
 */
function displayInterpretationQuestion(question) {
    // Ukryj standardowy question-box, pokaż interpretation-context
    if (questionBox) questionBox.style.display = 'none';
    if (interpretationContext) interpretationContext.classList.remove('hidden');

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
 * Generuj przyciski odpowiedzi na podstawie konfiguracji quizu
 */
function generateAnswerButtons() {
    // Wyczyść poprzednie przyciski
    answersGrid.innerHTML = '';

    let options = [];

    if (IS_INTERPRETATION) {
        // Quiz interpretacyjny - odpowiedzi z pytania
        options = currentQuestion.answers;
        answersGrid.className = 'answers-grid grid-3 interpretation-answers';

        const letters = ['A', 'B', 'C'];
        options.forEach((option, index) => {
            const btn = document.createElement('button');
            btn.className = 'btn-answer btn-answer-long';
            btn.dataset.answerText = option.text;
            btn.innerHTML = `<span class="answer-letter">${letters[index]}.</span> ${option.text}`;
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

        // Dostosuj grid do liczby opcji
        if (options.length === 3) {
            answersGrid.className = 'answers-grid grid-3';
        } else if (options.length === 4) {
            // Długie opcje (np. hipotezy) → layout jednokolumnowy
            const maxLen = Math.max(...options.map(o => (typeof o === 'string' ? o : o.label).length));
            answersGrid.className = maxLen > 50 ? 'answers-grid grid-4-list' : 'answers-grid grid-4';
        }

        // Utwórz przyciski
        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'btn-answer';

            if (typeof option === 'string') {
                btn.dataset.answer = option;
                btn.textContent = option;
            } else {
                btn.dataset.answer = option.value;
                btn.textContent = option.label;
            }

            btn.addEventListener('click', handleAnswer);
            answersGrid.appendChild(btn);
        });
    }
}

/**
 * Obsługa wyboru odpowiedzi
 */
async function handleAnswer(event) {
    if (answered) return;  // Już odpowiedziano

    const btn = event.target.closest('.btn-answer');

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

        // Wyślij odpowiedź do /api/quiz/{id}/check
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

            // Pokaż feedback
            if (data.correct) {
                feedbackHeader.textContent = '✅ Poprawna odpowiedź!';
                feedbackHeader.className = 'feedback-header correct';
                btn.classList.add('correct');
            } else {
                feedbackHeader.textContent = '❌ Niepoprawna odpowiedź';
                feedbackHeader.className = 'feedback-header incorrect';
                btn.classList.add('incorrect');

                // Pokaż poprawną odpowiedź (dla quizu interpretacyjnego)
                if (IS_INTERPRETATION && correctAnswerBox && correctAnswerText) {
                    correctAnswerText.textContent = data.correct_answer;
                    correctAnswerBox.classList.remove('hidden');
                }
            }

            feedbackText.textContent = data.explanation;
            feedbackBox.classList.remove('hidden');

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
 * Podświetl poprawną odpowiedź (zielone) i niepoprawną (czerwone)
 */
function highlightCorrectAnswer(correctAnswer, userAnswer) {
    const answerButtons = answersGrid.querySelectorAll('.btn-answer');

    answerButtons.forEach(btn => {
        const answer = btn.dataset.answer;

        if (answer === correctAnswer) {
            btn.classList.add('correct');
        } else if (answer === userAnswer && userAnswer !== correctAnswer) {
            btn.classList.add('incorrect');
        }
    });
}

/**
 * Podświetl poprawną odpowiedź po tekście (dla quizu interpretacyjnego)
 */
function highlightCorrectAnswerByText(correctText) {
    const answerButtons = answersGrid.querySelectorAll('.btn-answer');

    answerButtons.forEach(btn => {
        if (btn.dataset.answerText === correctText) {
            btn.classList.add('correct');
        }
    });
}

/**
 * Wyłącz przyciski odpowiedzi (po odpowiedzi)
 */
function disableAnswerButtons() {
    const answerButtons = answersGrid.querySelectorAll('.btn-answer');

    answerButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.cursor = 'not-allowed';
    });
}

/**
 * Pokaż określony ekran (start/errors/question/finish)
 */
function showScreen(screenName) {
    startScreen.classList.remove('active');
    if (errorsScreen) errorsScreen.classList.remove('active');
    questionScreen.classList.remove('active');
    finishScreen.classList.remove('active');

    if (screenName === 'start') startScreen.classList.add('active');
    else if (screenName === 'errors' && errorsScreen) errorsScreen.classList.add('active');
    else if (screenName === 'question') questionScreen.classList.add('active');
    else if (screenName === 'finish') finishScreen.classList.add('active');
}

/**
 * Pokaż/ukryj loading indicator
 */
function showLoading() {
    loadingEl.classList.add('active');
}

function hideLoading() {
    loadingEl.classList.remove('active');
}

/**
 * Pokaż ekran końcowy z wynikiem
 */
function showFinishScreen() {
    const percent = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    // Tekst wyniku
    scoreResult.textContent = `${correctCount} / ${totalAnswered}`;
    scorePercent.textContent = `${percent}%`;

    // Pasek postępu
    scoreBar.style.width = `${percent}%`;

    // Kolor paska w zależności od wyniku
    if (percent >= 70) {
        scoreBar.className = 'score-bar-fill excellent';
    } else if (percent >= 50) {
        scoreBar.className = 'score-bar-fill good';
    } else {
        scoreBar.className = 'score-bar-fill needs-work';
    }

    showScreen('finish');
}
