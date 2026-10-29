/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "rgb(var(--ink) / <alpha-value>)",
          darker: "#0E1712",
          night: "#17241b",
          nightdark: "#0E1712",
          green: "#0afe6b",
          greendark: "rgb(var(--ink) / <alpha-value>)",
          yellow: "#FFF200",
          orange: "#E8863C",
          cream: "#f5fff2",
          soft: "#EFEDE0",
        },
        alert: {
          soft: "#E2857A",
        },
      },
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-archivo)", "var(--font-space-grotesk)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(22,35,26,0.06), 0 4px 16px rgba(22,35,26,0.06)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
