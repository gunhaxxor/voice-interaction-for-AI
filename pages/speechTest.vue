<template>
  <div class="my-16 mx-auto w-2xl flex flex-col gap-6">

    <form class="flex flex-wrap gap-3" @submit.prevent="addSpeechWithVoice">
      <UInput class="flex-6/12" v-model="text" />
      <UButton class="flex-2/12" type="submit">Add to speech queue</UButton>
      <USelect :ui="{ content: 'w-96' }" :content="{ align: 'end' }" class="w-72" :items="availableVoices"
        v-model="chosenVoiceURI" label-key="name" value-key="voiceURI">
        <template #item="{ item }">
          <div class="w-96 gap-x-4 gap-y-0.5 grid auto-cols-auto">
            <p class="col-start-1 col-span-2">{{ item.name }}</p>
            <p class="justify-self-end">{{ item.lang }}</p>
            <p class="text-sm text-neutral-400"> {{ item.localService ? 'local' : 'remote' }} </p>
            <p class="col-start-3 justify-self-end">{{ item.default ? ' (default)' : '' }}</p>
          </div>
        </template>
      </USelect>
      <UButton color="error" @click="stopAllSpeech()">Clear queue</UButton>

    </form>
    <UFormField size="xl" label="Presets" description="Add to speech queue">
      <UButtonGroup orientation="vertical">
        <UButton v-for="speech in presetSpeechs" color="neutral" variant="outline"
          @click="addSpeechToQueue(speech.text, speech)">{{ speech.text }}</UButton>
      </UButtonGroup>
    </UFormField>
    <div>
      <pre>{{ currentUtterance?.text }}</pre>
      <USeparator />
      <pre v-for="ut in speechQueue">{{ ut.text }}</pre>
    </div>
  </div>
</template>

<script lang="ts" setup>

function addSpeechWithVoice() {
  console.log('chosenVoice: ', chosenVoice.value);
  addSpeechToQueue(text.value, {
    voice: chosenVoice.value
  });
}

// const lang = ref<string>('se-SV');
const chosenVoiceURI = shallowRef<SpeechSynthesisVoice['voiceURI']>();
const chosenVoice = computed<SpeechSynthesisVoice | undefined>(() => {
  const foundVoice = availableVoices.value.find(voice => voice.voiceURI === chosenVoiceURI.value);
  if (!foundVoice) {
    return undefined;
  }
  return foundVoice;
})

const {
  addSpeechToQueue,
  stopAllSpeech,
  pause,
  resume,
  getAvailableVoices,
  setVoicesChangedListener,
  setQueueUpdatedListener,
  speechSynthesis,
} = initiatateSpeechSynth();

const availableVoices = ref<SpeechSynthesisVoice[]>(getAvailableVoices() ?? []);
setVoicesChangedListener((voices) => {
  availableVoices.value = voices
})

const speechQueue = ref<SpeechSynthesisUtterance[]>([]);
const currentUtterance = ref<SpeechSynthesisUtterance | undefined>();
setQueueUpdatedListener((newQueue, newCurrentUtterance, reason) => {
  console.log(`UtteranceQueue updated (${reason}):`, newCurrentUtterance?.text, newQueue);
  speechQueue.value = [...newQueue];
  currentUtterance.value = newCurrentUtterance;
});
  
const text = ref('Hello. My name is Robert and I\'m a robot!!!');

const presetSpeechs = [
  {
    text: 'Hurra för Sara!! Nu är hon äntligen vuxen!! Hipp hipp, Hurra hurra hurra!',
    lang: 'se-SV'
  },
  {
    text: 'Jag heter Gunnar. James Gunnar',
    lang: 'se-SV'
  },
  {
    text: 'Idag är det torsdag. Imorgon är det måndag. Konstigt va?',
    lang: 'se-SV'
  },
  {
    text: 'I like big butts and I can not lie!',
    lang: 'en-GB'
  },
  {
    text: 'I like big butts and I cannot lie!',
    lang: 'en-US'
  },
  {
    text: 'Sometimes it rains.',
    lang: 'en-US'
  },
  {
    text: 'Hejsan! Jag heter Bengt. Microsoft Bengt!',
    lang: 'sv-SE'
  },
  {
    text: 'Tror du på tomten?',
    lang: 'se-SV'
  },
  {
    text: 'Jij hebt mooie ogen',
    lang: 'nl-NL'
  },
  {
    text: 'Mi gusta! Dolce VITA! It\'s a me, MARIO!',
    lang: 'it-IT'
  },
]

</script>

<style>

</style>