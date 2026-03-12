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
        black: "#1A1A1A",
        orange: {
          DEFAULT: "#E8440A",
          hover: "#C93A09",
          light: "#FFF0EB",
          50: "#FFF0EB",
          500: "#E8440A",
          600: "#C93A09",
        },
        beige: {
          DEFAULT: "#F5F5F5",
          dark: "#EBEBEB",
        },
        success: "#16A34A",
        warning: "#D97706",
        danger: "#DC2626",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 0 0 1px rgba(0,0,0,0.04), 0 2px 12px rgba(0,0,0,0.06)",
        "card-hover": "0 0 0 1px rgba(0,0,0,0.07), 0 8px 24px rgba(0,0,0,0.10)",
        "orange": "0 4px 14px rgba(232,68,10,0.25)",
        "orange-hover": "0 6px 20px rgba(232,68,10,0.35)",
        "sm-up": "0 -1px 4px rgba(0,0,0,0.04)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
        "slide-down": "slideDown 0.25s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
