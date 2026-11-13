"""Automated Phase 5 design system, WCAG 2.2 AA contrast, and Stitch export tests."""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOKENS_PATH = ROOT / "design" / "tokens" / "nairabooks.tokens.json"
TAILWIND_CONFIG_PATH = ROOT / "design" / "tailwind.config.ts"
GLOBALS_CSS_PATH = ROOT / "design" / "globals.css"
STITCH_MANIFEST_PATH = ROOT / "design" / "stitch" / "manifest.json"
ILLUSTRATIONS_DIR = ROOT / "design" / "illustrations"
DESIGN_DOC_PATH = ROOT / "docs" / "PHASE_5_DESIGN_SYSTEM.md"

FLAGSHIP_PACKS = [
    "Retail & E-commerce",
    "Wholesale & Distribution",
    "Manufacturing (Light / Small Scale)",
    "Construction & Trades",
    "Professional Services",
    "Non-Profit Organizations",
    "Universal Custom / Composable Pack",
]

BEGINNER_PACK_TILES = [
    "Retail & Online Shop",
    "Wholesale & Supply",
    "Maker & Light Factory",
    "Builder & Contractor",
    "Services & Agency",
    "Non-Profit / NGO",
    "Mix and match modules",
]


def _srgb_channel_luminance(channel_255: int) -> float:
    """Convert an 8-bit sRGB channel value to WCAG relative linear luminance."""
    c = channel_255 / 255.0
    if c <= 0.04045:
        return c / 12.92
    return float(((c + 0.055) / 1.055) ** 2.4)


def relative_luminance(hex_color: str) -> float:
    """Compute WCAG 2.2 relative luminance for a `#RRGGBB` hex string."""
    cleaned = hex_color.strip().lstrip("#")
    if len(cleaned) != 6:
        raise ValueError(f"Expected 6-digit hex color, got {hex_color!r}")
    r = _srgb_channel_luminance(int(cleaned[0:2], 16))
    g = _srgb_channel_luminance(int(cleaned[2:4], 16))
    b = _srgb_channel_luminance(int(cleaned[4:6], 16))
    return (0.2126 * r) + (0.7152 * g) + (0.0722 * b)


def contrast_ratio(fg_hex: str, bg_hex: str) -> float:
    """Return WCAG 2.2 contrast ratio (>= 1.0) between two `#RRGGBB` colors."""
    lum_a = relative_luminance(fg_hex)
    lum_b = relative_luminance(bg_hex)
    lighter = max(lum_a, lum_b)
    darker = min(lum_a, lum_b)
    return (lighter + 0.05) / (darker + 0.05)


def test_design_tokens_satisfy_wcag_aa_contrast() -> None:
    """Verify every documented light and dark token pair satisfies WCAG 2.2 AA."""
    tokens = json.loads(TOKENS_PATH.read_text(encoding="utf-8"))
    assert tokens["meta"]["stitchProject"] == "projects/9422961334487487882"
    assert tokens["meta"]["stitchDesignSystem"] == "assets/8475106491343804798"

    pairs: list[dict[str, object]] = tokens["contrastPairs"]
    assert len(pairs) >= 15

    for pair in pairs:
        mode = str(pair["mode"])
        fg_key = str(pair["fg"])
        bg_key = str(pair["bg"])
        min_ratio = float(str(pair["minRatio"]))
        palette: dict[str, str] = tokens["semantic"][mode]
        ratio = contrast_ratio(palette[fg_key], palette[bg_key])
        assert ratio >= min_ratio, (
            f"{pair['name']} ({mode}: {fg_key}={palette[fg_key]} on "
            f"{bg_key}={palette[bg_key]}) measured {ratio:.2f}:1 < {min_ratio}:1"
        )


def test_tailwind_and_css_expose_accessible_financial_primitives() -> None:
    """Confirm Tailwind config and globals.css wire tokens, tabular nums, and focus rules."""
    tailwind_cfg = TAILWIND_CONFIG_PATH.read_text(encoding="utf-8")
    globals_css = GLOBALS_CSS_PATH.read_text(encoding="utf-8")

    assert "darkMode: 'class'" in tailwind_cfg
    assert "sticky-clearance" in tailwind_cfg
    for token_var in [
        "--nb-background",
        "--nb-surface",
        "--nb-foreground",
        "--nb-primary",
        "--nb-secondary",
        "--nb-warning",
        "--nb-destructive",
        "--nb-focus-ring",
    ]:
        assert token_var in tailwind_cfg
        assert token_var in globals_css

    assert ".nb-skip-link" in globals_css
    assert ".nb-money-cell" in globals_css
    assert "tabular-nums" in globals_css
    assert ":focus-visible" in globals_css
    assert "prefers-reduced-motion: reduce" in globals_css


def test_stitch_exports_and_onboarding_pack_coverage() -> None:
    """Validate local Google Stitch HTML/PNG exports exist and cover all packs."""
    manifest = json.loads(STITCH_MANIFEST_PATH.read_text(encoding="utf-8"))
    assert manifest["projectId"] == "9422961334487487882"
    assert manifest["designSystem"] == "assets/8475106491343804798"

    screens: list[dict[str, object]] = manifest["screens"]
    assert len(screens) == 8
    expected_slugs = [
        "screen-1-setup-business",
        "screen-2-overview-top-nav",
        "screen-3-books-hub",
        "screen-4-book-entry-form",
        "screen-5-journal-adjustments",
        "screen-6-directory-create",
        "screen-7-pdf-bank-reconcile",
        "screen-8-reports-center",
    ]
    assert [str(screen["slug"]) for screen in screens] == expected_slugs

    for screen in screens:
        html_path = ROOT / str(screen["htmlPath"])
        png_path = ROOT / str(screen["screenshotPath"])
        assert html_path.is_file(), f"Missing Stitch HTML export: {html_path}"
        assert png_path.is_file(), f"Missing Stitch PNG export: {png_path}"
        assert html_path.stat().st_size > 10_000
        assert png_path.stat().st_size > 100_000
        html_body = html_path.read_text(encoding="utf-8")
        assert re.search(r"<(header|main|nav)\b", html_body, re.IGNORECASE)
        assert re.search(r"<h1\b", html_body, re.IGNORECASE), f"Missing <h1> in {screen['slug']}"
        assert "<aside" not in html_body.lower(), f"Sidebar found in {screen['slug']}"
        assert "skip" in html_body.lower(), f"Missing skip link in {screen['slug']}"
        assert "fixed bottom-0" not in html_body.lower(), (
            f"Overlapping fixed bottom footer found in {screen['slug']}"
        )

    onboarding_html = html.unescape(
        (ROOT / "design" / "stitch" / "screen-1-setup-business.html").read_text(encoding="utf-8")
    )
    for tile_label in BEGINNER_PACK_TILES:
        assert tile_label in onboarding_html, (
            f"Beginner tile {tile_label!r} missing from Step 1 onboarding"
        )

    books_html = html.unescape(
        (ROOT / "design" / "stitch" / "screen-3-books-hub.html").read_text(encoding="utf-8")
    )
    for book_name in [
        "Sales Order / Quotes",
        "Sales Invoice",
        "Receipt",
        "Credit Note",
        "Purchase Order",
        "Purchase Invoice",
        "Payment",
        "Debit Note",
        "Inventory Adjustment Journal",
        "Journal",
    ]:
        assert book_name in books_html, f"Book {book_name!r} missing from Books Hub"

    directory_html = html.unescape(
        (ROOT / "design" / "stitch" / "screen-6-directory-create.html").read_text(encoding="utf-8")
    )
    for record_type in ["Customers", "Vendors / Suppliers", "Inventory Items"]:
        assert record_type in directory_html, f"Missing {record_type!r} in People & Stock screen"

    reconcile_html = html.unescape(
        (ROOT / "design" / "stitch" / "screen-7-pdf-bank-reconcile.html").read_text(
            encoding="utf-8"
        )
    )
    assert "Upload Bank Statement PDF" in reconcile_html
    assert "Confirm Match" in reconcile_html

    reports_html = html.unescape(
        (ROOT / "design" / "stitch" / "screen-8-reports-center.html").read_text(encoding="utf-8")
    )
    for report_item in [
        "Profit & Loss",
        "Balance Sheet",
        "Cash Flow",
        "Minor Reports & Quick Lists",
    ]:
        assert report_item in reports_html, f"Missing {report_item!r} in Reports screen"

    for table_slug in [
        "screen-5-journal-adjustments.html",
        "screen-6-directory-create.html",
        "screen-8-reports-center.html",
    ]:
        table_html = (ROOT / "design" / "stitch" / table_slug).read_text(encoding="utf-8")
        assert 'scope="col"' in table_html.lower(), f"Missing scope=col headers in {table_slug}"


def test_grav_illustrations_and_phase5_docs_complete() -> None:
    """Verify Grav illustration assets and Phase 5 KPI + screen-reader docs exist."""
    flow_img = ILLUSTRATIONS_DIR / "nairabooks-double-entry-flow.jpg"
    packs_img = ILLUSTRATIONS_DIR / "nairabooks-composable-packs.jpg"
    assert flow_img.is_file() and flow_img.stat().st_size > 20_000
    assert packs_img.is_file() and packs_img.stat().st_size > 20_000

    doc = DESIGN_DOC_PATH.read_text(encoding="utf-8")
    for pack_name in FLAGSHIP_PACKS[:6]:
        assert pack_name in doc
    assert "Universal Custom / Composable Builder" in doc
    for reader in ["NVDA + Firefox", "VoiceOver + Safari", "JAWS + Chrome", "TalkBack + Chrome"]:
        assert reader in doc
    for finding_id in ["A11Y-01", "A11Y-02", "A11Y-03", "A11Y-04", "A11Y-05"]:
        assert finding_id in doc


def test_live_preview_gallery_wires_all_screens_and_assets() -> None:
    """Ensure local preview gallery links all 8 Stitch screens, tokens, and Grav visuals."""
    root_index = (ROOT / "design" / "index.html").read_text(encoding="utf-8")
    preview_html = (ROOT / "design" / "preview" / "index.html").read_text(encoding="utf-8")

    assert "./preview/index.html" in root_index
    for target in [
        "../stitch/screen-1-setup-business.html",
        "../stitch/screen-2-overview-top-nav.html",
        "../stitch/screen-3-books-hub.html",
        "../stitch/screen-4-book-entry-form.html",
        "../stitch/screen-5-journal-adjustments.html",
        "../stitch/screen-6-directory-create.html",
        "../stitch/screen-7-pdf-bank-reconcile.html",
        "../stitch/screen-8-reports-center.html",
        "../illustrations/nairabooks-double-entry-flow.jpg",
        "../illustrations/nairabooks-composable-packs.jpg",
        "../tokens/nairabooks.tokens.json",
    ]:
        assert target in preview_html

