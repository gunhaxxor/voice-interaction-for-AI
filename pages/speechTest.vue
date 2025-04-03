<template>
  <form class="flex my-16 mx-auto w-xl" @submit.prevent="addSpeech">
    <UInput class="grow" v-model="text" />
    <UButton type="submit">Add to speech queue</UButton>
    <UButton color="error" @click="stopAllSpeach()">Clear queue</UButton>
  </form>
</template>

<script lang="ts" setup>

function addSpeech() {
  addSpeechToQueue(text.value);
}

const { addSpeechToQueue, stopAllSpeach, pause, resume } = initiatateSpeechSynth();
  
const text = ref('Hello. My name is Robert and I\'m a robot!!!');

</script>

<style>

</style>