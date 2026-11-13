# Design System v5: NairaBooks Cupertino iOS + Nigerian Emerald

## 1. iOS System Typography & Materials
- **Typography:** Apple native SF Pro stack (`-apple-system`, `BlinkMacSystemFont`, `"SF Pro Display"`, `"SF Pro Text"`) paired with [`Inter`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/app/layout.tsx) web fallback for cross-platform optical parity; financial figures strictly use `"SF Mono"` / `Geist_Mono` with `tabular-nums` (`.nb-money-cell`).
- **System Grouped Surfaces:** `#F2F2F7` grouped canvas, `#FFFFFF` elevated grouped cards (`rounded-[22px]`, hairline `#E5E5EA` borders), and `.nb-ios-glass` (`backdrop-filter: saturate(180%) blur(22px)`) translucent top header.
- **Ink & Accents:** Deep Cupertino Charcoal `#1C1C1E` (never pure `#000000`), `#5E5E64` secondary labels (`> 6:1` WCAG AA), Nigerian Emerald `#006838`, and soft Sapphire `#0F4C81` / Amber `#784507` status tints.

## 2. iOS Squircle Icons & Customized `shadcn/ui` Controls
- [`button.tsx`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/components/ui/button.tsx): Tactile Apple pill CTAs (`rounded-full`, `min-h-[44px]`, `active:scale-[0.96]`).
- [`card.tsx`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/components/ui/card.tsx), [`tabs.tsx`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/components/ui/tabs.tsx) (`UISegmentedControl`), [`switch.tsx`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/components/ui/switch.tsx), [`badge.tsx`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/components/ui/badge.tsx), [`accordion.tsx`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/components/ui/accordion.tsx).
- App-icon squircle badges (`rounded-[10px]` / `rounded-[12px]`) across [`ProductPreviewWindow.tsx`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/components/landing/ProductPreviewWindow.tsx) and [`CashflowStorySection.tsx`](file:///c:/Users/Czernoxx/Documents/emmanuel/ac/web/src/components/landing/CashflowStorySection.tsx).

## 3. Living `framer-motion` Choreography (`<MotionConfig reducedMotion="user">`)
- Frosted header scroll progress hairline (`useScroll` + `useSpring`)
- Hero scroll parallax (`watermarkX`, `portraitY`), cycling live POS/Bank iOS notification pill, rotating orbital dashed gauge on the circular `Get started free (+)` orb, and live-drawing emerald SVG wave sparkline + bobbing `+₦420,000` capsule
- Spring 3D pointer tilt (`±4.5deg`/`±5.0deg`) on the interactive preview window with floating depth card, shared `layoutId` segmented controls, staggered spring list rows, interactive 3-card Apple Wallet spring fan, Dynamic Island live waveform + rotating alerts, dual gyroscope SVG CTA rings, traveling cashflow comet, continuous `LiveRailsStrip` ticker, and animated spring quarterly profit bars (guarded by `<MotionConfig reducedMotion="user">` and CSS `@media (prefers-reduced-motion: reduce)`)
