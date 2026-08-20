/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b0f14",
        surface: "#121821",
        border: "#232b36",
        accent: "#3ddc97",
        warning: "#f5b942",
        danger: "#f0546a",
        muted: "#8895a7",
      },
    },
  },
  plugins: [],
};
