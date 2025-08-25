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
    '@nuxt/test-utils',
    '@formkit/auto-animate/nuxt',
  ],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    openaiApiKey: '',
    public: {
      godzillaUrl: '',
      speachesPort: 8000,
      speachesApiKey: '',
    }
  },
  // nitro: {
  //   routeRules: {
  //     // Needed for the sharedArrayBuffer in vosklet wasm communication
  //     // This will break nuxt devtools
  //     '/**': { headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' } }
  //   }
  // },
  ssr: false,
  // devServer: {
  //   cors: {
  //     origin: '*'
  //   }
  // }
})