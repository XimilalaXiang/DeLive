import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  // Electron 打包时使用相对路径
  base: './',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:23456',
        changeOrigin: true,
      },
    },
  },
  build: {
    // 确保资源路径正确
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        caption: resolve(__dirname, 'caption.html'),
      },
      output: {
        manualChunks: undefined,
      },
    },
  },
})
