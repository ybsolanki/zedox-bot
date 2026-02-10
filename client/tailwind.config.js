/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#0f111a",
                primary: "#5865f2",
                accent: "#7289da",
                surface: "#1a1c2e",
                text: "#e4e5f1",
            },
        },
    },
    plugins: [],
}
