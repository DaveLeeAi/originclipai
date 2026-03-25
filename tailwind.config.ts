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
      /* ===== shadcn/ui tokens (HSL-based) ===== */
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        ring: "hsl(var(--ring))",
        input: "hsl(var(--input))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },

        /* ===== Design System v2 tokens ===== */
        "ds-bg": {
          base: "var(--bg-base)",
          "surface-1": "var(--bg-surface-1)",
          "surface-2": "var(--bg-surface-2)",
          "surface-3": "var(--bg-surface-3)",
        },
        "ds-text": {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
        },
        "ds-border": {
          DEFAULT: "var(--border-default)",
          hover: "var(--border-hover)",
          strong: "var(--border-strong)",
        },
        "ds-accent": {
          DEFAULT: "var(--accent-primary)",
          hover: "var(--accent-hover)",
          subtle: "var(--accent-subtle)",
        },
        "ds-success": {
          DEFAULT: "var(--success)",
          subtle: "var(--success-subtle)",
        },
        "ds-error": {
          DEFAULT: "var(--error)",
          subtle: "var(--error-subtle)",
        },
        "ds-warning": {
          DEFAULT: "var(--warning)",
          subtle: "var(--warning-subtle)",
        },
        "ds-info": {
          DEFAULT: "var(--info)",
          subtle: "var(--info-subtle)",
        },
        "ds-pending": {
          DEFAULT: "var(--pending)",
          subtle: "var(--pending-subtle)",
        },

        /* ===== Legacy v1 colors (for backward compat) ===== */
        bg: {
          base: "#f6f5f2",
          surface: "#ffffff",
          hover: "#f0efec",
        },
        border: {
          DEFAULT: "hsl(var(--border))",
          active: "#5046e5",
          subtle: "#eeedea",
        },
        text: {
          primary: "#1a1a1a",
          secondary: "#6b6960",
          tertiary: "#a09e96",
        },
        accent: {
          DEFAULT: "#5046e5",
          hover: "#4338ca",
          text: "#4338ca",
          soft: "rgba(80,70,229,0.06)",
          border: "rgba(80,70,229,0.18)",
        },
        status: {
          green: "#16a34a",
          "green-soft": "rgba(22,163,74,0.08)",
          "green-border": "rgba(22,163,74,0.2)",
          amber: "#d97706",
          "amber-soft": "rgba(217,119,6,0.08)",
          "amber-border": "rgba(217,119,6,0.2)",
          red: "#dc2626",
          "red-soft": "rgba(220,38,38,0.06)",
          "red-border": "rgba(220,38,38,0.2)",
          cyan: "#0891b2",
          "cyan-soft": "rgba(8,145,178,0.07)",
          "cyan-border": "rgba(8,145,178,0.2)",
        },
      },

      fontFamily: {
        sans: ["Inter", "var(--font-sans)", "system-ui", "sans-serif"],
        body: ["DM Sans", "var(--font-body)", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "var(--font-mono)", "monospace"],
        display: ["Instrument Sans", "SF Pro Display", "-apple-system", "sans-serif"],
      },

      fontSize: {
        /* v2 typography scale */
        "page-title": ["24px", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "600" }],
        "section-heading": ["20px", { lineHeight: "1.3", letterSpacing: "-0.005em", fontWeight: "600" }],
        "card-title": ["16px", { lineHeight: "1.4", fontWeight: "600" }],
        "body-base": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-secondary": ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        "label-ui": ["13px", { lineHeight: "1.4", letterSpacing: "0", fontWeight: "500" }],
        "badge-caps": ["12px", { lineHeight: "1.35", letterSpacing: "0.01em", fontWeight: "500" }],
        "btn": ["14px", { lineHeight: "1.0", fontWeight: "500" }],
        "mono-data": ["13px", { lineHeight: "1.4", fontWeight: "400" }],

        /* v1 legacy typography (keep for backward compat) */
        "heading-xl": ["30px", { lineHeight: "1.2", letterSpacing: "-0.03em", fontWeight: "700" }],
        "heading-lg": ["22px", { lineHeight: "1.25", letterSpacing: "-0.02em", fontWeight: "700" }],
        "heading-md": ["18px", { lineHeight: "1.3", letterSpacing: "-0.02em", fontWeight: "700" }],
        "heading-sm": ["15px", { lineHeight: "1.35", letterSpacing: "-0.01em", fontWeight: "700" }],
        "body-lg": ["15px", { lineHeight: "1.5", fontWeight: "400" }],
        body: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-sm": ["13px", { lineHeight: "1.4", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "1.4", fontWeight: "400" }],
        label: ["11px", { lineHeight: "1.3", letterSpacing: "0.02em", fontWeight: "600" }],
        overline: ["10px", { lineHeight: "1.3", letterSpacing: "0.12em", fontWeight: "700" }],
        "mono-sm": ["11px", { lineHeight: "1.3", letterSpacing: "0.02em", fontWeight: "400" }],
      },

      borderRadius: {
        sm: "var(--radius-sm, 4px)",
        md: "var(--radius-md, 6px)",
        lg: "var(--radius-lg, 8px)",
        xl: "var(--radius-xl, 12px)",
        "2xl": "var(--radius-2xl, 16px)",
        "3xl": "16px",
      },

      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },

      spacing: {
        "space-1": "var(--space-1)",
        "space-2": "var(--space-2)",
        "space-3": "var(--space-3)",
        "space-4": "var(--space-4)",
        "space-5": "var(--space-5)",
        "space-6": "var(--space-6)",
        "space-8": "var(--space-8)",
        "space-12": "var(--space-12)",
        "space-16": "var(--space-16)",
      },

      transitionDuration: {
        instant: "var(--duration-instant)",
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
        slow: "var(--duration-slow)",
      },

      transitionTimingFunction: {
        default: "var(--ease-default)",
        out: "var(--ease-out)",
        spring: "var(--ease-spring)",
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
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
