<script setup lang="ts">
import { marked, } from 'marked';
import { useChat } from '@ai-sdk/vue';

import video1 from '~/public/videos/189639-886016299_small.mp4';
import video2 from '~/public/videos/160767-822213540_tiny.mp4';
import video3 from '~/public/videos/29561-375947285_small.mp4';
import video4 from '~/public/videos/29575-375947265_small.mp4';
import video5 from '~/public/videos/71122-537102350_small.mp4';

const videoUrls = shallowRef([
  '/videos/189639-886016299_small.mp4',
  '/videos/160767-822213540_tiny.mp4',
  '/videos/29561-375947285_small.mp4',
  '/videos/29575-375947265_small.mp4',
  '/videos/71122-537102350_small.mp4',
]);
const { state: currentVideoUrl, next: nextVideoUrl } = useCycleList(videoUrls)

const bgVideoRef = templateRef('backgroundVideo');
onMounted(() => {
  if (isDefined(bgVideoRef)) {
    bgVideoRef.value.loop = true;
    bgVideoRef.value.playbackRate = 0.7;
    // bgVideoRef.value.addEventListener('ended', () => {
    //   console.log('video ended');
    //   bgVideoRef.value.playbackRate = -1;
    //   bgVideoRef.value.play();
    // })
  }
})

// @ts-expect-error
const chatComponent = templateRef('chatInput');
onStartTyping(() => {
  if (document.activeElement !== chatComponent.value?.textareaRef) {
    chatComponent.value?.textareaRef?.focus();
  }
})

// import bgUrl from '~/assets/ivan-bandura-2FEE6BR343k-unsplash.jpg';
// const { stream, start, stop } = useUserMedia({
//   constraints: {
//     audio: true,
//   }
// })
// const voices = window.speechSynthesis?.getVoices();
// console.log(voices);
const { isListening, start, stop, result, isFinal, error, recognition } = useSpeechRecognition({
  lang: 'sv-SE',
  interimResults: true,
  continuous: true,
})

const currentSpeechSynthText = ref('Tjenare');

const { utterance, speak, status: speechStatus, isPlaying, stop: stopSpeech, error: speechError, isSupported } = useSpeechSynthesis(currentSpeechSynthText, {
  lang: 'sv-SE',
  pitch: 8,
  rate: 1.4,
});


const autoSendSpeech = ref(true);

const { messages, input, handleSubmit, status: chatStatus, } = useChat()
const parsedMessages = computed(() => {
  return messages.value.map((message) => {
    return {
      ...message,
      parsedContent: marked.parse(message.content, {
        async: false,
      })
    }
  })
})

watch(chatStatus, () => {
  if (chatStatus.value === 'ready' && messages.value.length !== 0) {
    currentSpeechSynthText.value = messages.value[messages.value.length - 1].content;
    console.log('chatStatus ready!', currentSpeechSynthText.value);
    speak();
  }
});

watch(isFinal, () => {
  if (isFinal.value) {
    if (autoSendSpeech.value) {
      handleSubmit();
    }
  }
})

watch(result, () => {
  if (isListening.value) {
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

import type { CardProps } from '@nuxt/ui';
const cardUISettings: CardProps['ui'] = { body: 'p-3 sm:p-3', header: 'p-3 sm:p-3', root: 'backdrop-blur-lg ring-neutral-500/35' }


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
    <div class="fixed w-screen h-screen">
      <video :src="currentVideoUrl" ref="backgroundVideo" muted autoplay
        class="object-cover w-full h-full brightness-50 ">
        <!-- <source :src="currentVideoUrl" type="video/mp4"> -->
      </video>
    </div>
    <div class="fixed top-0 left-0 flex flex-col gap-4 p-3 max-w-64">
      <UCard :ui="cardUISettings" class="" variant="subtle">
        <template #header>Recognition status</template>
        <div class="grid grid-cols-2 items-center gap-x-2 *:even:font-bold *:odd:text-sm">
          <p>Listening: </p>
          <p>{{ isListening }}</p>
          <p>Final: </p>
          <p>{{ isFinal }}</p>
          <p>Error: </p>
          <p>{{ error }}</p>
          <p>Result: </p>
          <p>{{ result }}</p>
        </div>
      </UCard>
      <UCard :ui="cardUISettings" class="" variant="subtle">
        <template #header>Synthesis status</template>

        <div class="grid grid-cols-2 items-center gap-x-2 *:even:font-bold *:odd:text-sm">
          <p>Playing: </p>
          <p>{{ isPlaying }}</p>
          <p>Error: </p>
          <p>{{ speechError }}</p>
          <p>Status: </p>
          <p>{{ speechStatus }}</p>
        </div>
      </UCard>
      <UCard :ui="cardUISettings" class="" variant="subtle">
        <template #header>Chat status</template>
        <div class="grid grid-cols-2 items-center gap-x-2 *:even:font-bold *:odd:text-sm">
          <p>status: </p>
          <p>{{ chatStatus }}</p>
          <p>{{ currentVideoUrl }}</p>
        </div>
      </UCard>
    </div>
    <div ref="messageContainer" class="flex flex-col w-full max-w-2xl gap-4 p-6 mx-auto mb-16">
      <template v-for="message in parsedMessages" :key="message.id">
        <div class="p-4 border rounded-md backdrop-blur-md"
          :class="[message.role === 'user' ? 'self-end border-amber-400 ml-10' : 'mr-10']"
          v-html="message.parsedContent">
        </div>
      </template>
    </div>
    <form
      class="fixed bottom-0 flex items-end justify-center w-full gap-2 p-4 backdrop-blur-lg ring-1 ring-(--ui-border)"
      @submit.prevent="handleSubmit">
      <UButton size="xl" class="rounded-full" color="neutral" variant="subtle" icon="i-lucide-image"
        @click="nextVideoUrl()"></UButton>
      <div class="grow"></div>
      <p class="mb-2">
        <UKbd>CTRL</UKbd>+<UKbd>ENTER</UKbd> to submit:
      </p>
      <UTextarea ref="chatInput" variant="soft" @keydown.ctrl.enter="handleSubmit" :ui="{ base: 'resize-none' }"
        class="w-full max-w-md" size="xl" autoresize :rows="1" :maxrows="10" v-model="input">
      </UTextarea>
      <UButton size="xl" type="submit">Submit</UButton>
      <UButton size="xl" :icon="isListening ? 'i-lucide-mic-off' : 'i-lucide-mic'"
        @click="isListening ? stop() : start()">
      </UButton>
      <USwitch v-model="autoSendSpeech" icon>Auto send</USwitch>
      <UButton @click="speak">Speak</UButton>
      <div class="grow"></div>
    </form>
  </div>
</template>

<style lang="css" scoped>

/* :global(body) {
  background-color: oklch(from var(--ui-bg) L C H / 0.8);
  background-image: v-bind(bgurl);
  background-blend-mode: soft-light;
  background-position: center;
  background-attachment: fixed;
}
*/
</style>