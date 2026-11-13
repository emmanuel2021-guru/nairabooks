"""Keyword cannibalization detection tool for NairaBooks SEO strategy.

Analyzes keyword target mappings across pages and articles to ensure each
valuable search query maps to a single canonical URL.
"""

from __future__ import annotations

import argparse
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def parse_keyword_database(db_path: Path) -> dict[str, list[str]]:
    content = db_path.read_text(encoding="utf-8", errors="replace")
    keyword_to_urls: dict[str, list[str]] = defaultdict(list)

    # Match rows: | `keyword` | volume | kd | intent | `url` | ... |
    pattern = r"\|\s*`([^`]+)`\s*\|\s*[^|]+\|\s*[^|]+\|\s*[^|]+\|\s*`([^`]+)`\s*\|"
    matches = re.findall(pattern, content)

    for kw, url in matches:
        clean_kw = kw.strip().lower()
        clean_url = url.strip()
        if clean_url not in keyword_to_urls[clean_kw]:
            keyword_to_urls[clean_kw].append(clean_url)

    return keyword_to_urls


def generate_cannibalization_report(keyword_to_urls: dict[str, list[str]]) -> tuple[bool, str]:
    cannibalized: dict[str, list[str]] = {
        kw: urls for kw, urls in keyword_to_urls.items() if len(urls) > 1
    }

    lines = [
        "# NairaBooks Keyword Cannibalization Audit (`docs/seo/CANNIBALIZATION_AUDIT.md`)",
        "",
        "> Automated audit verifying zero internal keyword competition across routes.",
        "",
        f"**Total Tracked Target Keywords:** {len(keyword_to_urls)}",
        f"**Cannibalization Conflicts Detected:** {len(cannibalized)}",
        "",
        "---",
        "",
    ]

    if not cannibalized:
        lines.append("## [PASS] Zero Keyword Cannibalization Detected")
        lines.append("Every targeted Nigerian search query is assigned to exactly one unique canonical route.")
        lines.append("")
        lines.append("### Verified Canonical Route Mappings:")
        for kw, urls in sorted(keyword_to_urls.items()):
            lines.append(f"- **`{kw}`** -> `{urls[0]}`")
        is_clean = True
    else:
        lines.append("## [FAIL] Keyword Cannibalization Conflicts Found:")
        for kw, urls in sorted(cannibalized.items()):
            lines.append(f"- **`{kw}`** is targeted by multiple URLs: {', '.join(urls)}")
        is_clean = False

    return is_clean, "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Check for SEO keyword cannibalization.")
    parser.add_argument(
        "--db",
        type=Path,
        default=ROOT / "docs" / "seo" / "KEYWORD_STRATEGY_DATABASE.md",
        help="Keyword database path",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "docs" / "seo" / "CANNIBALIZATION_AUDIT.md",
        help="Output audit markdown path",
    )
    args = parser.parse_args()

    if not args.db.is_file():
        print(f"[ERROR] Database file not found: {args.db}")
        return 1

    keyword_to_urls = parse_keyword_database(args.db)
    is_clean, report_md = generate_cannibalization_report(keyword_to_urls)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(report_md, encoding="utf-8")
    print(f"[OK] Audit report written to {args.output}")

    if is_clean:
        print(f"[SUCCESS] Zero keyword cannibalization! All {len(keyword_to_urls)} keywords map cleanly.\n")
        return 0
    else:
        print("[WARNING] Keyword cannibalization detected. Review report for resolution.\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
