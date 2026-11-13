import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
  	extend: {
  		colors: {
  			canvas: 'rgb(var(--nb-background) / <alpha-value>)',
  			surface: 'rgb(var(--nb-surface) / <alpha-value>)',
  			surfaceAlt: 'rgb(var(--nb-surface-muted) / <alpha-value>)',
  			ink: 'rgb(var(--nb-ink) / <alpha-value>)',
  			mutedInk: 'rgb(var(--nb-ink-muted) / <alpha-value>)',
  			borderSubtle: 'rgb(var(--nb-border) / <alpha-value>)',
  			borderInteractive: 'rgb(var(--nb-border-interactive) / <alpha-value>)',
  			primaryHover: 'rgb(var(--nb-primary-hover) / <alpha-value>)',
  			primarySoft: 'rgb(var(--nb-primary-soft-bg) / <alpha-value>)',
  			primarySoftInk: 'rgb(var(--nb-primary-soft-foreground) / <alpha-value>)',
  			secondarySoft: 'rgb(var(--nb-secondary-soft-bg) / <alpha-value>)',
  			secondarySoftInk: 'rgb(var(--nb-secondary-soft-foreground) / <alpha-value>)',
  			warning: 'rgb(var(--nb-warning) / <alpha-value>)',
  			warningSoft: 'rgb(var(--nb-warning-soft-bg) / <alpha-value>)',
  			warningSoftInk: 'rgb(var(--nb-warning-soft-foreground) / <alpha-value>)',
  			destructiveSoft: 'rgb(var(--nb-destructive-soft-bg) / <alpha-value>)',
  			destructiveSoftInk: 'rgb(var(--nb-destructive-soft-foreground) / <alpha-value>)',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'rgb(var(--nb-primary) / <alpha-value>)',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'rgb(var(--nb-secondary) / <alpha-value>)',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'rgb(var(--nb-destructive) / <alpha-value>)',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		fontFamily: {
  			heading: [
  				'NairaGlyphFallback',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'"SF Pro Display"',
  				'"SF Pro Text"',
  				'var(--font-ios-sans)',
  				'system-ui',
  				'Roboto',
  				'"Samsung Sans"',
  				'sans-serif'
  			],
  			sans: [
  				'NairaGlyphFallback',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'"SF Pro Text"',
  				'"SF Pro Display"',
  				'var(--font-ios-sans)',
  				'system-ui',
  				'Roboto',
  				'"Samsung Sans"',
  				'sans-serif'
  			],
  			mono: [
  				'NairaGlyphFallback',
  				'"SF Mono"',
  				'ui-monospace',
  				'SFMono-Regular',
  				'var(--font-ios-mono)',
  				'Roboto',
  				'"Samsung Sans"',
  				'monospace'
  			]
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.22s ease-out',
  			'accordion-up': 'accordion-up 0.22s ease-out'
  		}
  	}
  },
  plugins: [tailwindcssAnimate],
};

export default config;
