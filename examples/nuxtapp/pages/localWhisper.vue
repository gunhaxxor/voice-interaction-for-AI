<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { localWhisperRecognitionService } from 'speech-utils/recognitionService/localWhisperRecognitionService.js'
// import { localWhisperRecognitionService } from 'speech-utils/recognitionService/localWhisperRecognitionService.js'

const transcribedText = ref('Ingen text ännu...')
const whisper = new localWhisperRecognitionService({ lang: 'sv' })



onMounted(() => {
  whisper.onTextReceived((text: string) => {
    transcribedText.value = text || 'Ingen text kunde höras...!'
  })

  whisper.onError((err) => {
    console.error('Fel vid transkribering:', err)
    transcribedText.value = 'Fel uppstod vid transkribering!'
  })
})

function start() {
  whisper.startListenAudio()
}
</script>

<template>
  <div class="flex flex-col items-center justify-center h-screen bg-gray-50 space-y-6">
    <button
      @click="start"
      class="px-6 py-3 text-white text-lg font-semibold bg-blue-600 rounded-xl shadow hover:bg-blue-700 transition"
    >
      Starta lyssning
    </button>

    <div class="w-full max-w-xl p-4 bg-white rounded shadow text-center text-gray-800 text-lg">
      {{ transcribedText }}
    </div>
  </div>
</template>
