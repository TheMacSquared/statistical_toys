// Stan quizu
let currentQuestion = null;
let answered = false;
let totalQuestions = 0;
let questionsAnswered = 0;

// Nazwy typów testów
const TEST_TYPE_NAMES = {
    't_jednej_proby': 'Test t (1 próba)',
    'proporcji': 'Test proporcji',
    't_dwoch_prob': 'Test t (2 próby)',
    'korelacja': 'Korelacja Pearsona',
    'chi_kwadrat': 'Test chi-kwadrat',
    'anova': 'ANOVA'
};

// Elementy DOM
let errorsScreen, questionScreen, finishScreen, loadingEl;
let errorsTitle, errorsIntroText, errorsList;
let btnStartQuiz, btnNext, btnRestart;
let questionCounter, testTypeBadge;
let contextText, resultsBox, answersContainer;
let feedbackBox, feedbackHeader, feedbackText;
let correctAnswerBox, correctAnswerText;

document.addEventListener('DOMContentLoaded', function() {
    // Pobranie elementów
    errorsScreen = document.getElementById('errors-screen');
    questionScreen = document.getElementById('question-screen');
    finishScreen = document.getElementById('finish-screen');
    loadingEl = document.getElementById('loading');

    errorsTitle = document.getElementById('errors-title');
    errorsIntroText = document.getElementById('errors-intro-text');
    errorsList = document.getElementById('errors-list');

    btnStartQuiz = document.getElementById('btn-start-quiz');
    btnNext = document.getElementById('btn-next');
    btnRestart = document.getElementById('btn-restart');

    questionCounter = document.getElementById('question-counter');
    testTypeBadge = document.getElementById('test-type-badge');

    contextText = document.getElementById('context-text');
    resultsBox = document.getElementById('results-box');
    answersContainer = document.getElementById('answers-container');

    feedbackBox = document.getElementById('feedback-box');
    feedbackHeader = document.getElementById('feedback-header');
    feedbackText = document.getElementById('feedback-text');
    correctAnswerBox = document.getElementById('correct-answer-box');
    correctAnswerText = document.getElementById('correct-answer-text');

    // Event listeners
    btnStartQuiz.addEventListener('click', startQuiz);
    btnNext.addEventListener('click', loadNextQuestion);
    btnRestart.addEventListener('click', restartQuiz);

    // Załaduj informacje o błędach
    loadErrorsInfo();
});

/**
 * Załaduj informacje o błędach interpretacyjnych
 */
async function loadErrorsInfo() {
    try {
        showLoading();

        const response = await fetch('/api/errors-info');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.success) {
            displayErrorsInfo(data.data);
        }
    } catch (error) {
        console.error('Błąd ładowania informacji o błędach:', error);
    } finally {
        hideLoading();
    }
}

/**
 * Wyświetl informacje o błędach
 */
function displayErrorsInfo(errorsData) {
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
 * Rozpocznij quiz
 */
async function startQuiz() {
    try {
        showLoading();

        const response = await fetch('/api/quiz/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.success) {
            totalQuestions = data.total_questions;
            questionsAnswered = 0;
            showScreen('question');
            loadNextQuestion();
        } else {
            alert('Błąd: ' + data.error);
        }
    } catch (error) {
        console.error('Błąd startu quizu:', error);
        alert('Błąd połączenia: ' + error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Załaduj następne pytanie
 */
async function loadNextQuestion() {
    try {
        showLoading();

        answered = false;
        feedbackBox.classList.add('hidden');
        correctAnswerBox.classList.add('hidden');

        const response = await fetch('/api/quiz/next');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.success) {
            if (data.finished) {
                showScreen('finish');
            } else {
                currentQuestion = data.question;
                displayQuestion(data.question, data.remaining);
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
 * Wyświetl pytanie
 */
function displayQuestion(question, remaining) {
    questionsAnswered++;

    // Nagłówek
    questionCounter.textContent = `Pytanie ${questionsAnswered} z ${totalQuestions}`;
    testTypeBadge.textContent = TEST_TYPE_NAMES[question.test_type] || question.test_type;

    // Kontekst
    contextText.textContent = question.context;

    // Wyniki
    resultsBox.innerHTML = '';
    question.results.forEach(line => {
        const p = document.createElement('p');
        p.textContent = line;
        resultsBox.appendChild(p);
    });

    // Odpowiedzi
    answersContainer.innerHTML = '';
    const letters = ['A', 'B', 'C'];

    question.answers.forEach((answer, index) => {
        const btn = document.createElement('button');
        btn.className = 'btn-answer';
        btn.dataset.index = answer.index;
        btn.dataset.text = answer.text;

        btn.innerHTML = `<span class="answer-letter">${letters[index]}.</span> ${answer.text}`;

        btn.addEventListener('click', handleAnswer);
        answersContainer.appendChild(btn);
    });
}

/**
 * Obsłuż odpowiedź
 */
async function handleAnswer(event) {
    if (answered) return;

    const btn = event.target.closest('.btn-answer');
    const answerText = btn.dataset.text;

    try {
        showLoading();

        const response = await fetch('/api/quiz/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question_id: currentQuestion.id,
                answer_index: parseInt(btn.dataset.index),
                answer_text: answerText
            })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.success) {
            answered = true;
            disableAnswerButtons();

            // Pokaż feedback
            if (data.correct) {
                feedbackHeader.textContent = 'Poprawna odpowiedź!';
                feedbackHeader.className = 'feedback-header correct';
                btn.classList.add('correct');
            } else {
                feedbackHeader.textContent = 'Niepoprawna odpowiedź';
                feedbackHeader.className = 'feedback-header incorrect';
                btn.classList.add('incorrect');

                // Pokaż poprawną odpowiedź
                correctAnswerText.textContent = data.correct_answer_text;
                correctAnswerBox.classList.remove('hidden');

                // Podświetl poprawną odpowiedź
                highlightCorrectAnswer(data.correct_answer_text);
            }

            feedbackText.textContent = data.feedback;
            feedbackBox.classList.remove('hidden');
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
 * Podświetl poprawną odpowiedź
 */
function highlightCorrectAnswer(correctText) {
    const buttons = answersContainer.querySelectorAll('.btn-answer');
    buttons.forEach(btn => {
        if (btn.dataset.text === correctText) {
            btn.classList.add('correct');
        }
    });
}

/**
 * Wyłącz przyciski odpowiedzi
 */
function disableAnswerButtons() {
    const buttons = answersContainer.querySelectorAll('.btn-answer');
    buttons.forEach(btn => {
        btn.disabled = true;
    });
}

/**
 * Restart quizu
 */
async function restartQuiz() {
    try {
        await fetch('/api/quiz/reset', { method: 'POST' });
        showScreen('errors');
        questionsAnswered = 0;
    } catch (error) {
        console.error('Błąd resetu:', error);
    }
}

/**
 * Pokaż ekran
 */
function showScreen(screenName) {
    errorsScreen.classList.remove('active');
    questionScreen.classList.remove('active');
    finishScreen.classList.remove('active');

    if (screenName === 'errors') errorsScreen.classList.add('active');
    else if (screenName === 'question') questionScreen.classList.add('active');
    else if (screenName === 'finish') finishScreen.classList.add('active');
}

/**
 * Pokaż/ukryj loading
 */
function showLoading() {
    loadingEl.classList.add('active');
}

function hideLoading() {
    loadingEl.classList.remove('active');
}
