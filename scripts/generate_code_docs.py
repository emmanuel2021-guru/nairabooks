"""Automated code documentation generator for NairaBooks.

Extracts docstrings, dataclasses, use cases, and interfaces using Python AST
and compiles a comprehensive markdown catalog.
"""

from __future__ import annotations

import argparse
import ast
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent


def parse_module(py_file: Path) -> dict[str, Any]:
    try:
        content = py_file.read_text(encoding="utf-8", errors="replace")
        tree = ast.parse(content, filename=str(py_file))
    except Exception as exc:
        return {"error": str(exc), "file": str(py_file)}

    module_doc = ast.get_docstring(tree) or "No module docstring provided."
    classes = []
    functions = []

    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            class_doc = ast.get_docstring(node) or "No class description."
            methods = [
                m.name
                for m in node.body
                if isinstance(m, ast.FunctionDef) and not m.name.startswith("_")
            ]
            classes.append({
                "name": node.name,
                "doc": class_doc.strip().split("\n")[0],
                "methods": methods[:5],
            })
        elif isinstance(node, ast.FunctionDef) and not node.name.startswith("_"):
            func_doc = ast.get_docstring(node) or "No function description."
            functions.append({
                "name": node.name,
                "doc": func_doc.strip().split("\n")[0],
            })

    rel_path = py_file.relative_to(ROOT).as_posix()
    return {
        "path": rel_path,
        "doc": module_doc.strip().split("\n")[0],
        "classes": classes,
        "functions": functions,
    }


def generate_catalog_markdown(source_dir: Path) -> str:
    py_files = sorted(source_dir.rglob("*.py"))
    modules = [parse_module(f) for f in py_files if f.name != "__init__.py"]

    lines = [
        "# NairaBooks Code & Module Catalog (`docs/API_AND_MODULE_CATALOG.md`)",
        "",
        "> Automatically extracted from source code AST by `scripts/generate_code_docs.py`.",
        "",
        f"**Total Modules Documented:** {len(modules)}",
        "",
        "## Table of Bounded Contexts",
        "- [`ledger`](#ledger-domain--application)",
        "- [`tax`](#tax-domain--rules)",
        "- [`packs`](#industry-packs--composition)",
        "- [`identity`](#identity-auth--audit)",
        "- [`compliance`](#compliance-privacy--retention)",
        "- [`diagnostics`](#diagnostics--error-tracing)",
        "",
        "---",
        "",
    ]

    for mod in modules:
        if "error" in mod:
            continue
        lines.append(f"### `{mod['path']}`")
        lines.append(f"**Purpose:** {mod['doc']}")
        lines.append("")

        if mod["classes"]:
            lines.append("**Key Classes & Data Structures:**")
            for cls in mod["classes"]:
                methods_str = f" (Methods: `{', '.join(cls['methods'])}`)" if cls["methods"] else ""
                lines.append(f"- **`{cls['name']}`**: {cls['doc']}{methods_str}")
            lines.append("")

        if mod["functions"]:
            lines.append("**Key Domain Functions:**")
            for fn in mod["functions"]:
                lines.append(f"- `{fn['name']}()`: {fn['doc']}")
            lines.append("")

        lines.append("---")
        lines.append("")

    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate markdown code catalog from Python AST.")
    parser.add_argument("--source", type=Path, default=ROOT / "src" / "nairabooks", help="Source directory")
    parser.add_argument("--output", type=Path, default=ROOT / "docs" / "API_AND_MODULE_CATALOG.md", help="Output file")
    args = parser.parse_args()

    md = generate_catalog_markdown(args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(md, encoding="utf-8")
    print(f"[OK] Generated code catalog at {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
