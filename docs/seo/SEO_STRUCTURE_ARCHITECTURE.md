# NairaBooks Technical SEO Architecture (`docs/seo/SEO_STRUCTURE_ARCHITECTURE.md`)

> **Site Architecture, URL Taxonomy, Internal Linking Silos, Crawl Budget & Indexing Rules**  
> *Framework: Next.js 15 App Router, Programmatic Sitemaps, Structured Breadcrumbs*

---

## 1. URL Taxonomy & Directory Structure

Clean, semantic URL paths with hyphenated slugs, zero session IDs, and zero trailing slash ambiguity:
```text
nairabooks.ng/                          # Homepage (Commercial Hero + Feature Overview)
├── /transactions                       # Operations Hub & Outline Register
│   ├── /[type]/new                     # Dedicated Transaction Creation Route (e.g. sales-invoice/new)
│   └── /[type]/[id]                    # Transaction Detail / View Route
├── /reconcile                          # Bank Statement PDF Reconciliation Studio
├── /reports                            # Financial Statement Reports (P&L, Balance Sheet, VAT, WHT)
├── /security                           # Security Audit, CAMA Sec 405 Sign-off & NDPA DSAR
├── /guides/                            # Content Hub (Pillars & Supporting Cluster Articles)
│   ├── /nigerian-tax-accounting-2025   # Pillar Article
│   ├── /withholding-tax-rates-guide    # Cluster Supporting Article
│   └── /access-bank-reconciliation     # Cluster Supporting Article
├── /sitemap.xml                        # Dynamic XML Sitemap (web/src/app/sitemap.ts)
└── /robots.txt                         # Search Engine Crawler Directives (web/src/app/robots.ts)
```

---

## 2. Hub-and-Spoke Internal Linking Rules

1. **Upward Linking:** Every supporting article links back to its parent topical cluster pillar using descriptive anchor text (e.g. "learn more about our [Nigerian Tax Compliance Engine](/guides/nigerian-tax-accounting-2025)").
2. **Cross-Linking:** Sibling articles within the same cluster cross-link to each other (e.g., VAT guide links to WHT guide).
3. **High-Intent Conversion Anchors:** Every guide features high-contrast action CTAs driving to the core app (`/transactions/sales-invoice/new` or `/reconcile`).
4. **Breadcrumb Markup:** Standardized Schema.org `BreadcrumbList` on every sub-route to render rich breadcrumb snippets in Google search results.

---

## 3. Crawler Directives & Canonical Strategy

- **Canonical URL Enforcement:** Every route defines an explicit self-referencing canonical URL (`<link rel="canonical" href="https://nairabooks.ng/..." />`) to avoid duplicate content penalties from query parameters.
- **Index/Noindex Rules:**
  - `index, follow`: Homepage, marketing pages, public guides, documentation, pricing.
  - `noindex, nofollow`: Internal tenant workspaces, authenticated edit screens, session-bound API routes (`/api/*`).
