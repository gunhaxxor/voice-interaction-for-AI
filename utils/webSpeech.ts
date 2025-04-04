import { options } from "marked";

export function isSpeechSynthesisSupported() {
  if(!window) return false
  return 'speechSynthesis' in window;
}

export interface UtteranceOptions {
  /**
   * Language for SpeechSynthesis
   *
   * @default 'en-US'
   */
  lang?: SpeechSynthesisUtterance['lang']
  /**
   * Gets and sets the pitch at which the utterance will be spoken at.
   *
   * @default 1
   */
  pitch?: SpeechSynthesisUtterance['pitch']
  /**
   * Gets and sets the speed at which the utterance will be spoken at.
   *
   * @default 1
   */
  rate?: SpeechSynthesisUtterance['rate']
  /**
   * Gets and sets the voice that will be used to speak the utterance.
   */
  voice?: SpeechSynthesisVoice
  /**
   * Gets and sets the volume that the utterance will be spoken at.
   *
   * @default 1
   */
  volume?: SpeechSynthesisUtterance['volume']
}

// export function getAvailableVoices() {
//   if(!isSpeechSynthesisSupported()){
//     console.warn('SpeechSynthesis is not supported on this device');
//     return;
//   }

//   return window.speechSynthesis.getVoices();
// }

type QueueUpdatedHandler = (queue: SpeechSynthesisUtterance[], reason?: string) => void

export function initiatateSpeechSynth(defaultUtteranceOptions: UtteranceOptions = {}) {
  let currentUtterance: SpeechSynthesisUtterance | undefined = undefined;
  const utteranceQueue: SpeechSynthesisUtterance[] = [];
  let queueUpdatedHandler: undefined | QueueUpdatedHandler = undefined;
  function setQueueUpdatedListener(handler: QueueUpdatedHandler) {
    queueUpdatedHandler = handler;
  }
  function addToQueue(utterance: SpeechSynthesisUtterance) {
    utteranceQueue.push(utterance);
    queueUpdatedHandler?.(utteranceQueue, 'added');
  }
  function shiftFromQueue() {
    // utteranceQueue.splice(utteranceQueue.indexOf(utterance), 1);
    const shiftedUtterance = utteranceQueue.shift();
    queueUpdatedHandler?.(utteranceQueue, 'removed');
    return shiftedUtterance;
  }
  if(!isSpeechSynthesisSupported()){
    console.error('SpeechSynthesis is not supported on this device');
    throw new Error('SpeechSynthesis is not supported on this device. Chech with isSpeechSynthesisSupported() before init');
  }
  // const defaultUttOpts = defaultUtteranceOptions as (Required<Omit<UtteranceOptions, 'voice'>> & Pick<UtteranceOptions, 'voice'>);

  const {
    lang = 'en-US',
    pitch = 1,
    rate = 1,
    voice = null,
    volume = 1 
  } = defaultUtteranceOptions;
  const synth = window.speechSynthesis
  const addSpeechToQueue = (text: string, options: UtteranceOptions = {}) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang ?? lang;
    utterance.pitch = options.pitch ?? pitch;
    utterance.rate = options.rate ?? rate;
    utterance.voice = options.voice ?? voice;
    utterance.volume = options.volume ?? volume;
    utterance.onstart = () => {
      // const startedUtterance = utteranceQueue.shift();
      const currentUtterance = shiftFromQueue()
      if (utterance !== currentUtterance) {
        throw new Error('currentUtterance is not the same as utterance. There is a bug');
      }
      console.log('currentUtterance: ', currentUtterance);
    }
    addToQueue(utterance);
    // utterance.addEventListener('boundary', (evt) => {
    //   console.log('boundary event', evt);
    // })
    synth.speak(utterance);
  }
  
  function clearQueueAndSpeak(text: string, options: UtteranceOptions = {}) {
    synth.cancel();
    addSpeechToQueue(text, options);
  }

  function stopAllSpeech() {
    synth.cancel();
  }

  function pause() {
    synth.pause();
  }

  function resume() {
    synth.resume();
  }

  function getAvailableVoices() {
    return synth.getVoices();
  }

  function setVoicesChangedListener(handler: (voices: SpeechSynthesisVoice[]) => void) {
    synth.onvoiceschanged = () => {
      handler(synth.getVoices());
    }
  }

  return {
    addSpeechToQueue,
    clearQueueAndSpeak,
    stopAllSpeech,
    pause,
    resume,
    getAvailableVoices,
    setVoicesChangedListener,
    setQueueUpdatedListener,
    speechSynthesis: synth,
  }
}