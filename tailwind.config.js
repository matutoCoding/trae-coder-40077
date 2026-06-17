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
        base: {
          DEFAULT: "#E8E6E1",
          dark: "#E8E6E1",
        },
        surface: {
          DEFAULT: "#1A1D23",
          light: "#22262E",
          lighter: "#2A2F38",
          border: "#333842",
        },
        amber: {
          DEFAULT: "#E8A317",
          light: "#F5C04A",
          dark: "#C48B0E",
          muted: "rgba(232, 163, 23, 0.15)",
        },
        steel: {
          DEFAULT: "#5B8DEF",
          light: "#7DA8F5",
          muted: "rgba(91, 141, 239, 0.15)",
        },
        pass: {
          DEFAULT: "#34D399",
          muted: "rgba(52, 211, 153, 0.15)",
        },
        fail: {
          DEFAULT: "#EF4444",
          muted: "rgba(239, 68, 68, 0.15)",
        },
        warn: {
          DEFAULT: "#F59E0B",
          muted: "rgba(245, 158, 11, 0.15)",
        },
      },
      fontFamily: {
        display: ["DM Sans", "Noto Sans SC", "sans-serif"],
        body: ["Noto Sans SC", "DM Sans", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
    },
  },
  plugins: [],
};
