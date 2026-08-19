import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const isCapacitorBuild = process.env.CAPACITOR_BUILD === '1'

export default defineConfig({
  base: isCapacitorBuild ? './' : '/dachshund/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
