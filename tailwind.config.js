/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                background: '#ffffff',
                panel: '#ffffff',
                border: '#e0e3eb',
                'text-primary': '#131722',
                'text-secondary': '#787f86',
                up: '#089981',
                down: '#f23645',
                hover: '#f0f3fa',
            },
            fontFamily: {
                sans: ['-apple-system', 'BlinkMacSystemFont', 'Trebuchet MS', 'Roboto', 'Ubuntu', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
