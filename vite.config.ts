import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Las librerías cambian de versión pocas veces; el código de la app, en cada despliegue.
        // Separarlas deja los chunks grandes en la caché del navegador entre despliegues.
        // Se agrupa por ruta del módulo y no por nombre de paquete, porque los imports reales
        // son subpaths (`react-dom/client`, `react/jsx-runtime`) que la forma de objeto no capta.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-router')) return 'router'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('lucide-react')) return 'icons'
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react-vendor'
        },
      },
    },
  },
})
