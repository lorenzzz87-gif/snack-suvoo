import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '在意 · 华人生活平台',
        short_name: '在意',
        description: '意大利华人招聘 & 二手信息平台',
        theme_color: '#C53A2E',
        background_color: '#FBFAF7',
        display: 'standalone',
        start_url: '/app',
        orientation: 'portrait',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
