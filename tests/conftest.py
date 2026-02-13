"""
Shared pytest fixtures for statistical_toys test suite.

Uses importlib to load Flask app modules from non-package directories
(toys/*) that import from a shared common/ package.
"""
import importlib.util
import sys
import os

import pytest

# ── Paths ──────────────────────────────────────────────────────────
ROOT_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
TOYS_DIR = os.path.join(ROOT_DIR, 'toys')


# ── Module loader ──────────────────────────────────────────────────
def _load_toy_module(toy_name):
    """
    Load toys/<toy_name>/app.py via importlib.

    Each module gets a unique name (toy_<name>) to avoid collisions,
    since all toy apps share the filename 'app.py'.  toys/ is added
    to sys.path so that ``from common.flask_app import ...`` resolves.
    """
    module_key = f"toy_{toy_name}"
    if module_key in sys.modules:
        return sys.modules[module_key]

    app_path = os.path.join(TOYS_DIR, toy_name, 'app.py')
    if TOYS_DIR not in sys.path:
        sys.path.insert(0, TOYS_DIR)

    spec = importlib.util.spec_from_file_location(module_key, app_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_key] = module
    spec.loader.exec_module(module)
    return module


# ── Session-scoped module fixtures (loaded once) ───────────────────

@pytest.fixture(scope="session")
def histogram_module():
    return _load_toy_module("histogram")


@pytest.fixture(scope="session")
def quiz_app_module():
    return _load_toy_module("quiz_app")


@pytest.fixture(scope="session")
def confidence_intervals_module():
    return _load_toy_module("confidence_intervals")


@pytest.fixture(scope="session")
def chi_square_module():
    return _load_toy_module("chi_square")


@pytest.fixture(scope="session")
def pearson_correlation_module():
    return _load_toy_module("pearson_correlation")


# ── Function-scoped client fixtures (reset state each test) ────────

@pytest.fixture
def histogram_client(histogram_module):
    """Flask test client for histogram.  Resets _last_samples."""
    histogram_module._last_samples = None
    histogram_module.app.config['TESTING'] = True
    with histogram_module.app.test_client() as client:
        yield client
    histogram_module._last_samples = None


@pytest.fixture
def quiz_client(quiz_app_module):
    """Flask test client for quiz_app.  Resets quiz_session."""
    _reset_quiz_session(quiz_app_module)
    quiz_app_module.app.config['TESTING'] = True
    with quiz_app_module.app.test_client() as client:
        yield client
    _reset_quiz_session(quiz_app_module)


@pytest.fixture
def ci_client(confidence_intervals_module):
    """Flask test client for confidence_intervals.  Resets quiz_session."""
    _reset_ci_session(confidence_intervals_module)
    confidence_intervals_module.app.config['TESTING'] = True
    with confidence_intervals_module.app.test_client() as client:
        yield client
    _reset_ci_session(confidence_intervals_module)


@pytest.fixture
def chi_client(chi_square_module):
    """Flask test client for chi_square (stateless)."""
    chi_square_module.app.config['TESTING'] = True
    with chi_square_module.app.test_client() as client:
        yield client


@pytest.fixture
def pearson_client(pearson_correlation_module):
    """Flask test client for pearson_correlation (stateless)."""
    pearson_correlation_module.app.config['TESTING'] = True
    with pearson_correlation_module.app.test_client() as client:
        yield client


# ── Helpers ────────────────────────────────────────────────────────

def _reset_quiz_session(module):
    module.quiz_session.update({
        'current_quiz_id': None,
        'remaining_questions': [],
        'shuffled': False,
        'questions': [],
        'total_in_round': 0,
        'correct_count': 0,
        'wrong_count': 0,
    })


def _reset_ci_session(module):
    module.quiz_session.update({
        'mode_id': None,
        'remaining_questions': [],
        'shuffled': False,
        'hints_used': 0,
    })
