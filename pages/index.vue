<script setup lang="ts">
  import { marked, } from 'marked';
  import { useChat } from '@ai-sdk/vue';
  // import bgUrl from '~/assets/ivan-bandura-2FEE6BR343k-unsplash.jpg';
  // const { stream, start, stop } = useUserMedia({
  //   constraints: {
  //     audio: true,
  //   }
  // })
  // const voices = window.speechSynthesis.getVoices();
  // console.log(voices);
  const { isListening, start, stop, result, isFinal, error, recognition } = useSpeechRecognition({
    lang: 'sv-SE',
    interimResults: true,
    continuous: true,
  })
  
  const currentSpeechSynthText = ref('Tjenare');

  const { utterance, speak, status: speechStatus, isPlaying, stop: stopSpeech, error: speechError, isSupported } = useSpeechSynthesis(currentSpeechSynthText,{
    lang: 'sv-SE',
    pitch: 4,
    rate: 1.4,
  });
  
  
  const autoSendSpeech = ref(true);
  
  const { messages, input, handleSubmit, status: chatStatus, } = useChat()
  const parsedMessages = computed(() => {
    return messages.value.map((message) => {
      return {
        ...message,
        parsedContent:  marked.parse(message.content, {
          async: false,
        })
      }
    })
  })
  
  watch(chatStatus, () => {
    if(chatStatus.value === 'ready' && messages.value.length !== 0) {
      currentSpeechSynthText.value = messages.value[messages.value.length - 1].content;
      console.log('chatStatus ready!', currentSpeechSynthText.value);
      speak();
    }
  });
  
  watch(isFinal, () => {
    if(isFinal.value) {
      if(autoSendSpeech.value) {
        handleSubmit();
      }
    }
  })
  
  watch(result, () => {
    if(isListening.value) {
      input.value = result.value;
    }
  })
  
  // const img = useImage();
  // const imgUrl = '~/assets/ivan-bandura-2FEE6BR343k-unsplash.jpg';
  
  // const backgroundStyles = computed(() => {
  //   // const imgUrl = img('~/assets/ivan-bandura-2FEE6BR343k-unsplash.jpg');
    
  //   return {
  //     backgroundImage: `url(${bgUrl})`,
  //   }
  // })

  const messageContainer = useTemplateRef<HTMLDivElement>('messageContainer');
  
  watch(() => parsedMessages.value[parsedMessages.value.length - 1], (msg) => {
    console.log(messageContainer.value?.lastElementChild?.lastElementChild);
    messageContainer.value?.lastElementChild?.lastElementChild?.scrollIntoView({
      behavior: 'smooth',
    });
  })
  
</script>

<template>

  <div class="">
    <div class="fixed top-0 left-0 p-4 max-w-64">
      <p>Listening: {{ isListening }}</p>
      <p>Final: {{ isFinal }}</p>
      <p>Error: {{ error }}</p>
      <p>Result: {{ result }}</p>
      <br />
      <p>Chat status: {{ chatStatus }}</p>
    </div>
    <div ref="messageContainer" class="mx-auto mb-12 p-6 max-w-2xl flex flex-col gap-4 w-full">
      <template v-for="message in parsedMessages" :key="message.id">
        <div class="rounded-md p-4 border backdrop-blur-xl" :class="[message.role === 'user' ? 'self-end border-amber-400 ml-10' : 'mr-10']" v-html="message.parsedContent">
        </div>
      </template>
    </div>
    <form class="fixed backdrop-blur-sm w-full justify-center bottom-0 p-4 flex items-end gap-2" @submit.prevent="handleSubmit">
      <p class="mb-2">
        <UKbd>CTRL</UKbd>+<UKbd>ENTER</UKbd> to submit:
      </p>
      <UTextarea @keydown.ctrl.enter="handleSubmit" :ui="{base: 'resize-none'}" class="w-full max-w-md" size="xl" autoresize :rows="1" :maxrows="10" v-model="input">
      </UTextarea>
      <UButton size="xl" type="submit">Submit</UButton>
      <UButton size="xl" :icon="isListening?'i-lucide-mic-off':'i-lucide-mic'" @click="isListening ? stop() : start()"></UButton>
      <USwitch v-model="autoSendSpeech" icon>Auto send</USwitch>
      <UButton @click="speak">Speak</UButton>
    </form>
  </div>
</template>

<style lang="css" scoped>

:global(body) {
  /* background-color: oklch(from var(--ui-bg) L C H / 0.8); */
  background-image: url('~/assets/ivan-bandura-2FEE6BR343k-unsplash.jpg');
  background-blend-mode: soft-light;
  background-position: center;
  background-attachment: fixed;
}
</style>