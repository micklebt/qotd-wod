import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        'muted-bg': "var(--muted-bg)",
        'muted-text': "var(--muted-text)",
        'card-bg': "var(--card-bg)",
        'card-border': "var(--card-border)",
        'hover-bg': "var(--hover-bg)",
        'input-bg': "var(--input-bg)",
        'input-border': "var(--input-border)",
        'input-text': "var(--input-text)",
        'input-placeholder': "var(--input-placeholder)",
        'input-focus-border': "var(--input-focus-border)",
        'input-focus-ring': "var(--input-focus-ring)",
        'accent-blue': "var(--accent-blue)",
        'accent-green': "var(--accent-green)",
        'accent-red': "var(--accent-red)",
        'accent-yellow': "var(--accent-yellow)",
      },
    },
  },
  plugins: [],
};
export default config;

