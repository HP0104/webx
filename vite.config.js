import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    proxy: {
      '/api/upload-freeimage': {
        target: 'https://freeimage.host',
        changeOrigin: true,
        rewrite: () => '/api/1/upload'
      }
    }
  }
})
