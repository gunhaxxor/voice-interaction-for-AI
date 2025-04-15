<template>
  <div class="m-36">
    <form @submit.prevent="speech.enqueueSpeech(inputText)">
      <UInput v-model="inputText"  />
      <UButton type="submit">Add to speech queue</UButton>
    </form>
  </div>
</template>

<script lang="ts" setup>
import OpenAI from 'openai';

  
const inputText = ref('Jacob är helt okej!');
const openAI = new OpenAI({
  apiKey: 'speaches',
  baseURL: 'http://localhost:8000/v1',
  dangerouslyAllowBrowser: true,
}
)
  
const speech = new OpenAISpeechService(openAI);

</script>

<style>

</style>