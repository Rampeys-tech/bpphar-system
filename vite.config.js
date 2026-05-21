import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Standard Vite config without strict CSS compiler overhead
export default defineConfig({
  plugins: [react()],
})