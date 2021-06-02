/* eslint-disable global-require */
/* eslint-disable import/no-extraneous-dependencies */

const colors = require('tailwindcss/colors');

module.exports = {
  purge: ['./components/**/*.js', './pages/**/*.js'],
  plugins: [
    require('@tailwindcss/typography'),
  ],
  theme: {
    boxShadow: {
      custom: '0px 8px 16px 0px rgb(0 0 0 / 3%)',
      'custom-hover': '0px 8px 16px 0px rgb(0 0 0 / 6%)',
    },
    extend: {
      colors: {
        purple: {
          1000: '#1c1648',
        },
      },
      typography: theme => ({
        DEFAULT: {
          css: {
            code: {
              backgroundColor: theme('colors.gray.100'),
              padding: '0.3rem',
            },
            'code:after': {
              content: '""',
            },
            'code:before': {
              content: '""',
            },
          },
        },
      }),
    },
    fontFamily: {
      sans: ['Montserrat', 'sans-serif'],
      serif: ['Montserrat', 'serif'],
    },
  },
};
