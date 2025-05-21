import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    globalSetup: [
      './test/global-setup.ts',
    ],
    watch: false,

  },
})