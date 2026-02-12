// Konfiguracja quizu (przekazana z backend przez quiz.html)
const QUIZ_CONFIG = window.QUIZ_CONFIG;
const QUIZ_ID = document.body.dataset.quizId;

// Stan quizu
let currentQuestion = null;
let answered = false;
let correctCount = 0;
let totalAnswered = 0;
let totalQuestions = 0;

// Elementy DOM
let startScreen, questionScreen, finishScreen, loadingEl;
let btnStart, btnNext, btnRestart;
let questionText, feedbackBox, feedbackHeader, feedbackText;
let answersGrid;
let questionCounter, scoreResult, scorePercent, scoreBar;

document.addEventListener('DOMContentLoaded', function() {
    // Pobranie elementów
    startScreen = document.getElementById('start-screen');
    questionScreen = document.getElementById('question-screen');
    finishScreen = document.getElementById('finish-screen');
    loadingEl = document.getElementById('loading');

    btnStart = document.getElementById('btn-start');
    btnNext = document.getElementById('btn-next');
    btnRestart = document.getElementById('btn-restart');

    questionText = document.getElementById('question-text');
    feedbackBox = document.getElementById('feedback-box');
    feedbackHeader = document.getElementById('feedback-header');
    feedbackText = document.getElementById('feedback-text');
    answersGrid = document.getElementById('answers-grid');
    questionCounter = document.getElementById('question-counter');
    scoreResult = document.getElementById('score-result');
    scorePercent = document.getElementById('score-percent');
    scoreBar = document.getElementById('score-bar');

    // Event listeners
    btnStart.addEventListener('click', startQuiz);
    btnRestart.addEventListener('click', startQuiz);
    btnNext.addEventListener('click', loadNextQuestion);
});

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
                questionText.textContent = currentQuestion.question;

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
 * Generuj przyciski odpowiedzi na podstawie konfiguracji quizu
 */
function generateAnswerButtons() {
    // Wyczyść poprzednie przyciski
    answersGrid.innerHTML = '';

    let options = [];

    // Określ opcje odpowiedzi na podstawie typu quizu
    if (QUIZ_CONFIG.answer_type === 'multiple_choice_4' ||
        QUIZ_CONFIG.answer_type === 'multiple_choice_3') {
        // Stałe opcje (typy zmiennych, rozkłady)
        options = QUIZ_CONFIG.options;
    } else if (QUIZ_CONFIG.answer_type === 'multiple_choice_random') {
        // Losowe 3 opcje wybrane przez backend (zawsze zawierają poprawną odpowiedź)
        options = currentQuestion.options;
    }

    // Dostosuj grid do liczby opcji
    if (options.length === 3) {
        answersGrid.className = 'answers-grid grid-3';
    } else if (options.length === 4) {
        answersGrid.className = 'answers-grid grid-4';
    }

    // Utwórz przyciski
    options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'btn-answer';

        if (typeof option === 'string') {
            // Dla testów - opcje są stringami
            btn.dataset.answer = option;
            btn.textContent = option;
        } else {
            // Dla innych quizów - opcje to obiekty {value, label}
            btn.dataset.answer = option.value;
            btn.textContent = option.label;
        }

        btn.addEventListener('click', handleAnswer);
        answersGrid.appendChild(btn);
    });
}

/**
 * Obsługa wyboru odpowiedzi
 */
async function handleAnswer(event) {
    if (answered) return;  // Już odpowiedziano

    const selectedAnswer = event.target.dataset.answer;

    try {
        showLoading();

        // Wyślij odpowiedź do /api/quiz/{id}/check
        const response = await fetch(`/api/quiz/${QUIZ_ID}/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question_id: currentQuestion.id,
                answer: selectedAnswer
            })
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
            } else {
                feedbackHeader.textContent = '❌ Niepoprawna odpowiedź';
                feedbackHeader.className = 'feedback-header incorrect';
            }

            feedbackText.textContent = data.explanation;
            feedbackBox.classList.remove('hidden');

            // Podświetl poprawną odpowiedź
            highlightCorrectAnswer(data.correct_answer, selectedAnswer);
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
 * Pokaż określony ekran (start/question/finish)
 */
function showScreen(screenName) {
    startScreen.classList.remove('active');
    questionScreen.classList.remove('active');
    finishScreen.classList.remove('active');

    if (screenName === 'start') startScreen.classList.add('active');
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
