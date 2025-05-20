<template>
  <div class="m-36">
    <form class="flex gap-2" @submit.prevent="speech.enqueueSpeech(inputText)">
      <UInput v-model="inputText" />
      <UButton type="submit">Add to speech queue</UButton>
      <!-- <USeparator orientation="vertical" /> -->
      <UButton @click="sendSpeechAndPickNewRandomSentence()">Add random to speech queue</UButton>
      <UButton color="error" @click="speech.cancel()">Clear queue</UButton>
      <UButton color="secondary" @click="speech.speakDirectly(inputText)">Speak now!</UButton>
    </form>
    <div>
      <pre>{{ speechState }}</pre>
    </div>
  </div>
</template>

<script lang="ts" setup>
import OpenAI from 'openai';

// import { getRandomSwedishSentence } from '@/tests/testManuscript'
import { getRandomSwedishSentence } from 'speech-utils/tests/testManuscript.js';

function sendSpeechAndPickNewRandomSentence() {
  inputText.value = getRandomSwedishSentence();
  speech.enqueueSpeech(inputText.value);
}
  
const inputText = ref('Niels har stenkoll på läget!');
const openAI = new OpenAI({
  apiKey: 'speaches',
  baseURL: 'http://localhost:8000/v1',
  dangerouslyAllowBrowser: true,
}
)
  
const speech = new OpenAISpeechService(openAI);

const speechState = ref<SpeechState>(speech.getCurrentSpeechState());
speech.onSpeechStateChanged((newSpeechState) => {
  speechState.value = newSpeechState;
})

</script>

<style>

</style>