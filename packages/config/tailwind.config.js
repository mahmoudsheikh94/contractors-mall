/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        // Electric Teal - Smart tech, speed (PRIMARY)
        primary: {
          50: '#EDFEF9',
          100: '#D1FCF0',
          200: '#A7F9E4',
          300: '#6FF3D4',
          400: '#38E3C0',
          500: '#1DE9B6',  // Base color
          600: '#0FC193',
          700: '#0F9A78',
          800: '#127A60',
          900: '#136450',
          950: '#053A30',
        },
        // Lime Pulse - Progress, verification (SECONDARY)
        secondary: {
          50: '#F7FFE5',
          100: '#EDFFC7',
          200: '#DCFF96',
          300: '#C6FF00',  // Base color (moved to 300 for better contrast)
          400: '#B3E600',
          500: '#99CC00',
          600: '#7AA600',
          700: '#5C7F00',
          800: '#496514',
          900: '#3D5617',
          950: '#1F3008',
        },
        // Deep Navy - Reliability, foundation
        navy: {
          50: '#F2F6F9',
          100: '#E5ECF2',
          200: '#C6D6E3',
          300: '#9BB4CB',
          400: '#698CAD',
          500: '#4A6E93',
          600: '#39587A',
          700: '#2F4763',
          800: '#293E54',
          900: '#0D1B2A',  // Base color
          950: '#080F17',
        },
        // Charcoal - Balance
        charcoal: {
          50: '#F5F6F7',
          100: '#EAEBEC',
          200: '#D0D3D6',
          300: '#A9AFB4',
          400: '#79838C',
          500: '#5A6772',
          600: '#4C5560',
          700: '#414850',
          800: '#383E45',
          900: '#263238',  // Base color
          950: '#1A2024',
        },
        // Concrete Gray - Clarity
        concrete: {
          50: '#FAFBFB',
          100: '#F6F7F8',
          200: '#ECEFF1',  // Base color
          300: '#D9DFE3',
          400: '#B4BFC7',
          500: '#90A0AC',
          600: '#748593',
          700: '#5F6F7A',
          800: '#515D66',
          900: '#464E56',
          950: '#2D3339',
        },
        // Sand Beige - Arabic warmth, human touch
        sand: {
          50: '#FEFDFB',
          100: '#F5F0E6',  // Base color
          200: '#EBE2D0',
          300: '#DDD0B5',
          400: '#CAB790',
          500: '#B89F72',
          600: '#A68960',
          700: '#8A7050',
          800: '#725D45',
          900: '#5F4E3B',
          950: '#362A1F',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-arabic)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    // RTL support plugin
    function ({ addUtilities }) {
      addUtilities({
        '.rtl': {
          direction: 'rtl',
        },
        '.ltr': {
          direction: 'ltr',
        },
        '.text-start': {
          textAlign: 'start',
        },
        '.text-end': {
          textAlign: 'end',
        },
      })
    },
  ],
}