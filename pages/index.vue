<script setup lang="ts">
import { marked, } from 'marked';
import { useChat } from '@ai-sdk/vue';

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

// @ts-expect-error
const chatComponent = templateRef('chatInput');
onStartTyping(() => {
  if (document.activeElement !== chatComponent.value?.textareaRef) {
    chatComponent.value?.textareaRef?.focus();
  }
})

const recognition = new WebRecognitionService({
  lang: 'sv-SE',
})
const recognitionIsListening = ref(false);
recognition.onListeningStateChanged((state) => {
  recognitionIsListening.value = state === 'listening' ? true : false;
})
// const currentTranscript = ref('');
recognition.onTextReceived((text) => {
  writtenInput.value = text;
  // currentTranscript.value = text;
  // interimTranscript.value = '';
  if (currentListenMode.value === 'listenAndSend') {
    submitChatInput();
  }
  // input.value = text;
})
// const interimTranscript = ref('');
recognition.onInterimTextReceived((text) => {
  writtenInput.value = text;
  // currentTranscript.value = '';
  // interimTranscript.value = text;
})

const listenModes: ('listen' | 'listenAndSend' | 'inactive')[] = ['listen', 'listenAndSend', 'inactive'];
const { state: currentListenMode, next: nextListenMode } = useCycleList(listenModes, { initialValue: 'inactive' });
watch(currentListenMode, (newListenMode) => {
  switch (newListenMode) {
    case 'listen':
      recognition.startListenAudio();
      break;
    case 'listenAndSend':
      break;
    case 'inactive':
      recognition.stopListenAudio();
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
const webSpeech = new WebSpeechService({ lang: 'sv-SE', pitch: 5, rate: 1.7 });

const speechIsPlaying = ref(false);
webSpeech.onSpeechStateChanged((newSpeechState) => {
  speechIsPlaying.value = newSpeechState === 'speaking' ? true : false;
})
const autoSpeak = ref(false);
const toggleAutoSpeak = useToggle(autoSpeak);

const { messages, input: writtenInput, handleSubmit, status: chatStatus, data: chatData } = useChat()
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

// watch(chatStatus, () => {
//   if (chatStatus.value === 'ready' && messages.value.length !== 0) {
//     currentSpeechSynthText.value = messages.value[messages.value.length - 1].content;
//     // console.log('chatStatus ready!', currentSpeechSynthText.value);
//     // speak();
//   }
// });

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
    // currentSpeechSynthText.value = sentence;
    webSpeech.enqueueSpeech(sentence);
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

const combinedInput = ref('')

// watch(ListeningResultIsFinal, () => {
//   if (ListeningResultIsFinal.value) {
//     resultsAppended.value += ListeningResult.value
//     input.value = resultsAppended.value
//     if (currentListenMode.value === 'listenAndSend') {
//       // handleSubmit();
//       submit()
//     }
//   }
// })

// watch(ListeningResult, () => {
//   if (isListening.value) {
//     // input.value = ListeningResult.value;
//     if(!ListeningResultIsFinal.value){
//       input.value = resultsAppended.value + ListeningResult.value
//     }
//   }
// })

function submitChatInput() {
  combinedInput.value = ''
  handleSubmit()
}

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
    block: 'end',

  });
})

</script>

<template>

  <div class="w-screen h-screen flex flex-col">
    <ColorModeSwitch />
    <div class="fixed w-screen h-screen">
      <video :src="currentVideoUrl" ref="backgroundVideo" muted autoplay
        class="object-cover w-full h-full brightness-50 ">
      </video>
    </div>
    <div class="fixed top-0 left-0 flex flex-col gap-2 p-2 w-64">
      <UCard :ui="cardUISettings" class="" variant="subtle">
        <UCollapsible class="">
          <div class="">Listening status</div>
          <template #content>

            <div :class="debugPanelClasses">
              <p>Listening: </p>
              <p>{{ recognition.getListeningState() }}</p>
              <!-- <p>Final: </p>
              <p>{{ ListeningResultIsFinal }}</p> -->
              <!-- <p>Error: </p>
              <p>{{ ListeningError?.message }}</p> -->
              <!-- <p>Result: </p>
              <p>{{ ListeningResult }}</p> -->
              <p>ListenMode: </p>
              <p>{{ currentListenMode }}</p>
            </div>
          </template>
        </UCollapsible>
      </UCard>
      <UCard :ui="cardUISettings" class="" variant="subtle">
        <UCollapsible class="" default-open>
          <div>Synthesis status</div>

          <template #content>

            <div :class="debugPanelClasses">
              <p>Playing: </p>
              <p>{{ speechIsPlaying }}</p>
              <!-- <p>Error: </p>
              <p :class="{ 'invisible': !speechError }">{{ speechError?.error }}</p> -->
              <!-- <p>Status: </p>
              <p>{{ speechStatus }}</p> -->
              <!-- <p>Utterance: </p>
              <p>{{ utterance.text }}</p> -->
              <p>Current Text: </p>
              <p>{{ currentSpeechSynthText }}</p>
            </div>
          </template>
        </UCollapsible>
      </UCard>
      <UCard :ui="cardUISettings" class="max-h-80 overflow-y-scroll" variant="subtle">
        <UCollapsible>

          <div>Chat status</div>
          <template #content>

            <div :class="debugPanelClasses">
              <p>status: </p>
              <p>{{ chatStatus }}</p>
              <!-- <p>data: </p>
          <p>{{ chatData }}</p> -->
              <p>speechqueue: </p>
              <p>{{ speechQueue }}</p>
              <!-- <p>{{ currentVideoUrl }}</p> -->
            </div>
          </template>
        </UCollapsible>
      </UCard>
    </div>
    <div ref="messageContainer" class="flex flex-col w-full max-w-2xl gap-4 p-6 mx-auto pb-24">
      <template v-for="message in parsedMessages" :key="message.id">
        <div class="p-4 border rounded-md backdrop-blur-md bg-neutral-950/45"
          :class="[message.role === 'user' ? 'self-end border-amber-400 ml-10' : 'mr-10']">
          <div v-html="message.parsedContent"></div>
          <!-- <pre class="whitespace-pre-wrap">
            {{ message.content }}
          </pre> -->
        </div>
      </template>
    </div>
    <form
      class="fixed bottom-0 flex items-end justify-center w-full gap-2 p-4 backdrop-blur-lg ring-1 ring-(--ui-border)"
      @submit.prevent="submitChatInput">
      <UButton size="xl" class="rounded-full" color="neutral" variant="subtle" icon="i-lucide-image"
        @click="nextVideoUrl()"></UButton>
      <div class="grow"></div>
      <p class="mb-2">
        <UKbd>CTRL</UKbd>+<UKbd>ENTER</UKbd> to submit:
      </p>
      <UTextarea ref="chatInput" variant="soft" @keydown.ctrl.enter="submitChatInput" :ui="{ base: 'resize-none' }"
        class="w-full max-w-md" size="xl" autoresize :rows="1" :maxrows="10" v-model="writtenInput"
        @update:model-value="combinedInput = writtenInput">
      </UTextarea>
      <UButton size="xl" type="submit" icon="i-lucide-send"></UButton>
      <!-- <UButton size="xl" :variant="isListening ? 'solid' : 'soft'" :color="isListening ? 'primary' : 'warning'"
        :icon="isListening ? 'material-symbols-auto-detect-voice' : 'i-material-symbols-mic-off'"
        @click="isListening ? stopListening() : startListening()">
      </UButton> -->
      <UButton class="rounded-full" size="xl" :icon="currentListenModeIcon" @click="nextListenMode()"></UButton>
      <!-- <USwitch v-model="autoSendSpeech" icon>Auto send</USwitch> -->
      <!-- <UButton @click="webSpeech.enqueueSpeech(writtenInput)">Speak</UButton> -->
      <UButton @click="webSpeech.pause()">Pause</UButton>
      <UButton @click="webSpeech.resume()">Resume</UButton>
      <UButton size="xl" class="rounded-full" icon="i-material-symbols-voice-over-off" @click="webSpeech.cancel()">
      </UButton>
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