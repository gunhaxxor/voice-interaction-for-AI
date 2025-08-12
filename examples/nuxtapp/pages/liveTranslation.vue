<template>
  <div class="fixed top-2 left-2" >
    <USwitch v-model="listeningToggleState" label="Start/Stop" />
    <div v-if="debugEnabled">

    <p>{{ listening ? 'Listening' : 'Not listening' }}</p>
    <p>{{ speaking ? 'Speaking' : 'Not speaking' }}</p>
    <div>
      <p class="font-bold">Current transcript: {{ interimTranscript }}</p>
      <p>
        History:
      </p>
      <p v-for="transcript in allTranscripts">
        {{ transcript }}
      </p>
    </div>
    </div>
  </div>
  <div class="grid place-content-center h-screen rise-fonts">

      <p v-for="transcript in mostRecenTranscripts">
        {{ transcript }}
      </p>
  </div>
</template>

<script lang="ts" setup>

import { WhisperRecognitionService } from 'speech-utils/recognitionService/whisperRecognitionService.js';

const keys = useMagicKeys();

const [debugEnabled, toggleDebug] = useToggle();
whenever(keys.shift_D, () => {
  console.log('shift D pressed');
  toggleDebug();
})

const whisperRecogniton = new WhisperRecognitionService({
  url: 'http://localhost:8000/v1',
  model: 'Systran/faster-whisper-large-v3',
  key: 'speaches',
  lang: 'sv',
  mode: 'translate'
});

const interimTranscript = ref('');
// const { history } = useRefHistory(latestTranscript);
const allTranscripts = ref<string[]>([]);
const mostRecenTranscripts = computed(() => allTranscripts.value.slice(0, 5));


whisperRecogniton.onTextReceived((text) => {
  allTranscripts.value.unshift(text);
  interimTranscript.value = '';
})
whisperRecogniton.onInterimTextReceived((text) => {
  console.log('interim text: ', text);
  interimTranscript.value = text;
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

<style scoped>
div {
  /* font-family: Lato, sans-serif; */
  font-family: "Roboto Mono", sans-serif;
}
</style>