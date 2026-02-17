let tree = null;
let answers = {};
let resultPayload = null;

let loadingEl;
let wizardEl;
let resultEl;
let errorEl;
let questionLabelEl;
let optionsEl;
let breadcrumbsEl;
let progressLabelEl;
let progressFillEl;
let alphaInputEl;

const TAIL_LABELS = {
    two_sided: 'Dwustronna',
    left: 'Lewostronna',
    right: 'Prawostronna',
    global: 'Globalna'
};

document.addEventListener('DOMContentLoaded', async () => {
    bindDom();
    bindActions();
    await initialize();
});

function bindDom() {
    loadingEl = document.getElementById('loading');
    wizardEl = document.getElementById('wizard');
    resultEl = document.getElementById('result');
    errorEl = document.getElementById('error-box');
    questionLabelEl = document.getElementById('question-label');
    optionsEl = document.getElementById('options');
    breadcrumbsEl = document.getElementById('breadcrumbs');
    progressLabelEl = document.getElementById('progress-label');
    progressFillEl = document.getElementById('progress-fill');
    alphaInputEl = document.getElementById('alpha-input');
}

function bindActions() {
    document.getElementById('btn-back').addEventListener('click', handleBack);
    document.getElementById('btn-reset').addEventListener('click', resetWizard);
    document.getElementById('btn-edit').addEventListener('click', () => showResult(false));
    document.getElementById('btn-reset-result').addEventListener('click', resetWizard);
}

async function initialize() {
    setError('');
    showLoading(true);
    try {
        const response = await fetch('/api/tree');
        const data = await response.json();
        if (!data.success) {
            throw new Error('Nie udalo sie pobrac konfiguracji drzewa.');
        }
        tree = data.tree;
        alphaInputEl.value = tree.default_alpha || 0.05;
        renderWizard();
    } catch (error) {
        setError(error.message);
    } finally {
        showLoading(false);
    }
}

function showLoading(visible) {
    loadingEl.classList.toggle('st-loading--visible', visible);
    loadingEl.style.display = visible ? '' : 'none';
}

function showResult(visible) {
    resultEl.classList.toggle('ts-hidden', !visible);
    wizardEl.classList.toggle('ts-hidden', visible);
}

function setError(message) {
    if (!message) {
        errorEl.classList.add('ts-hidden');
        errorEl.textContent = '';
        return;
    }
    errorEl.classList.remove('ts-hidden');
    errorEl.textContent = message;
}

function matchesConstraints(constraints, stateAnswers) {
    if (!constraints) {
        return true;
    }
    return Object.entries(constraints).every(([key, expected]) => {
        if (!(key in stateAnswers)) {
            return false;
        }
        const value = stateAnswers[key];
        if (Array.isArray(expected)) {
            return expected.includes(value);
        }
        return value === expected;
    });
}

function getActiveQuestions(stateAnswers) {
    return tree.questions.filter((q) => matchesConstraints(q.when, stateAnswers));
}

function getCurrentQuestion(activeQuestions, stateAnswers) {
    return activeQuestions.find((q) => !(q.id in stateAnswers));
}

function getOptionLabel(question, value) {
    const option = question.options.find((opt) => opt.value === value);
    return option ? option.label : value;
}

function renderBreadcrumbs(activeQuestions) {
    breadcrumbsEl.innerHTML = '';
    activeQuestions.forEach((question) => {
        if (!(question.id in answers)) {
            return;
        }
        const chip = document.createElement('span');
        chip.className = 'ts-chip';
        chip.textContent = `${question.label}: ${getOptionLabel(question, answers[question.id])}`;
        breadcrumbsEl.appendChild(chip);
    });
}

function updateProgress(activeQuestions) {
    const answered = activeQuestions.filter((q) => q.id in answers).length;
    const total = activeQuestions.length || 1;
    const percent = Math.round((answered / total) * 100);
    progressLabelEl.textContent = `Postep: ${percent}%`;
    progressFillEl.style.width = `${percent}%`;
}

async function renderWizard() {
    if (!tree) {
        return;
    }

    setError('');
    showResult(false);

    const activeQuestions = getActiveQuestions(answers);
    const currentQuestion = getCurrentQuestion(activeQuestions, answers);

    renderBreadcrumbs(activeQuestions);
    updateProgress(activeQuestions);

    if (!currentQuestion) {
        await resolveResult();
        return;
    }

    questionLabelEl.textContent = currentQuestion.label;
    optionsEl.innerHTML = '';

    currentQuestion.options.forEach((option) => {
        const button = document.createElement('button');
        button.className = 'ts-option';
        if (answers[currentQuestion.id] === option.value) {
            button.classList.add('ts-option--selected');
        }
        button.textContent = option.label;
        button.addEventListener('click', () => {
            answers[currentQuestion.id] = option.value;
            pruneAnswers();
            renderWizard();
        });
        optionsEl.appendChild(button);
    });
}

function pruneAnswers() {
    const active = getActiveQuestions(answers).map((q) => q.id);
    Object.keys(answers).forEach((qid) => {
        if (!active.includes(qid)) {
            delete answers[qid];
        }
    });
}

function handleBack() {
    const activeQuestions = getActiveQuestions(answers);
    const answeredIds = activeQuestions.filter((q) => q.id in answers).map((q) => q.id);
    if (answeredIds.length === 0) {
        return;
    }
    const lastId = answeredIds[answeredIds.length - 1];
    delete answers[lastId];
    renderWizard();
}

async function resetWizard() {
    try {
        await fetch('/api/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        // ignore reset failure and still reset local state
    }
    answers = {};
    resultPayload = null;
    renderWizard();
}

async function resolveResult() {
    setError('');
    showLoading(true);

    try {
        const response = await fetch('/api/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers })
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            const reason = data.error || 'Nie udalo sie wyznaczyc testu.';
            setError(reason);
            return;
        }

        resultPayload = data.result;
        renderResult(resultPayload);
        showResult(true);
    } catch (error) {
        setError(error.message);
    } finally {
        showLoading(false);
    }
}

function renderResult(result) {
    document.getElementById('primary-test').textContent = result.test_primary;
    document.getElementById('rule-id').textContent = `Regula: ${result.rule_id}`;
    document.getElementById('example').textContent = result.example;

    const alternativesEl = document.getElementById('alternatives');
    alternativesEl.innerHTML = '';
    (result.test_alternatives || []).forEach((alt) => {
        const li = document.createElement('li');
        li.textContent = `${alt.condition}: ${alt.test}`;
        alternativesEl.appendChild(li);
    });
    if ((result.test_alternatives || []).length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Brak alternatyw dla tej sciezki.';
        alternativesEl.appendChild(li);
    }

    const assumptionsEl = document.getElementById('assumptions');
    assumptionsEl.innerHTML = '';
    (result.assumptions || []).forEach((assumption) => {
        const li = document.createElement('li');
        li.textContent = assumption;
        assumptionsEl.appendChild(li);
    });

    const hypothesesEl = document.getElementById('hypotheses');
    hypothesesEl.innerHTML = '';
    const variants = (result.hypotheses && result.hypotheses.variants) || [];

    variants.forEach((variant) => {
        const card = document.createElement('div');
        card.className = 'ts-hypothesis';

        const tail = document.createElement('div');
        tail.className = 'ts-tail';
        tail.textContent = TAIL_LABELS[variant.tail] || variant.tail;

        const h0 = document.createElement('div');
        h0.className = 'ts-equation';
        h0.textContent = variant.h0;

        const ha = document.createElement('div');
        ha.className = 'ts-equation';
        ha.textContent = variant.ha;

        card.appendChild(tail);
        card.appendChild(h0);
        card.appendChild(ha);
        hypothesesEl.appendChild(card);
    });

    const alpha = Number(alphaInputEl.value);
    if (!Number.isNaN(alpha) && alpha > 0 && alpha < 1) {
        const alphaCard = document.createElement('div');
        alphaCard.className = 'ts-hypothesis';
        alphaCard.innerHTML = `<div class="ts-tail">Poziom istotnosci pomocniczo</div><div class="ts-equation">alpha = ${alpha.toFixed(3)}</div>`;
        hypothesesEl.appendChild(alphaCard);
    }
}
