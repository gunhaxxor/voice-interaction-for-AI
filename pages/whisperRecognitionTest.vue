<template>
  <div class="m-48">
    <UButton @click="start">Start</UButton>
    <p>{{ listening ? 'Listening' : 'Not listening' }}</p>
    <p>{{ speaking ? 'Speaking' : 'Not speaking' }}</p>
    <p>Latest transcript: {{ }}</p>
    <div>
      <p>
        History:
      </p>
      <p v-for="historyRecord in history">
        {{ historyRecord.snapshot }}
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>

const whisperRecogniton = new WhisperRecognitionService();

const latestTranscript = ref('');
const { history } = useRefHistory(latestTranscript);
whisperRecogniton.onTextReceived((text) => {
  latestTranscript.value = text;
})

function start() {
  whisperRecogniton.startListenAudio();
}

const listening = ref(false);
whisperRecogniton.onListeningStateChanged((state) => {
  listening.value = state === 'listening' ? true : false;
})
const speaking = ref(false);
whisperRecogniton.onInputSpeechStateChanged((state) => {
  speaking.value = state === 'speaking' ? true : false;
})


</script>

<style></style>