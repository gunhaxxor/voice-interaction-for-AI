<template>
  <div class="flex flex-col gap-6 p-40 items-center h-screen">
    <div class="shrink flex gap-6">
      <UButton class="w-40" variant="subtle" :color="listening ? 'error' : 'primary'"
        @click="listening ? stopListening() : startListening()">{{ listening ? 'Stop' : 'Start' }}
        recognition
        <template #leading>
          <UIcon class="size-6" name="i-lucide-mic" :class="{ 'animate-pulse': listening }" />
        </template>
      </UButton>
      <!-- <UButton @click="recognition.stopListenAudio(); started = false">Stop listening</UButton> -->
    </div>
    <div class="max-w-xl">
      <p :class="{ 'font-bold': isFinalTranscript }">
        {{ currentTranscript }}
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>

import { VoskletRecognitionService } from 'speech-utils/recognitionService/voskletRecognitionService.js';
const recognition = new VoskletRecognitionService({
  modelUrl: '/models/vosk-model-small-en-us-0.15.tar.gz'
});

onMounted(() => {
  recognition.load();
})

const listening = ref(false);
async function startListening() {
  await recognition.startListenAudio();
}

function stopListening() {
  recognition.stopListenAudio();
}

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