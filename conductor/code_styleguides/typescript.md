# TypeScript & Next.js Code Style Guide (`conductor/code_styleguides/typescript.md`)

- **Strictness:** TypeScript `strict: true`, no `any` in domain/API models, explicit discriminated unions for industry pack module definitions and tax components.
- **Formatting:** 2-space indentation, UTF-8, LF line endings (matching `.editorconfig`).
- **Money Representation:** Serialize monetary values over GraphQL/JSON as fixed-scale decimal strings or minor-unit integers (kobo) with explicit currency codes (`NGN`, `USD`, etc.)—never unformatted IEEE floats.
- **Accessibility & UX:** All interactive UI controls require accessible labels, keyboard navigation, and plain-English labels alongside IFRS references.
