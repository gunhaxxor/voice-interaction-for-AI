<template>
  <div class="flex flex-col gap-6 items-center">
    <div class="mt-52 shrink flex gap-6">
      <UButton @click="startListening">Start listening
        <template #leading>
          <UIcon name="i-material-symbols-mic" :class="{ 'animate-pulse': started }" />
        </template>
      </UButton>
      <UButton @click="recognition.stopListenAudio(); started = false">Stop listening</UButton>
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