let tree = null;
let answers = {};

const TAIL_LABELS = {
    two_sided: 'Dwustronna',
    left: 'Lewostronna',
    right: 'Prawostronna',
    global: 'Globalna'
};

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('btn-reset-tree').addEventListener('click', resetTree);
    await loadTree();
    renderTree();
});

async function loadTree() {
    try {
        const response = await fetch('/api/tree');
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error('Nie udało się wczytać konfiguracji drzewa.');
        }
        tree = data.tree;
    } catch (error) {
        setError(error.message);
    }
}

function setError(message) {
    const box = document.getElementById('tree-error');
    if (!message) {
        box.classList.add('ts-hidden');
        box.textContent = '';
        return;
    }
    box.classList.remove('ts-hidden');
    box.textContent = message;
}

function matchesConstraints(constraints, currentAnswers) {
    if (!constraints) {
        return true;
    }
    return Object.entries(constraints).every(([key, expected]) => {
        if (!(key in currentAnswers)) {
            return false;
        }
        return currentAnswers[key] === expected;
    });
}

function getActiveQuestions(currentAnswers) {
    return tree.questions.filter((question) => matchesConstraints(question.when, currentAnswers));
}

function getOptionLabel(question, value) {
    const option = question.options.find((opt) => opt.value === value);
    return option ? option.label : value;
}

function pruneAnswers() {
    const activeIds = new Set(getActiveQuestions(answers).map((q) => q.id));
    Object.keys(answers).forEach((qid) => {
        if (!activeIds.has(qid)) {
            delete answers[qid];
        }
    });
}

function updatePath(activeQuestions) {
    const pathEl = document.getElementById('path');
    pathEl.innerHTML = '';

    activeQuestions.forEach((question) => {
        if (!(question.id in answers)) {
            return;
        }

        const chip = document.createElement('span');
        chip.className = 'ts-path-chip';
        chip.textContent = `${question.label}: ${getOptionLabel(question, answers[question.id])}`;
        pathEl.appendChild(chip);
    });
}

function renderTree() {
    if (!tree) {
        return;
    }

    setError('');

    const canvas = document.getElementById('tree-canvas');
    canvas.innerHTML = '';

    const activeQuestions = getActiveQuestions(answers);
    updatePath(activeQuestions);

    activeQuestions.forEach((question) => {
        const node = document.createElement('article');
        node.className = 'ts-node';

        const head = document.createElement('div');
        head.className = 'ts-node-head';
        head.textContent = question.label;

        const optionsWrap = document.createElement('div');
        optionsWrap.className = 'ts-node-options';

        question.options.forEach((option) => {
            const btn = document.createElement('button');
            btn.className = 'ts-branch';
            btn.textContent = option.label;
            if (answers[question.id] === option.value) {
                btn.classList.add('ts-branch--active');
            }

            btn.addEventListener('click', () => {
                answers[question.id] = option.value;
                pruneAnswers();
                renderTree();
                maybeResolve();
            });
            optionsWrap.appendChild(btn);
        });

        node.appendChild(head);
        node.appendChild(optionsWrap);
        canvas.appendChild(node);
    });

    maybeResolve();
}

async function maybeResolve() {
    const activeQuestions = getActiveQuestions(answers);
    const hasMissing = activeQuestions.some((q) => !(q.id in answers));
    if (hasMissing || activeQuestions.length === 0) {
        showResult(null);
        return;
    }

    try {
        const response = await fetch('/api/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers })
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            showResult(null);
            setError(data.error || 'Nie udało się wyznaczyć testu.');
            return;
        }

        showResult(data.result);
    } catch (error) {
        showResult(null);
        setError(error.message);
    }
}

function showResult(result) {
    const placeholder = document.getElementById('result-placeholder');
    const box = document.getElementById('result-box');

    if (!result) {
        placeholder.classList.remove('ts-hidden');
        box.classList.add('ts-hidden');
        return;
    }

    placeholder.classList.add('ts-hidden');
    box.classList.remove('ts-hidden');

    document.getElementById('primary-test').textContent = result.test_primary;
    document.getElementById('rule-id').textContent = `Reguła: ${result.rule_id}`;
    document.getElementById('example').textContent = result.example;

    const alternatives = document.getElementById('alternatives');
    alternatives.innerHTML = '';
    (result.test_alternatives || []).forEach((alt) => {
        const li = document.createElement('li');
        li.textContent = `${alt.condition}: ${alt.test}`;
        alternatives.appendChild(li);
    });

    const hypotheses = document.getElementById('hypotheses');
    hypotheses.innerHTML = '';
    const variants = (result.hypotheses && result.hypotheses.variants) || [];
    variants.forEach((variant) => {
        const card = document.createElement('div');
        card.className = 'ts-hypothesis';
        card.innerHTML = `
            <div class="ts-tail">${TAIL_LABELS[variant.tail] || variant.tail}</div>
            <div class="ts-equation">${variant.h0}</div>
            <div class="ts-equation">${variant.ha}</div>
        `;
        hypotheses.appendChild(card);
    });
}

async function resetTree() {
    answers = {};
    await fetch('/api/reset', { method: 'POST' });
    renderTree();
}
