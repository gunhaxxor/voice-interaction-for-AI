<template>
  <div class="h-screen w-full mask-t-from-80%">
    <div v-auto-animate class="h-5/6 w-5/6 mx-auto flex flex-col justify-end gap-6">
      <p v-for="(transcript, idx) in allTranscripts" :key="transcript.id"
        class="w-full dynamic-text-size transition-all">
        {{ transcript.text }}
      </p>
    </div>
  </div>
  <div class="fixed bottom-2 left-2 hover:opacity-100 opacity-30 transition-opacity">
    <USwitch v-model="listeningToggleState" label="Start/Stop" />
    <div v-if="debugEnabled">

      <p>{{ listening ? 'Listening' : 'Not listening' }}</p>
      <p>{{ speaking ? 'Speaking' : 'Not speaking' }}</p>
      <!-- <div>
      <p class="font-bold">Current transcript: {{ interimTranscript }}</p>
      <p>
        History:
      </p>
      <p v-for="transcript in allTranscripts">
        {{ transcript }}
      </p>
    </div> -->
    </div>
  </div>
</template>

<script lang="ts" setup>

import { WhisperRecognitionService } from 'speech-utils/recognitionService/whisperRecognitionService.js';

import { getRandomSentence } from 'speech-utils/tests/testManuscript.js'

const keys = useMagicKeys();

let transcriptCounter = 0;

const [debugEnabled, toggleDebug] = useToggle();
whenever(keys.shift_D, () => {
  console.log('shift D pressed');
  toggleDebug();
})

whenever(keys.t, () => {
  console.log('t pressed');
  allTranscripts.value.push({ id: transcriptCounter++, text: getRandomSentence() });
})

const whisperRecogniton = new WhisperRecognitionService({
  url: 'http://localhost:8000/v1',
  model: 'Systran/faster-whisper-large-v3',
  key: 'speaches',
  lang: 'sv',
  mode: 'translate',
  maxChunkSec: 7,
  minChunkSec: 2,
  secToWaitBeforeSendingSmallChunk: 2,
});

const interimTranscript = ref('');
// const { history } = useRefHistory(latestTranscript);
const allTranscripts = ref<{ id: number, text: string }[]>([
// { id: transcriptCounter++, text: 'Today is a good day!' },
// { id: transcriptCounter++, text: 'It\'s not clear how the results were calculated' },
// { id: transcriptCounter++, text: '... and it\'s also not clear why people keep trying the same thing over and over. When it obviously doesn\'t work.' },
// { id: transcriptCounter++, text: 'Trying to staty positive, one could argue that its in nature of human behaviour to never give up hope.' }
]);
// const mostRecenTranscripts = computed(() => allTranscripts.value.slice(-30));


whisperRecogniton.onTextReceived((text) => {
  // allTranscripts.value.unshift(text);
  allTranscripts.value.push({ id: transcriptCounter++, text });
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

whisperRecogniton.onSpeechStart(() => {
  console.log('Speech started');
});
whisperRecogniton.onSpeechEnd(() => {
  console.log('Speech ended');
});

</script>

<style scoped>
        .dynamic-text-size {
          font-size: calc(2rem + 1vw);
    
          &:last-child {
            font-size: calc(2.8rem + 1vw);
          }
}
</style>

<style>
body {
  /* background-color: #009ca6; */
    background-color: #0e4e65;
    color: #fff7dd;
  font-family: "Roboto Mono", sans-serif;
}
</style>