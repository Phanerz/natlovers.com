import type {Config} from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: "#f2f5f1",
          100: "#dde5dc",
          200: "#bdccba",
          300: "#94aa90",
          400: "#6c8667",
          500: "#4f684a",
          600: "#3f533c",
          700: "#344332",
          800: "#2b3729",
          900: "#172015"
        },
        sand: {
          50: "#fbf8f1",
          100: "#f4ecd9",
          200: "#e8d9b7",
          300: "#d7c08a",
          400: "#c7a764",
          500: "#b7924b",
          600: "#9b7b3d",
          700: "#7c6234",
          800: "#654f2f",
          900: "#554229"
        }
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        body: ["'Trebuchet MS'", "sans-serif"]
      },
      boxShadow: {
        card: "0 24px 60px rgba(28, 46, 30, 0.12)"
      },
      backgroundImage: {
        paper:
          "radial-gradient(circle at top left, rgba(244,236,217,0.9), transparent 38%), linear-gradient(135deg, rgba(242,245,241,0.92), rgba(251,248,241,0.96))"
      }
    }
  },
  plugins: []
};

export default config;
