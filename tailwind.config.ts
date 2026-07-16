import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#111315",
        "bg-raised": "#16181B",
        "bg-elevated": "#1B1E21",
        border: {
          DEFAULT: "#232629",
          subtle: "#1D2022",
        },
        text: {
          primary: "#F6F6F4",
          secondary: "#8C9198",
        },
        accent: {
          DEFAULT: "#C8FF3D",
          dim: "#A8D633",
        },
        success: "#3DDC84",
        warning: "#FFB547",
        danger: "#FF5D5D",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 1.8s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
