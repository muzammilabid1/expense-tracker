import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B0F14',
        sidebar: '#101820',
        panel: '#151F29',
        raised: '#1C2935',
        mint: '#75F0C0',
        cyan: '#63D8E8',
        lime: '#D7F171',
        muted: '#9BAAB7',
        line: '#293844',
        danger: '#FF7C86',
        warning: '#F3C969',
      },
    },
  },
  plugins: [],
};

export default config;
