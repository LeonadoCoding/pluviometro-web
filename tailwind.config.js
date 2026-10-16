/** @type {import('tailwindcss').Config} */

// Identidade visual Oilema (Oilema_Theme.json):
// #385059 (petróleo) • #F28322 (laranja) • #F26E22 (laranja chama) • #D97E4A (argila)
// #F2F2F2 / #FCFCFC / #FDFDFB / #FBFBFB (neutros claros)
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        oilema: {
          petrol: '#385059',
          orange: '#F28322',
          flame: '#F26E22',
          clay: '#D97E4A',
          mist: '#F2F2F2',
          snow: '#FCFCFC',
        },
        // Cor primária (mantém o nome "rain" usado nos componentes) → Laranja Oilema
        rain: {
          50: '#FEF5EC',
          100: '#FDE8D3',
          200: '#FBCFA6',
          300: '#F8B072',
          400: '#F5994A',
          500: '#F28322',
          600: '#D2651B',
          700: '#A84F14',
          800: '#863F14',
          900: '#6D3514',
          950: '#3B1A08',
        },
        // Cor secundária (mantém o nome "sky") → Argila Oilema
        sky: {
          50: '#FBF3EE',
          100: '#F6E2D5',
          200: '#EDC4AB',
          300: '#E4A47D',
          400: '#DE9061',
          500: '#D97E4A',
          600: '#BC6535',
          700: '#97502C',
          800: '#784027',
          900: '#623622',
          950: '#341A0F',
        },
        // Neutros com o tom petróleo da marca (700 = #385059)
        slate: {
          50: '#F5F7F7',
          100: '#ECF0F1',
          200: '#DCE3E5',
          300: '#BCC9CD',
          400: '#8DA0A7',
          500: '#627880',
          600: '#4A626B',
          700: '#385059',
          800: '#273B43',
          900: '#1A2B31',
          950: '#111E23',
        },
        agro: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
        }
      }
    },
  },
  plugins: [],
}
