import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#4040E8",
          dark: "#111827",
          purple: "#6B4EFF",
          orange: "#FF4D00",
        },
        sidebar: {
          bg: "#111827",
          text: "#8B94A3",
          active: "#4040E8",
        },
        zenith: {
          primary: '#4040E8',
          dark: '#111827',
          gray: '#8B94A3',
          light: '#E5E7EB',
          bg: '#F9F9FA',
          // Admin clean-dark theme (zinc + indigo)
          'admin-bg':      '#09090b',
          'admin-surface': '#111113',
          'admin-card':    '#18181b',
          'admin-card2':   '#1c1c1f',
          'admin-border':  '#27272a',
          'admin-accent':  '#6366f1',
          'admin-text':    '#fafafa',
          'admin-muted':   '#a1a1aa',
          'admin-subtle':  '#71717a',
        },
        portal: {
          bg: '#0a0a0a',
          card: '#111111',
          border: '#1e1e1e',
          'border-light': '#2a2a2a',
          accent: '#4040E8',
          gold: '#D4A017',
          green: '#22C55E',
          'text-primary': '#ffffff',
          'text-secondary': '#a1a1aa',
          'text-muted': '#71717a',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.08)',
          lighter: 'rgba(255, 255, 255, 0.05)',
          'light-hover': 'rgba(255, 255, 255, 0.12)',
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        glass: "20px",
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 3s ease-in-out infinite",
        "slide-up": "slide-up 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        "fade-in": "fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "scale-in": "scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
