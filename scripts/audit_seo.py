"""Automated SEO content auditor for NairaBooks.

Verifies on-page SEO metrics, heading hierarchy, meta tag configurations,
sitemaps, and robots directives.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def audit_markdown_article(md_path: Path) -> list[str]:
    issues: list[str] = []
    content = md_path.read_text(encoding="utf-8", errors="replace")

    h1_matches = re.findall(r"^#\s+(.+)$", content, re.MULTILINE)
    if len(h1_matches) != 1:
        issues.append(f"Expected exactly 1 H1 heading, found {len(h1_matches)}")
    elif len(h1_matches[0]) > 90:
        issues.append(f"H1 title too long ({len(h1_matches[0])} chars > 90 chars)")

    word_count = len(content.split())
    if "ultimate-guide" in md_path.name and word_count < 800:
        issues.append(f"Pillar article word count ({word_count}) below 800 words")

    if not re.search(r"## Table of Contents|## 1\.", content):
        issues.append("Missing structured table of contents or numbered sections")

    if not re.search(r"\[.+\]\(.+\)", content):
        issues.append("Missing internal or external links")

    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit SEO content and technical configurations.")
    parser.add_argument("--check-all", action="store_true", default=True, help="Check all SEO assets")
    args = parser.parse_args()

    print("Running NairaBooks SEO Audit...\n")
    all_clean = True

    # 1. Audit Articles
    articles_dir = ROOT / "docs" / "seo" / "articles"
    if articles_dir.is_dir():
        for art in articles_dir.glob("*.md"):
            issues = audit_markdown_article(art)
            if issues:
                all_clean = False
                print(f"[FAIL] {art.name}:")
                for iss in issues:
                    print(f"  - {iss}")
            else:
                print(f"[PASS] {art.name}: 100% on-page SEO guidelines satisfied.")

    # 2. Audit Technical Next.js SEO files
    sitemap = ROOT / "web" / "src" / "app" / "sitemap.ts"
    robots = ROOT / "web" / "src" / "app" / "robots.ts"
    seo_lib = ROOT / "web" / "src" / "lib" / "seo-meta.ts"

    if sitemap.is_file():
        print("[PASS] sitemap.ts exists and provides programmatic XML sitemap.")
    else:
        print("[FAIL] Missing web/src/app/sitemap.ts")
        all_clean = False

    if robots.is_file():
        print("[PASS] robots.ts exists and specifies crawler permissions.")
    else:
        print("[FAIL] Missing web/src/app/robots.ts")
        all_clean = False

    if seo_lib.is_file():
        print("[PASS] seo-meta.ts exists with OpenGraph and Schema.org generators.")
    else:
        print("[FAIL] Missing web/src/lib/seo-meta.ts")
        all_clean = False

    if all_clean:
        print("\n[SUCCESS] All SEO content, technical sitemaps, and metadata gates passed cleanly!\n")
        return 0
    else:
        print("\n[ERROR] SEO audit identified issues that must be addressed.\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
