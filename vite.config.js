import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    //VitePWA({//
      registerType: 'autoUpdate',
      manifest: {
        name: '小学生每日打卡任务表',
        short_name: '打卡任务',
        start_url: '.',
        display: 'standalone',
        background_color: '#fdf6fb',
        theme_color: '#ff9090',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
