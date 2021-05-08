module.exports = {
  purge: ['./components/**/*.js', './pages/**/*.js'],
  plugins: [
    require('@tailwindcss/typography'),
  ],
  theme: {
    fontFamily: {
      sans: ['Montserrat', 'sans-serif'],
      serif: ['Raleway', 'serif'],
    },
  },
};
