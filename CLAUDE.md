# Statistical Toys - Agent Instructions

## Testing
- Run tests before committing: `python -m pytest`
- All 78 tests must pass before any push
- When modifying any `app.py`, run at minimum the corresponding test file:
  - `python -m pytest tests/test_histogram.py`
  - `python -m pytest tests/test_quiz_app.py`
  - `python -m pytest tests/test_confidence_intervals.py`
  - `python -m pytest tests/test_chi_square.py`
  - `python -m pytest tests/test_pearson_correlation.py`
  - `python -m pytest tests/test_biased_sampling.py`
- When adding a new endpoint, add tests for it in the corresponding test file

## Project structure
- 6 Flask desktop apps in `toys/` (histogram, quiz_app, confidence_intervals, chi_square, pearson_correlation, biased_sampling)
- Shared code in `toys/common/`
- Single-user desktop apps using global in-memory sessions, ports 15000-15005
- Tests in `tests/` with importlib-based fixtures in `conftest.py`

## Dependencies
- `pip install -r requirements.txt` installs everything including pytest
