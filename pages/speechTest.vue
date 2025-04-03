<template>
  <div class="flex my-16 mx-auto w-xl" @submit.prevent="addSpeech()">
    <UInput class="grow" v-model="text" />
    <UButton type="submit" @click="addSpeech()">Add to speech queue</UButton>
  </div>
</template>

<script lang="ts" setup>

function addSpeech() {
  addSpeechToQueue(text.value);
}

const { addSpeechToQueue } = initiatateSpeechSynth();
  
const text = ref('');

</script>

<style>

</style>