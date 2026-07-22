/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#16231A",
          darker: "#0E1712",
          green: "#6CB64D",
          greendark: "#57993C",
          yellow: "#FFF200",
          cream: "#FFFDF4",
          soft: "#EFEDE0",
        },
        alert: {
          soft: "#E2857A",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
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
