import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: mode === 'portfolio'
        ? { portfolio: 'hero-preview.html' }
        : { main: 'index.html', heroPreview: 'hero-preview.html', ...(mode === 'studio' ? { contentEditor: 'content-editor.html' } : {}) },
    },
  },
}))
