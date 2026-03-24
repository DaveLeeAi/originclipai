import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#f6f5f2",
          surface: "#ffffff",
          hover: "#f0efec",
        },
        border: {
          DEFAULT: "#e4e2dd",
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
        display: [
          "Instrument Sans",
          "SF Pro Display",
          "-apple-system",
          "sans-serif",
        ],
        body: ["DM Sans", "SF Pro Text", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "monospace"],
      },
      fontSize: {
        "heading-xl": [
          "30px",
          { lineHeight: "1.2", letterSpacing: "-0.03em", fontWeight: "700" },
        ],
        "heading-lg": [
          "22px",
          { lineHeight: "1.25", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "heading-md": [
          "18px",
          { lineHeight: "1.3", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "heading-sm": [
          "15px",
          { lineHeight: "1.35", letterSpacing: "-0.01em", fontWeight: "700" },
        ],
        "body-lg": ["15px", { lineHeight: "1.5", fontWeight: "400" }],
        body: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-sm": ["13px", { lineHeight: "1.4", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "1.4", fontWeight: "400" }],
        label: [
          "11px",
          { lineHeight: "1.3", letterSpacing: "0.02em", fontWeight: "600" },
        ],
        overline: [
          "10px",
          { lineHeight: "1.3", letterSpacing: "0.12em", fontWeight: "700" },
        ],
        "mono-sm": [
          "11px",
          { lineHeight: "1.3", letterSpacing: "0.02em", fontWeight: "400" },
        ],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
        "2xl": "14px",
        "3xl": "16px",
      },
      boxShadow: {
        sm: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
        md: "0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
        lg: "0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
