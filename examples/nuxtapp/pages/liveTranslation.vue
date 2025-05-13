<template>


  <UButton @click="recognition.startListenAudio()">Start listening</UButton>
  <div class="flex flex-col">
    <h2 v-for="text in allText">{{ text }}</h2>
  </div>
</template>
<script setup lang="ts">

import { WhisperTranslationService } from 'speech-utils/translationService/whisperTranslationService.js';

const recognition = new WhisperTranslationService({
  url: 'http://localhost:8000/v1',
  key: 'speaches',
  model: 'Systran/faster-whisper-large-v3',
  // model: 'Systran/faster-whisper-medium'
  // model: 'KBLab/kb-whisper-large'
});


const allText = ref<string[]>([]);
recognition.onTextReceived((text) => {
  allText.value.push(text);  
})

</script>