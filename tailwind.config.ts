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
        card: "0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.06)",
        "card-hover": "0 0 0 1px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.1)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
