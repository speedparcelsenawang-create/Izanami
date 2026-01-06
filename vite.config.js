import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      external: ['chart.js/auto', 'quill'], // Mark chart.js and quill as external
      output: {
        manualChunks: {
          'primereact': ['primereact'],
          'leaflet': ['leaflet', 'react-leaflet'],
          'lightgallery': ['lightgallery', 'lg-thumbnail', 'lg-zoom'],
        }
      }
    }
  },
})
