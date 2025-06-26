const config = {
  plugins: {
    '@tailwindcss/postcss': {
      content: [
        './app/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',
        './lib/**/*.{js,ts,jsx,tsx}'
      ]
    },
    autoprefixer: {}
  }
};
export default config;
