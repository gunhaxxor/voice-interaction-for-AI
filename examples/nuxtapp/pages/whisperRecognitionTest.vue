<template>
  <div class="m-48">
    <USwitch v-model="listeningToggleState" label="Start/Stop" />
    <p>{{ listening ? 'Listening' : 'Not listening' }}</p>
    <p>{{ speaking ? 'Speaking' : 'Not speaking' }}</p>
    <div>
      <p class="font-bold">Current transcript: {{ currentTranscript }}</p>
      <p>
        History:
      </p>
      <p v-for="transcript in previousTranscripts">
        {{ transcript }}
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>

import { WhisperRecognitionService } from 'speech-utils/recognitionService/whisperRecognitionService.js';

const whisperRecogniton = new WhisperRecognitionService({
  url: 'http://localhost:8000/v1',
  model: 'Systran/faster-whisper-large-v3',
  key: 'speaches',
  lang: 'sv',
  mode: 'translate'
});

const currentTranscript = ref('');
// const { history } = useRefHistory(latestTranscript);
const previousTranscripts = ref<string[]>([]);
whisperRecogniton.onTextReceived((text) => {
  previousTranscripts.value.unshift(text);
  currentTranscript.value = '';
})
whisperRecogniton.onInterimTextReceived((text) => {
  console.log('interim text: ', text);
  currentTranscript.value = text;
})

const listeningToggleState = computed<boolean>({
  get() {
    return listening.value;
  },
  set(listenValue) {
    if (!listening.value) {
      whisperRecogniton.startListenAudio()
    } else {
      whisperRecogniton.stopListenAudio();
    }
  }
})

const listening = ref(false);
whisperRecogniton.onListeningStateChanged((state) => {
  listening.value = state === 'listening' ? true : false;
})
const speaking = ref(false);
whisperRecogniton.onVADStateChanged((state) => {
  speaking.value = state === 'speaking' ? true : false;
})


</script>

<style></style>