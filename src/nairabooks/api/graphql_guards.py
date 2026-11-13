"""GraphQL query depth and cost guardrails matching docs/API_REFERENCE.md."""

from __future__ import annotations

from typing import Literal, overload

from nairabooks.ledger.domain import ValidationError

MAX_QUERY_DEPTH = 8
MAX_QUERY_COST = 500


@overload
def validate_graphql_query(query: str, *, raise_on_error: Literal[True] = ...) -> None: ...


@overload
def validate_graphql_query(
    query: str, *, raise_on_error: Literal[False]
) -> dict[str, object] | None: ...


def validate_graphql_query(
    query: str,
    *,
    raise_on_error: bool = True,
) -> dict[str, object] | None:
    """Enforce selection-set depth <= 8 and estimated cost <= 500."""
    stripped = query.strip()
    if not stripped:
        err: dict[str, object] = {
            "__typename": "ValidationError",
            "code": "VALIDATION_ERROR",
            "message": "Empty query.",
        }
        if raise_on_error:
            raise ValidationError("GraphQL query cannot be empty.", field="query")
        return err

    depth = 0
    max_depth = 0
    in_string = False
    escape = False
    field_tokens = 0
    for ch in stripped:
        if escape:
            escape = False
            continue
        if ch == "\\" and in_string:
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
            if depth > max_depth:
                max_depth = depth
            field_tokens += 2
        elif ch == "}":
            depth = max(0, depth - 1)
        elif ch == "\n":
            field_tokens += 1

    if max_depth > MAX_QUERY_DEPTH:
        msg = f"GraphQL query depth {max_depth} exceeds maximum allowed depth {MAX_QUERY_DEPTH}."
        if raise_on_error:
            raise ValidationError(msg, field="query")
        return {
            "__typename": "ValidationError",
            "code": "VALIDATION_ERROR",
            "message": msg,
            "field": "query",
        }

    estimated_cost = max(len(stripped.split()), field_tokens)
    if estimated_cost > MAX_QUERY_COST:
        msg = f"GraphQL query cost {estimated_cost} exceeds ceiling {MAX_QUERY_COST}."
        if raise_on_error:
            raise ValidationError(msg, field="query")
        return {
            "__typename": "ValidationError",
            "code": "VALIDATION_ERROR",
            "message": msg,
            "field": "query",
        }
    return None
