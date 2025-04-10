<template>
  <div class="flex flex-col gap-6 items-center">
  <div class="mt-52 shrink flex gap-6">
    <UButton @click="recognition.startListenAudio()">Start listening</UButton>
    <UButton @click="recognition.stopListenAudio()">Stop listening</UButton>
  </div>
  <div>
    <p :class="{ 'font-bold': isFinalTranscript }">
      {{ currentTranscript }}
    </p>
  </div>
  </div>
</template>

<script lang="ts" setup>

const recognition = new WebRecognitionService({
  lang: 'sv-SE',
})

const currentTranscript = ref('');
const isFinalTranscript = ref(false);
recognition.onTextReceived((text) => {
  isFinalTranscript.value = true;
  currentTranscript.value = text;
})
recognition.onInterimTextReceived((text) => {
  isFinalTranscript.value = false;
  currentTranscript.value = text;
})

</script>

<style>

</style>