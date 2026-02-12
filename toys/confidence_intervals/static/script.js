/**
 * script.js - Logika quizu przedziałów ufności
 */

// Konfiguracja trybu (z quiz.html)
const MODE_CONFIG = window.MODE_CONFIG;
const MODE_ID = document.body.dataset.modeId;

// Stan quizu
let currentQuestion = null;
let answered = false;
let questionCount = 0;
let totalQuestions = 20;
let correctCount = 0;
let totalAnswered = 0;

// Elementy DOM
let startScreen, questionScreen, finishScreen, loadingEl;
let btnStart, btnNext, btnRestart;
let questionText, feedbackBox, feedbackHeader, feedbackText;
let answerButtons;
let questionCounter;
let scoreResult, scorePercent, scoreBar;

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

    answerButtons = document.querySelectorAll('.btn-answer');
    questionCounter = document.getElementById('question-counter');
    scoreResult = document.getElementById('score-result');
    scorePercent = document.getElementById('score-percent');
    scoreBar = document.getElementById('score-bar');

    // Event listeners
    btnStart.addEventListener('click', startQuiz);
    btnRestart.addEventListener('click', startQuiz);
    btnNext.addEventListener('click', loadNextQuestion);

    answerButtons.forEach(btn => {
        btn.addEventListener('click', handleAnswer);
    });
});

/**
 * Rozpocznij quiz - inicjalizacja sesji
 */
async function startQuiz() {
    try {
        showLoading();

        // Wywołaj /api/quiz/{mode_id}/start
        const response = await fetch(`/api/quiz/${MODE_ID}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.success) {
            // Reset wyników
            totalQuestions = data.total_questions;
            questionCount = 0;
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
        enableAnswerButtons();

        // Pobierz pytanie z /api/quiz/{mode_id}/next
        const response = await fetch(`/api/quiz/${MODE_ID}/next`);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.success) {
            if (data.finished) {
                // Koniec pytań - pokaż wynik
                showFinishScreen();
            } else {
                // Wyświetl pytanie
                currentQuestion = data.question;
                questionCount = totalQuestions - data.remaining + 1;

                questionText.textContent = currentQuestion.question;
                questionCounter.textContent = `Pytanie ${questionCount} / ${totalQuestions}`;

                // Rysuj wizualizację (początkowy stan - bez feedbacku)
                // Wizualizacja pojawia się od razu, aby użytkownik mógł zobaczyć przedziały
                // Opóźnienie daje czas na wyrenderowanie kontenera
                setTimeout(() => {
                    CIVisualizer.draw(MODE_ID, currentQuestion, false, false);
                }, 100);
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
 * Obsługa wyboru odpowiedzi
 */
async function handleAnswer(event) {
    if (answered) return;  // Już odpowiedziano

    const selectedAnswer = event.target.dataset.answer;

    try {
        showLoading();

        // Wyślij odpowiedź do /api/quiz/{mode_id}/check
        const response = await fetch(`/api/quiz/${MODE_ID}/check`, {
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

            // Podświetl wybraną odpowiedź
            highlightAnswerButton(selectedAnswer, data.correct_answer);

            // Zaktualizuj wizualizację (podświetlenie)
            // Opóźnienie zapewnia że feedback jest już wyświetlony
            setTimeout(() => {
                CIVisualizer.draw(MODE_ID, data.question_data, true, data.correct);
            }, 50);
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
 * Podświetl przycisk odpowiedzi
 */
function highlightAnswerButton(userAnswer, correctAnswer) {
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
    answerButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.cursor = 'not-allowed';
        btn.style.opacity = '0.6';
    });
}

/**
 * Włącz przyciski odpowiedzi (nowe pytanie)
 */
function enableAnswerButtons() {
    answerButtons.forEach(btn => {
        btn.disabled = false;
        btn.style.cursor = 'pointer';
        btn.style.opacity = '1';
        btn.classList.remove('correct', 'incorrect');
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
    if (percent >= 80) {
        scoreBar.className = 'score-bar-fill excellent';
    } else if (percent >= 50) {
        scoreBar.className = 'score-bar-fill good';
    } else {
        scoreBar.className = 'score-bar-fill needs-work';
    }

    showScreen('finish');
}
