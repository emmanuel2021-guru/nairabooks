# NairaBooks Meta Tag & Structured Data Optimization Guide (`docs/seo/META_OPTIMIZATION_GUIDE.md`)

> **Best Practices for Next.js App Router Metadata, OpenGraph Tags & Schema.org JSON-LD**  
> *Standard: Next.js 15 App Router, Google Search Central Core Web Vitals Guidelines*

---

## 1. Metadata Generation Standards

All Next.js routes consume the centralized generator [`web/src/lib/seo-meta.ts`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/lib/seo-meta.ts).

### Core Specification Rules
1. **Title Tags:**
   - **Length:** 50–60 characters (max 580px visual rendered width).
   - **Pattern:** `[Page Keyword / Action] — [Compelling Value Prop] | NairaBooks`
   - **Avoid:** Generic "Home" or "Dashboard" labels without context.
2. **Meta Descriptions:**
   - **Length:** 140–155 characters.
   - **Intent:** Directly answer searcher queries and end with an actionable CTA ("Start free trial", "Calculate now", "Download guide").
3. **Canonical URLs:**
   - Always fully-qualified absolute URLs (`https://nairabooks.ng/...`).
   - Clean of marketing UTM tags (`?utm_source=...`) and sorting params.
4. **OpenGraph & Twitter Cards:**
   - Explicit `locale: "en_NG"`.
   - 1200x630 aspect ratio card images (`/images/nairabooks-og-card.png`).

---

## 2. Schema.org Structured Data (JSON-LD)

To qualify for Google Rich Snippets, Knowledge Panels, and FAQ accordions:
- **`SoftwareApplication`:** Staged on homepage to render price and category badges.
- **`FAQPage`:** Injected on tax guides and help centers to expand search results in Google mobile SERPs.
- **`BreadcrumbList`:** Structured navigation hierarchy for sub-routes.

### Security Sanitization Invariant
To prevent Cross-Site Scripting (XSS), any dynamically injected JSON-LD script tag in Next.js must be sanitized to escape raw `<` brackets:
```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(schema).replace(/</g, "\\u003c"), /* safe-json-ld */
  }}
/>
```
This ensures zero vulnerability in our automated SAST scanner!
