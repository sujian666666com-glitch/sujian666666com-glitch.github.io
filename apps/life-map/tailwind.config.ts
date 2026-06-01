import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ember: "#f59e0b",
        ink: "#070a12",
        rune: "#22d3ee"
      },
      boxShadow: {
        glow: "0 0 42px rgba(245, 158, 11, 0.28)",
        panel: "0 24px 80px rgba(0, 0, 0, 0.38)"
      }
    }
  },
  plugins: []
};

export default config;
