import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The official primitives entry ships CSS imports. Let Vite process them
    // while the compatibility test uses the actual published components.
    server: { deps: { inline: ['@deepseek-ai/dsh-client-ui-primitives'] } },
  },
})
