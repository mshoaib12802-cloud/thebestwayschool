/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB', // Brand Blue
          dark: '#1E40AF',
          light: '#60A5FA'
        },
        secondary: '#64748B', // Slate Grey (Text k liye)
        dark: '#0F172A',      // Dark Mode/Sidebar k liye
        danger: '#EF4444',    // Delete/Alerts k liye
        success: '#10B981'    // Fees Paid/Present k liye
      }
    },
  },
  plugins: [],
}