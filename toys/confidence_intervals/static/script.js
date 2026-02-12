/**
 * script.js - Logika quizu przedziałów ufności
 */

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
let progressBar, progressFill;
let btnHint, hintBox, hintText;

document.addEventListener('DOMContentLoaded', function() {
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

    answerButtons = document.querySelectorAll('.st-btn-answer');
    questionCounter = document.getElementById('question-counter');
    scoreResult = document.getElementById('score-result');
    scorePercent = document.getElementById('score-percent');
    scoreBar = document.getElementById('score-bar');
    progressBar = document.getElementById('progress-bar');
    progressFill = document.getElementById('progress-fill');
    btnHint = document.getElementById('btn-hint');
    hintBox = document.getElementById('hint-box');
    hintText = document.getElementById('hint-text');

    btnStart.addEventListener('click', startQuiz);
    btnRestart.addEventListener('click', startQuiz);
    btnNext.addEventListener('click', loadNextQuestion);
    btnHint.addEventListener('click', fetchHint);

    answerButtons.forEach(btn => {
        btn.addEventListener('click', handleAnswer);
    });
});

/**
 * Aktualizuj progress bar
 */
function updateProgress() {
    const progress = totalQuestions > 0
        ? ((totalAnswered) / totalQuestions) * 100
        : 0;
    progressFill.style.width = `${progress}%`;
}

async function startQuiz() {
    try {
        showLoading();

        const response = await fetch(`/api/quiz/${MODE_ID}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.success) {
            totalQuestions = data.total_questions;
            questionCount = 0;
            correctCount = 0;
            totalAnswered = 0;

            progressBar.style.display = '';
            updateProgress();

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

async function loadNextQuestion() {
    try {
        showLoading();

        answered = false;
        feedbackBox.classList.add('st-feedback--hidden');
        hintBox.classList.add('st-hint--hidden');
        btnHint.disabled = false;
        enableAnswerButtons();

        const response = await fetch(`/api/quiz/${MODE_ID}/next`);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.success) {
            if (data.finished) {
                showFinishScreen();
            } else {
                currentQuestion = data.question;
                questionCount = totalQuestions - data.remaining + 1;

                questionText.textContent = currentQuestion.question;
                questionCounter.textContent = `Pytanie ${questionCount} / ${totalQuestions}`;
                updateProgress();

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

async function handleAnswer(event) {
    if (answered) return;

    const selectedAnswer = event.target.dataset.answer;

    try {
        showLoading();

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
            updateProgress();

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
            }

            feedbackText.textContent = data.explanation;
            feedbackBox.classList.remove('st-feedback--hidden');

            highlightAnswerButton(selectedAnswer, data.correct_answer);

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

async function fetchHint() {
    try {
        btnHint.disabled = true;

        const response = await fetch(`/api/quiz/${MODE_ID}/hint`);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.success) {
            hintText.textContent = data.hint;
            hintBox.classList.remove('st-hint--hidden');
        } else {
            alert('Błąd: ' + data.error);
            btnHint.disabled = false;
        }
    } catch (error) {
        console.error('Błąd pobierania podpowiedzi:', error);
        alert('Błąd połączenia: ' + error.message);
        btnHint.disabled = false;
    }
}

function highlightAnswerButton(userAnswer, correctAnswer) {
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

function disableAnswerButtons() {
    answerButtons.forEach(btn => {
        btn.disabled = true;
    });
}

function enableAnswerButtons() {
    answerButtons.forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('st-btn-answer--correct', 'st-btn-answer--incorrect', 'st-btn-answer--dimmed');
    });
}

function showScreen(screenName) {
    startScreen.classList.remove('st-screen--active');
    questionScreen.classList.remove('st-screen--active');
    finishScreen.classList.remove('st-screen--active');

    if (screenName === 'start') startScreen.classList.add('st-screen--active');
    else if (screenName === 'question') questionScreen.classList.add('st-screen--active');
    else if (screenName === 'finish') finishScreen.classList.add('st-screen--active');
}

function showLoading() {
    loadingEl.classList.add('st-loading--active');
}

function hideLoading() {
    loadingEl.classList.remove('st-loading--active');
}

function showFinishScreen() {
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

    progressBar.style.display = 'none';
    showScreen('finish');
}
