"""Tests for Phase 12 User Docs, Launch Copy, and SEO Growth automation."""

from __future__ import annotations

from pathlib import Path

from scripts.audit_seo import audit_markdown_article
from scripts.detect_seo_cannibalization import (
    generate_cannibalization_report,
    parse_keyword_database,
)
from scripts.generate_code_docs import generate_catalog_markdown

ROOT = Path(__file__).resolve().parent.parent


def test_phase12_documentation_artifacts_exist_and_non_empty() -> None:
    expected_docs = [
        ROOT / "docs" / "TECHNICAL_MANUAL.md",
        ROOT / "docs" / "API_AND_MODULE_CATALOG.md",
        ROOT / "docs" / "CODEBASE_EXPLAINER.md",
        ROOT / "docs" / "TUTORIAL_ONBOARDING.md",
        ROOT / "docs" / "NIGERIAN_ACCOUNTING_REFERENCE.md",
        ROOT / "CONTRIBUTING.md",
        ROOT / "docs" / "DEVELOPER_ONBOARDING.md",
        ROOT / "docs" / "LAUNCH_MARKETING_PLAYBOOK.md",
        ROOT / "docs" / "SALES_ENABLEMENT_AND_AUTOMATION.md",
        ROOT / "docs" / "CUSTOMER_SUPPORT_PLAYBOOK.md",
        ROOT / "docs" / "seo" / "SEO_CONTENT_PLAN.md",
        ROOT / "docs" / "seo" / "SEO_STRUCTURE_ARCHITECTURE.md",
        ROOT / "docs" / "seo" / "KEYWORD_STRATEGY_DATABASE.md",
        ROOT / "docs" / "seo" / "META_OPTIMIZATION_GUIDE.md",
        ROOT / "docs" / "seo" / "articles" / "ultimate-guide-nigerian-tax-accounting-2025.md",
        ROOT / "docs" / "seo" / "FEATURED_SNIPPETS_PLAYBOOK.md",
        ROOT / "docs" / "seo" / "AUTHORITY_AND_BACKLINK_STRATEGY.md",
        ROOT / "docs" / "seo" / "CANNIBALIZATION_AUDIT.md",
        ROOT / "docs" / "seo" / "CONTENT_REFRESH_SYSTEM.md",
    ]

    for doc in expected_docs:
        assert doc.is_file(), f"Missing required Phase 12 document: {doc}"
        assert doc.stat().st_size > 200, f"Document is too small or empty: {doc}"


def test_code_documentation_generator_produces_catalog() -> None:
    src_dir = ROOT / "src" / "nairabooks"
    markdown = generate_catalog_markdown(src_dir)

    assert "# NairaBooks Code & Module Catalog" in markdown
    assert "Total Modules Documented:" in markdown
    assert "ledger" in markdown
    assert "tax" in markdown
    assert "compliance" in markdown


def test_seo_content_audit_passes_on_pillar_article() -> None:
    pillar = ROOT / "docs" / "seo" / "articles" / "ultimate-guide-nigerian-tax-accounting-2025.md"
    assert pillar.is_file()

    issues = audit_markdown_article(pillar)
    assert not issues, f"Pillar article failed SEO audit: {issues}"


def test_keyword_cannibalization_audit_is_clean() -> None:
    db_file = ROOT / "docs" / "seo" / "KEYWORD_STRATEGY_DATABASE.md"
    assert db_file.is_file()

    kw_map = parse_keyword_database(db_file)
    assert len(kw_map) >= 15, "Expected at least 15 tracked keywords"

    is_clean, report = generate_cannibalization_report(kw_map)
    assert is_clean, f"Keyword cannibalization detected:\n{report}"
    assert "Zero Keyword Cannibalization Detected" in report


def test_nextjs_technical_seo_manifests_configured() -> None:
    sitemap_ts = ROOT / "web" / "src" / "app" / "sitemap.ts"
    robots_ts = ROOT / "web" / "src" / "app" / "robots.ts"
    seo_lib = ROOT / "web" / "src" / "lib" / "seo-meta.ts"

    assert sitemap_ts.is_file()
    assert robots_ts.is_file()
    assert seo_lib.is_file()

    sitemap_content = sitemap_ts.read_text(encoding="utf-8")
    assert "MetadataRoute.Sitemap" in sitemap_content
    assert "/transactions" in sitemap_content
    assert "/reconcile" in sitemap_content
    assert "/guides/nigerian-tax-accounting-2025" in sitemap_content

    robots_content = robots_ts.read_text(encoding="utf-8")
    assert "MetadataRoute.Robots" in robots_content
    assert "disallow: [\"/api/\"" in robots_content or "disallow:" in robots_content
