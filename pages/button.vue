<script setup lang="ts">
import { marked, } from 'marked';
import { useChat } from '@ai-sdk/vue';
import { useSpeechSynthesisCustom } from '~/composables/useSpeechSynthesis';


const videoUrls = shallowRef([
  '/videos/71122-537102350_small.mp4',
  '/videos/189639-886016299_small.mp4',
  '/videos/160767-822213540_tiny.mp4',
  '/videos/29561-375947285_small.mp4',
  '/videos/29575-375947265_small.mp4',
]);
const { state: currentVideoUrl, next: nextVideoUrl, go: setVideoIndex } = useCycleList(videoUrls, {
  initialValue: videoUrls.value[Math.floor(Math.random() * videoUrls.value.length)],
})

const bgVideoRef = templateRef('backgroundVideo');
onMounted(() => {
  // setVideoIndex(Math.floor(Math.random() * videoUrls.value.length));
  if (isDefined(bgVideoRef)) {
    bgVideoRef.value.loop = true;
    bgVideoRef.value.playbackRate = 0.7;
  }
})

// Button stuff

type ButtonMode = 'hold' | 'pressStart' | 'pressStartStop'
const currentButtonMode = ref('hold' as ButtonMode)

onMounted(() => {
  window.addEventListener('keydown', onButtonDown)
  window.addEventListener('keyup', onButtonUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onButtonDown)
  window.removeEventListener('keyup', onButtonUp)
})

function onButtonDown(e: KeyboardEvent) {
  if(e.key === ' ' && !e.repeat){
    switch (currentButtonMode.value) {
      case 'hold':
        console.log('Start listening')
        currentListenMode.value = 'listen'
        break
      case 'pressStart':
        console.log('Start listening')
        currentListenMode.value = 'listen'
        break
      case 'pressStartStop':
        if(!isListening.value) {
          console.log('Start listening')
          currentListenMode.value = 'listenAndSend'
        }
        else {
          console.log('Stop listening')
          currentListenMode.value = 'inactive'
        }
        break
    }
  }
}

function onButtonUp(e: KeyboardEvent) {
  if(e.key === ' '){
    switch (currentButtonMode.value) {
      case 'hold':
        console.log('Stop listening')
        handleSubmit()
        currentListenMode.value = 'inactive'
        break
      case 'pressStart':
        break
      case 'pressStartStop':
        break
    }
    
  }
}

const buttonListItems = ref([
  {
    value: 'hold',
    label: 'Hold',
    description: 'Hold > speak > release.'
  },
  {
    value: 'pressStart',
    label: 'Press, single sentence',
    description: 'Press > speak a single sentence'
  },
  {
    value: 'pressStartStop',
    label: 'Press, continuous ',
    description: 'Press > speak > press again to stop'
  }
])

// @ts-expect-error
const chatComponent = templateRef('chatInput');
onStartTyping(() => {
  if (document.activeElement !== chatComponent.value?.textareaRef) {
    chatComponent.value?.textareaRef?.focus();
  }
})

const { isListening, start: startListening, stop: stopListening, result: ListeningResult, isFinal: ListeningResultIsFinal, error: ListeningError, recognition } = useSpeechRecognition({
  lang: 'sv-SE',
  interimResults: true,
  continuous: true,
})
const listenModes: ('listen' | 'listenAndSend' | 'inactive')[] = ['listen', 'listenAndSend', 'inactive'];
const { state: currentListenMode, next: nextListenMode } = useCycleList(listenModes, { initialValue: 'inactive' });
watch(currentListenMode, (newListenMode) => {
  switch (newListenMode) {
    case 'listen':
      startListening();
      break;
    case 'listenAndSend':
      startListening();
      break;
    case 'inactive':
      stopListening();
      break;
  }
});
const currentListenModeIcon = computed(() => {
  switch (currentListenMode.value) {
    case 'listen':
      return 'i-material-symbols-mic';
    case 'listenAndSend':
      return 'i-material-symbols-auto-detect-voice';
    case 'inactive':
      return 'i-material-symbols-mic-off';
  }
})

const currentSpeechSynthText = ref('Tjenare');
const { utterance, speak, resume, status: speechStatus, isPlaying: speechIsPlaying, stop: stopSpeech, error: speechError, isSupported } = useSpeechSynthesisCustom(currentSpeechSynthText, {
  lang: 'sv-SE',
  pitch: 1,
  rate: 1.5,
});
const autoSpeak = ref(false);
const toggleAutoSpeak = useToggle(autoSpeak);

const { messages, input, handleSubmit, status: chatStatus, data: chatData } = useChat()
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
    // console.log('chatStatus ready!', currentSpeechSynthText.value);
    // speak();
  }
});

watch(chatData, () => {
  console.log('data updated:', chatData.value);
})


const speechQueue = ref<string[]>([]);

const sentenceTransformer = sentenceStreamer();
const wordWriter = sentenceTransformer.writable.getWriter();
const sentenceReader = sentenceTransformer.readable.getReader();

// const segmenter = new Intl.Segmenter(['sv', 'en'], { granularity: 'sentence' });
// const strArr = Array.from(segmenter.segment('Hello! Whats your name? My name is Bob!'));
onMounted(() => {
  readNextSentencesLoop();
})

async function readNextSentencesLoop() {
  while (true) {
    console.log('gonna read next sentence');
    // code execution pauses here until data available or stream closed (or error)
    const { value: sentence, done } = await sentenceReader.read();
    console.log('read next sentence resolved', sentence, done);
    if (done) break;
    // speechQueue.value.push(sentence)
    currentSpeechSynthText.value = sentence;
    speak();
  }
}

watch(() => messages.value.at(-1), (lastMessageNewValue, lastMessagePrevValue) => {
  if (!isDefined(lastMessageNewValue) || !isDefined(lastMessagePrevValue)) return;
  if (lastMessageNewValue.role !== 'assistant') return;
  // console.log('assistant message updated. new:', lastMessageNewValue.content, ' prev:', lastMessagePrevValue.content);
  if (lastMessageNewValue.id === lastMessagePrevValue.id) {
    const addedChars = lastMessageNewValue.content.substring(lastMessagePrevValue.content.length);
    // console.log(addedChars);
    wordWriter.write(addedChars);

    // Add to sentence
    // const lastSentence = speechQueue.value.at(-1); 
    // speechQueue.value.at(-1) += addedChars;
  } else {
    //Start new sentence
    console.log('new sentence');
    wordWriter.write(lastMessageNewValue.content);
    // speechQueue.value.push(lastMessageNewValue.content);
  }

  // console.log(newMessages[newMessages.length - 1].parts);
  // console.log(prevMessages[newMessages.length - 1].parts);
})

watch(ListeningResultIsFinal, () => {
  if (ListeningResultIsFinal.value) {
    if (currentListenMode.value === 'listenAndSend') {
      handleSubmit();
    }
    if (currentButtonMode.value === 'pressStart') {
      handleSubmit();
      currentListenMode.value = 'inactive'
    }
  }
})

watch(ListeningResult, () => {
  if (isListening.value) {
    input.value = ListeningResult.value;
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
const debugPanelClasses = 'grid grid-cols-2 items-center mt-3 border-t border-(--ui-border) gap-x-2 *:even:font-bold *:odd:text-sm'

const messageContainer = useTemplateRef<HTMLDivElement>('messageContainer');

watch(() => parsedMessages.value[parsedMessages.value.length - 1], (msg) => {
  // console.log(messageContainer.value?.lastElementChild?.lastElementChild);
  messageContainer.value?.lastElementChild?.lastElementChild?.scrollIntoView({
    behavior: 'smooth',
  });
})

</script>

<template>

  <div class="">
    <div class="fixed w-screen h-screen bg-black">
      <!-- <video :src="currentVideoUrl" ref="backgroundVideo" muted autoplay
        class="object-cover w-full h-full brightness-50 ">
      </video> -->
    </div>
    
    <div ref="messageContainer" class="flex flex-col w-full max-w-2xl gap-4 p-6 mx-auto mb-16">
      <template v-for="message in parsedMessages" :key="message.id">
        <div class="p-4 border rounded-md backdrop-blur-md bg-neutral-950/45"
          :class="[message.role === 'user' ? 'self-end border-amber-400 ml-10' : 'mr-10']">
          <div v-html="message.parsedContent"></div>
          <!-- <pre class="whitespace-pre-wrap">
            {{ message.content }}
          </pre> -->
        </div>
      </template>
      <!-- Current input -->
      <div v-if="isListening" class="p-4 border rounded-md backdrop-blur-md bg-neutral-950/45 self-end border-amber-400 ml-10">
        <span style="color: red">Recording</span>
        <div v-html="input"></div>
      </div>
      
    </div>
    <form
      class="fixed bottom-0 flex items-center justify-center w-full gap-2 p-4 backdrop-blur-lg ring-1 ring-(--ui-border)"
      @submit.prevent="handleSubmit">
      Spacebar / physical button:
      <div>
        <URadioGroup v-model="currentButtonMode" color="primary" orientation="horizontal" variant="card" :items="buttonListItems" />
      </div>
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