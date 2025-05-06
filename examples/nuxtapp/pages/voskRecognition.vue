<template>
  <div class="flex flex-col gap-6 p-40 items-center h-screen">
    <div class="shrink flex gap-6">
      <UButton class="w-40" variant="subtle" :color="listening ? 'error' : 'primary'"
        @click="listening ? recognition.stopListenAudio() : recognition.startListenAudio()">{{ listening ? 'Stop' :
          'Start' }}
        recognition
        <template #leading>
          <UIcon class="size-6" name="i-lucide-mic" :class="{ 'animate-pulse': listening }" />
        </template>
      </UButton>
      <!-- <UButton @click="init()">init</UButton>
      <UButton @click="updateRms()">analyze</UButton>
      {{ currentRms }} -->
    </div>
    <div class="max-w-xl">
      <p :class="{ 'font-bold': isFinalTranscript }">
        {{ currentTranscript }}
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>

import { onRMSUpdate, getCurrentRMS, VoskBrowserRecognitionService } from 'speech-utils/recognitionService/voskBrowserRecognition.js';
const recognition = new VoskBrowserRecognitionService();
recognition.initialize();

// const currentRms = ref(0);
// onRMSUpdate((rms) => {
//   currentRms.value = rms;
// })
// function updateRms() {
//   currentRms.value = getCurrentRMS();
// }
// const response = await init()

const listening = ref(false);
// async function startListening() {
//   await recognition.startListenAudio();
// }

// function stopListening() {
//   recognition.stopListenAudio();
// }

const currentTranscript = ref('');
const isFinalTranscript = ref(false);
recognition.onTextReceived((text) => {
  console.log(text);
  isFinalTranscript.value = true;
  currentTranscript.value = text;
})
recognition.onInterimTextReceived((text) => {
  console.log(text);
  isFinalTranscript.value = false;
  currentTranscript.value = text;
})

recognition.onListeningStateChanged((state) => {
  listening.value = state === 'listening' ? true : false;
})

</script>

<style>

</style>