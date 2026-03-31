/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        background: "#FFFFFF",
        foreground: "#0A0A0A",
        surface: "#F7F7F7",
        card: "#FFFFFF",

        neutral: {
          50:  "#F7F7F7",
          100: "#EFEFEF",
          200: "#E3E3E3",
          300: "#D0D0D0",
          400: "#ABABAB",
          500: "#767676",
          600: "#595959",
          700: "#3D3D3D",
          800: "#282828",
          900: "#181818",
          950: "#0F0F0F",
        },

        primary: {
          DEFAULT: "#0A0A0A",
          foreground: "#FFFFFF",
          50: "#F5F5FF",
          100: "#EBEBFE",
          500: "#6366F1",
          600: "#4F52DC",
        },

        accent: {
          DEFAULT: "#6366F1",
          foreground: "#FFFFFF",
          50: "#F5F5FF",
          100: "#EBEBFE",
        },

        muted: {
          DEFAULT: "#F7F7F7",
          foreground: "#767676",
        },
        border: "#EFEFEF",
        input: "#EFEFEF",
        ring: "#6366F1",

        success: { 50: "#F0FDF4", 200: "#BBF7D0", 700: "#15803D", 800: "#166534" },
        warning: { 50: "#FFFBEB", 200: "#FDE68A", 700: "#B45309", 800: "#92400E" },
        error:   { 50: "#FFF1F2", 200: "#FECDD3", 700: "#BE123C", 800: "#9F1239" },
        info:    { 50: "#EFF6FF", 200: "#BFDBFE", 700: "#1D4ED8", 800: "#1E40AF" },

        secondary: {
          DEFAULT: "#F7F7F7",
          foreground: "#0A0A0A",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#0A0A0A",
        },
        destructive: {
          DEFAULT: "#BE123C",
          foreground: "#FFFFFF",
        },
      },
      borderRadius: {
        sm:   "4px",
        DEFAULT: "8px",
        md:   "8px",
        lg:   "12px",
        xl:   "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
      boxShadow: {
        sm:  "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        DEFAULT: "0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
        md:  "0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)",
        lg:  "0 8px 30px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04)",
        xl:  "0 16px 48px rgba(0,0,0,0.10), 0 8px 16px rgba(0,0,0,0.06)",
      },
      fontFamily: {
        sans: ["NeueHaas", "system-ui", "sans-serif"],
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up":   { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "pulse-slow": { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.5" } },
        "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "pulse-slow":     "pulse-slow 3s ease-in-out infinite",
        "fade-in":        "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [],
}
