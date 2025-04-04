<template>
  <div class="my-16 mx-auto w-2xl flex flex-col gap-6">

    <form class="" @submit.prevent="addSpeechWithVoice">
      <UInput class="grow" v-model="text" />
      <UButton type="submit">Add to speech queue</UButton>
      <!-- <USelect :items="['se-SV', 'en-GB', 'nl-NL']" v-model="lang" /> -->
      <USelect :ui="{ content: 'w-96' }" :content="{ align: 'end' }" class="w-72" :items="availableVoices"
        v-model="chosenVoiceURI" label-key="name" value-key="voiceURI">
        <template #item="{ item }">
          <div class="w-96 gap-x-4 gap-y-0.5 grid auto-cols-auto">

            <p class="col-start-1 col-span-2">{{ item.name }}</p>
            <p class="justify-self-end">{{ item.lang }}</p>
            <p class="text-sm text-neutral-400"> {{ item.localService ? 'local' : 'remote' }} </p>
            <p class="col-start-3 justify-self-end">{{ item.default ? ' (default)' : '' }}</p>
            <!-- <p>{{ item.voiceURI }}</p> -->
          </div>
        </template>
      </USelect>
      <UButton color="error" @click="stopAllSpeech()">Clear queue</UButton>

    </form>
    <UFormField size="xl" label="Presets" description="Add to speech queue">

      <UButtonGroup orientation="vertical">
        <UButton color="neutral" variant="outline"
          @click="addSpeechToQueue('Hurra för Sara!! Nu är hon äntligen vuxen!! Hipp hipp, Hurra hurra hurra!', { lang: 'se-SV' })">
          Hurra för Sara!! Nu är hon äntligen vuxen!! Hipp hipp, Hurra hurra hurra!</UButton>
        <UButton color="neutral" variant="outline" @click="addSpeechToQueue('Jag heter Gunnar', { lang: 'se-SV' })">Jag
          heter Gunnar</UButton>
        <UButton color="neutral" variant="outline"
          @click="addSpeechToQueue('Idag är det torsdag. Imorgon är det måndag. Konstigt va?', { lang: 'se-SV' })">
          Idag är det torsdag. Imorgon är det måndag. Konstigt va?</UButton>
        <UButton color="neutral" variant="outline"
          @click="addSpeechToQueue('I like big butts and I can not lie!', { lang: 'en-GB' })">
          I like big butts and I can not lie!</UButton>
        <UButton color="neutral" variant="outline"
          @click="addSpeechToQueue('I like big butts and I can not lie!', { lang: 'en-US' })">
          I like big butts and I can not lie!</UButton>
        <UButton color="neutral" variant="outline" @click="addSpeechToQueue('Jij hebt mooie ogen', { lang: 'nl-NL' })">
          Jij hebt mooie ogen</UButton>
        <UButton color="neutral" variant="outline"
          @click="addSpeechToQueue('Mi gusta! Dolce VITA! It\'s a me, MARIO!', { lang: 'it-IT' })">
          Mi gusta! Dolce VITA! It's a me, MARIO!</UButton>
      </UButtonGroup>
    </UFormField>
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
setQueueUpdatedListener((newQueue) => {
  console.log('Queue updated:', newQueue);
});
  
const text = ref('Hello. My name is Robert and I\'m a robot!!!');

</script>

<style>

</style>