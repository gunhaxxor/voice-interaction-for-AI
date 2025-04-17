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

const recognition = new WhisperRecognitionService({
  url: 'http://localhost:8000/v1/',
  lang: 'sv',
})
// const recognition = new WebRecognitionService({
//   lang: 'sv-SE',
// })
const recognitionIsListening = ref(false);
recognition.onListeningStateChanged((state) => {
  recognitionIsListening.value = state === 'listening' ? true : false;
})
const userIsSpeaking = ref(false);
recognition.onInputSpeechStateChanged((state) => {
  userIsSpeaking.value = state === 'speaking' ? true : false;
  if (state === 'speaking') {
    console.log('started speaking. Will cancel speechService');
    webSpeech.cancel();
  }
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

// const webSpeech = new WebSpeechService({ lang: 'sv-SE' });
const webSpeech = new OpenAISpeechService({
  baseUrl: 'http://localhost:8000/v1',
  apiKey: 'ollama',
  lang: 'sv',
});

const autoSpeak = ref(true);
// const toggleAutoSpeak = useToggle(autoSpeak);

const speechIsPlaying = ref(false);
webSpeech.onSpeechStateChanged((newSpeechState) => {
  speechIsPlaying.value = newSpeechState === 'speaking' ? true : false;
})

const speechQueue = ref<string[]>([]);
const currentSpeech = ref<string>();
webSpeech.onSpeechQueueUpdated((pendingSpeech, newCurrentSpeech, reason) => {
  console.log('speechQueue updated', newCurrentSpeech, pendingSpeech);
  speechQueue.value = [...pendingSpeech];
  currentSpeech.value = newCurrentSpeech;
})

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



const sentenceTransformer = sentenceStreamer();
const wordWriter = sentenceTransformer.writable.getWriter();
const sentenceReader = sentenceTransformer.readable.getReader();

// const segmenter = new Intl.Segmenter(['sv', 'en'], { granularity: 'sentence' });
// const strArr = Array.from(segmenter.segment('Hello! Whats your name? My name is Bob!'));
onMounted(() => {
  readNextSentencesLoop();
})

onUnmounted(() => {
  webSpeech.cancel();
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
    if (autoSpeak.value) {
      webSpeech.enqueueSpeech(sentence, {
        // pitch: Math.random() * 2,
        // rate: Math.random() * 4
      });
    }
  }
}

watch([chatStatus, () => messages.value.at(-1)], ([newChatStatus, lastMessageNewValue], [prevChatStatus, lastMessagePrevValue]) => {
  if (!isDefined(lastMessageNewValue) || !isDefined(lastMessagePrevValue)) return;
  if (lastMessageNewValue.role !== 'assistant') return;

  // console.log('assistant message updated. new:', lastMessageNewValue.content, ' prev:', lastMessagePrevValue.content);
  if (lastMessageNewValue.id === lastMessagePrevValue.id) {
    const addedChars = lastMessageNewValue.content.substring(lastMessagePrevValue.content.length);
    // console.log(addedChars);
    wordWriter.write(addedChars);
    if (chatStatus.value === 'ready') {
      wordWriter.write('\n');
    }
  } else {
    //Start new sentence
    console.log('new sentence');
    wordWriter.write(lastMessageNewValue.content);
  }

})

const combinedInput = ref('')

function submitChatInput() {
  combinedInput.value = ''
  webSpeech.cancel();
  handleSubmit()
}

import type { CardProps } from '@nuxt/ui';
const cardUISettings: CardProps['ui'] = { body: 'p-3 sm:p-3', header: 'p-3 sm:p-3', root: 'backdrop-blur-xl bg-transparent ring-neutral-500/35' }
const debugPanelClasses = 'grid grid-cols-2 items-center mt-3 border-t border-(--ui-border) gap-x-2 *:even:font-bold *:odd:text-sm'

const messageContainer = useTemplateRef<HTMLDivElement>('messageContainer');

watch(() => parsedMessages.value[parsedMessages.value.length - 1], async (msg) => {
  messageContainer.value?.lastElementChild?.lastElementChild?.scrollIntoView({
    behavior: 'smooth',
    block: 'end',
  });
}, { flush: 'post' });

function testFunction() {
  messageContainer.value?.lastElementChild?.lastElementChild?.scrollIntoView({
    behavior: 'smooth',
    block: 'end',
  });
}

</script>

<template>

  <div class="h-screen overflow-clip flex flex-col items-stretch">
    <ColorModeSwitch />
    <div class="fixed w-screen h-screen -z-10">
      <video :src="currentVideoUrl" ref="backgroundVideo" muted autoplay
        class="object-cover w-full h-full brightness-30 light:invert-100">
      </video>
      <div class="absolute inset-0 bg-(--ui-bg)/30"></div>
    </div>
    <div class="fixed top-0 left-0 flex flex-col gap-2 p-2 w-64">
      <UCard :ui="cardUISettings" class="" variant="outline">
        <UCollapsible class="" default-open>
          <div class="">Listening status</div>
          <template #content>
            <div :class="debugPanelClasses">
              <p>Listening: </p>
              <p>{{ recognition.getListeningState() }}</p>
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
              <!-- <div class="contents" :class="{ 'invisible': !speechError }">
                <p>Error: </p>
                <p>{{ webSpeech }}</p>
              </div> -->
              <!-- <p>Status: </p>
              <p>{{ speechStatus }}</p> -->
              <p>Current Text: </p>
              <p>{{ currentSpeech }}</p>
              <p>Queue: </p>
              <p>{{ speechQueue }}</p>
            </div>
          </template>
        </UCollapsible>
      </UCard>
      <UCard :ui="cardUISettings" class="max-h-80 overflow-y-auto" variant="subtle">
        <UCollapsible>
          <div>Chat status</div>
          <template #content>
            <div :class="debugPanelClasses">
              <p>status: </p>
              <p>{{ chatStatus }}</p>
            </div>
          </template>
        </UCollapsible>
      </UCard>
      <!-- <UButton @click="testFunction">Test</UButton> -->
    </div>
    <div id="message-container" ref="messageContainer" class="grow overflow-y-scroll py-12">
      <div class="w-xl mx-auto flex flex-col gap-4">
        <template v-for="message in parsedMessages" :key="message.id">
          <div class="p-4 border scroll-mb-10 rounded-md backdrop-blur-md bg-(--ui-bg)/45"
            :class="[message.role === 'user' ? 'self-end border-(--ui-primary) ml-10' : 'mr-10']">
            <div class="prose dark:prose-invert" v-html="message.parsedContent"></div>
          </div>
        </template>
      </div>
    </div>
    <form
      class="shrink flex items-end justify-center w-full gap-2 p-4 backdrop-blur-lg ring-1 bg-(--ui-bg)/20 ring-(--ui-border-muted)"
      @submit.prevent="submitChatInput">
      <UButton size="xl" class="rounded-full" color="neutral" variant="subtle" icon="i-lucide-image"
        @click="nextVideoUrl()"></UButton>
      <div class="grow"></div>
      <p class="mb-2">
        <UKbd>CTRL</UKbd>+<UKbd>ENTER</UKbd> to submit:
      </p>
      <UTextarea ref="chatInput" variant="subtle" @keydown.ctrl.enter="submitChatInput" :ui="{ base: 'resize-none' }"
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
      <UButton>Button</UButton>
      <USwitch v-model="autoSpeak" label="Auto speak" />
      <UButton size="xl" class="rounded-full" icon="i-material-symbols-voice-over-off" @click="webSpeech.cancel()">
      </UButton>
      <div class="grow"></div>
    </form>
  </div>
</template>

<style lang="css" scoped></style>