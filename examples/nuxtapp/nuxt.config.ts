// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: [
    '@nuxt/ui',
    '@nuxt/icon',
    '@nuxt/eslint',
    '@nuxt/scripts',
    '@vueuse/nuxt',
    '@nuxt/image',
    '@nuxt/test-utils'
  ],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY
  },
  nitro: {
    routeRules: {
      // Needed for the sharedArrayBuffer in vosklet wasm communication
      '/**': { headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' } }
    }
  },
  ssr: false,
  // devServer: {
  //   cors: {
  //     origin: '*'
  //   }
  // }
})