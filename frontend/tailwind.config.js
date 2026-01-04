/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'healink-bg': '#f5f8ff',
        'healink-navy': '#232c62',
        'healink-purple-start': '#7d51de',
        'healink-purple-end': '#9153df',
        'healink-gray': '#aeb2b7',
      }
    },
  },
  plugins: [],
};
