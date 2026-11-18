/** @type {import('tailwindcss').Config} */

// UI Oilema Base: as cores vêm dos tokens em src/styles/tokens.css (claro e escuro).
// Os nomes semânticos (page, surface, ink, accent...) já trocam de valor com o tema,
// por isso os componentes não precisam de variantes dark: para cor.
const v = (name) => `var(--${name})`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        page: v('page'),
        surface: { DEFAULT: v('surface'), sunken: v('surface-sunken'), control: v('surface-control') },
        line: v('line'),
        ink: { DEFAULT: v('ink'), strong: v('ink-strong'), muted: v('ink-muted') },
        accent: { DEFAULT: v('accent'), text: v('accent-text'), on: v('on-accent') },
        success: v('success'),
        warning: v('warning'),
        danger: v('danger'),
        oilema: {
          petrol: v('oilema-petrol'),
          orange: v('oilema-orange'),
          flame: v('oilema-flame'),
          clay: v('oilema-clay'),
          peach: v('oilema-peach')
        },
        orange: {
          50: '#fef5ec', 100: '#fde8d3', 200: '#fbcfa6', 300: '#f8b072', 400: '#f5994a',
          500: '#f28322', 600: '#d2651b', 700: '#a84f14', 800: '#863f14', 900: '#6d3514', 950: '#3b1a08'
        },
        clay: {
          50: '#fbf3ee', 100: '#f6e2d5', 200: '#edc4ab', 300: '#e4a47d', 400: '#de9061',
          500: '#d97e4a', 600: '#bc6535', 700: '#97502c', 800: '#784027', 900: '#623622', 950: '#341a0f'
        },
        petrol: {
          50: '#f5f7f7', 100: '#ecf0f1', 200: '#dce3e5', 300: '#bcc9cd', 400: '#8da0a7',
          500: '#627880', 600: '#4a626b', 700: '#385059', 800: '#273b43', 900: '#1a2b31', 950: '#111e23'
        }
      },
      fontFamily: {
        sans: ['"Amsi Pro"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Amsi Pro Condensed"', '"Amsi Pro"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        sm: '4px', md: '8px', lg: '12px', xl: '16px', '2xl': '24px'
      },
      boxShadow: {
        card: v('shadow-card'),
        'card-hover': v('shadow-card-hover'),
        accent: v('shadow-accent'),
        modal: v('shadow-modal')
      },
      maxWidth: { content: '1280px' },
      height: { control: '36px', field: '42px' },
      minHeight: { control: '36px', field: '42px' },
      transitionTimingFunction: { out: 'cubic-bezier(.2,.8,.2,1)' }
    }
  },
  plugins: []
};
