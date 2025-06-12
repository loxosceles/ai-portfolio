const config = {
  plugins: {
    "@tailwindcss/postcss": {
      content: [
        "./app/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
      ],
      theme: {
        extend: {
          colors: {
             '--color-brand-primary': '#1e40af' 
          }
        }
      }
    },
  },
};
export default config;