import type { Config } from 'tailwindcss';

/**
 * NairaBooks Tailwind CSS Design System Configuration (Phase 5).
 * Synced with design/tokens/nairabooks.tokens.json and Stitch Design System
 * assets/8475106491343804798 ("NairaBooks Ledger Daylight AA").
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx,js,jsx,mdx}',
    './design/stitch/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--nb-background) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--nb-surface) / <alpha-value>)',
          muted: 'rgb(var(--nb-surface-muted) / <alpha-value>)',
        },
        foreground: {
          DEFAULT: 'rgb(var(--nb-foreground) / <alpha-value>)',
          muted: 'rgb(var(--nb-foreground-muted) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--nb-primary) / <alpha-value>)',
          hover: 'rgb(var(--nb-primary-hover) / <alpha-value>)',
          foreground: 'rgb(var(--nb-primary-foreground) / <alpha-value>)',
          soft: 'rgb(var(--nb-primary-soft-bg) / <alpha-value>)',
          'soft-foreground': 'rgb(var(--nb-primary-soft-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--nb-secondary) / <alpha-value>)',
          foreground: 'rgb(var(--nb-secondary-foreground) / <alpha-value>)',
          soft: 'rgb(var(--nb-secondary-soft-bg) / <alpha-value>)',
          'soft-foreground': 'rgb(var(--nb-secondary-soft-foreground) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--nb-warning) / <alpha-value>)',
          foreground: 'rgb(var(--nb-warning-foreground) / <alpha-value>)',
          soft: 'rgb(var(--nb-warning-soft-bg) / <alpha-value>)',
          'soft-foreground': 'rgb(var(--nb-warning-soft-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(var(--nb-destructive) / <alpha-value>)',
          foreground: 'rgb(var(--nb-destructive-foreground) / <alpha-value>)',
          soft: 'rgb(var(--nb-destructive-soft-bg) / <alpha-value>)',
          'soft-foreground': 'rgb(var(--nb-destructive-soft-foreground) / <alpha-value>)',
        },
        border: {
          subtle: 'rgb(var(--nb-border-subtle) / <alpha-value>)',
          interactive: 'rgb(var(--nb-border-interactive) / <alpha-value>)',
        },
        ring: 'rgb(var(--nb-focus-ring) / <alpha-value>)',
      },
      fontFamily: {
        heading: ['var(--nb-font-heading)', 'Plus Jakarta Sans', 'Inter', 'sans-serif'],
        sans: ['var(--nb-font-body)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--nb-font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
      spacing: {
        'sticky-clearance': '7rem',
      },
    },
  },
  plugins: [],
};

export default config;
