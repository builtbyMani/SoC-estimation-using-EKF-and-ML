/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#06090d",
        surface: "#0b1118",
        raised: "#101722",
        border: "#1d2733",
        accent: "#a3e635",
        warning: "#fbbf24",
        danger: "#fb7185",
        muted: "#8b98a9",
        ink: "#e9eff5",
        dim: "#93a1b3",
        faint: "#5d6b7e",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 0 0 rgba(163, 230, 53, 0.45)",
          },
          "50%": {
            opacity: "0.75",
            boxShadow: "0 0 0 6px rgba(163, 230, 53, 0)",
          },
        },
        "eq": {
          "0%, 100%": { transform: "scaleY(0.4)" },
          "50%": { transform: "scaleY(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-dot": "pulse-dot 2.2s ease-in-out infinite",
        "eq": "eq 1.1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
