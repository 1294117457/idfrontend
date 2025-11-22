module.exports = {
  darkMode: 'class', // 启用 class 模式
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'dark-blue': '#102252', // 添加深蓝色
      },
    },
  },
  plugins: [],
}