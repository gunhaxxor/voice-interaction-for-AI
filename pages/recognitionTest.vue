<template>
  <div class="flex flex-col gap-6 items-center">
    <div class="mt-52 shrink flex gap-6">
      <UButton class="w-40" variant="subtle" :color="started ? 'error' : 'primary'"
        @click="started ? stopListening() : startListening()">{{ started ? 'Stop' : 'Start' }}
        recognition
        <template #leading>
          <UIcon class="size-6" name="i-lucide-mic" :class="{ 'animate-pulse': started }" />
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

const recognition = new WebRecognitionService({
  lang: 'sv-SE',
})

const started = ref(false);
async function startListening() {
  await recognition.startListenAudio();
  started.value = true;
}

function stopListening() {
  recognition.stopListenAudio();
  started.value = false;
}

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