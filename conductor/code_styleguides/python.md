# Python Code Style Guide (`conductor/code_styleguides/python.md`)

- **Version & Tooling:** Python `>= 3.11`, managed exclusively with `uv`, formatted/linted via `ruff` (`line-length = 100`), type-checked strictly (`from __future__ import annotations`, full parameter/return annotations).
- **Money & Math:** Always use `decimal.Decimal` (never `float`) for currency, tax rates, quantities, and unit costs. Use explicit `ROUND_HALF_UP` quantization rules at posting boundaries.
- **Structure:** `src/nairabooks/` package layout with small single-purpose modules, shallow nesting, early returns, and docstrings on all public classes/functions.
- **Testing:** `pytest` tests live under `tests/`, written test-first (`Red -> Green -> Refactor`).
