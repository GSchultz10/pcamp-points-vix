/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta oficial PCamp
        pcamp: {
          pink: "#DF0C78",
          "pink-soft": "#F23A98",
          "pink-glow": "rgba(223, 12, 120, 0.35)",
          purple: "#2B1E39",
          "purple-deep": "#1A1226",
          "purple-light": "#3A2A4D",
          white: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
