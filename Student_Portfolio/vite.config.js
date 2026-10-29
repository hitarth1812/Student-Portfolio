import process from 'node:process'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
// A Vercel build without VITE_API_URL would silently point the live site at
// localhost:5000, so stop the deployment instead.
if (process.env.VERCEL && !process.env.VITE_API_URL) {
  throw new Error('VITE_API_URL is not set. Add your Railway backend URL in Vercel > Project Settings > Environment Variables.')
}

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
