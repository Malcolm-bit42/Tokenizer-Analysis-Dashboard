import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Listen on all network interfaces
    port: 5173,
    watch: {
      usePolling: true, // Needed for hot-reloading inside Docker volumes
    },
  },
})
