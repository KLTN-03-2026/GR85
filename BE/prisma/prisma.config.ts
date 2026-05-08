import { defineConfig } from '@prisma/internals'

export default defineConfig({
  seed: 'node prisma/seed.js',
})
