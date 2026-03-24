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
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
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
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
