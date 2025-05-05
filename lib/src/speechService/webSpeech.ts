import type { PossibleLanguagesBCP47 } from "../utilityTypes";

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
  // lang?: SpeechSynthesisUtterance['lang']
  lang?: PossibleLanguagesBCP47
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

type SpeechState = 'idle' | 'speaking' | 'paused' | 'error';

type UtteranceQueueUpdatedHandler = (utteranceQueue: SpeechSynthesisUtterance[], currentUtterance: SpeechSynthesisUtterance | undefined, reason?: string) => void
type SpeechQueueUpdatedHandler = (speechQueue: string[], currentSpeech: string | undefined, reason?: string) => void
type SpeechStateChangedHandler = (newSpeechState: SpeechState, prevSpeechState: SpeechState) => void

// TODO: handle the bug in Chrome (ium?) where remote voices doesn't work wihtout calling synth.cancel
// between utterances (I.E not possible to queue utterances).
export function initiatateSpeechSynth(defaultUtteranceOptions: UtteranceOptions = {}) {
  if (!isSpeechSynthesisSupported()) {
    console.error('SpeechSynthesis is not supported on this device');
    throw new Error('SpeechSynthesis is not supported on this device. Chech with isSpeechSynthesisSupported() before init');
  }

  let speechState: SpeechState = 'idle';
  function setSpeechState(newSpeechState: SpeechState) {
    const prevSpeechState = speechState;
    speechState = newSpeechState;
    speechStateChangedHandler?.(newSpeechState, prevSpeechState);
  }

  let currentUtterance: SpeechSynthesisUtterance | undefined = undefined;
  const utteranceQueue: SpeechSynthesisUtterance[] = [];

  let utteranceQueueUpdatedHandler: undefined | UtteranceQueueUpdatedHandler = undefined;
  function setUtteranceQueueUpdatedListener(handler: UtteranceQueueUpdatedHandler) {
    utteranceQueueUpdatedHandler = handler;
  }

  let currentSpeech: string | undefined = undefined;
  const speechQueue: string[] = [];

  let speechQueueUpdatedHandler: undefined | SpeechQueueUpdatedHandler = undefined;
  function setSpeechQueueUpdatedListener(handler: SpeechQueueUpdatedHandler) {
    speechQueueUpdatedHandler = handler;
  }

  let speechStateChangedHandler: undefined | SpeechStateChangedHandler = undefined;
  function setSpeechStateChangedListener(handler: SpeechStateChangedHandler) {
    speechStateChangedHandler = handler;
  }

  function getCurrentSpeechState(): SpeechState {
    return speechState;
  }

  function addToQueue(utterance: SpeechSynthesisUtterance) {
    utteranceQueue.push(utterance);
    speechQueue.push(utterance.text);
    utteranceQueueUpdatedHandler?.(utteranceQueue, currentUtterance, 'utterance added');
    speechQueueUpdatedHandler?.(speechQueue, currentSpeech, 'speech added');
  }
  function setCurrentFromQueue() {
    // utteranceQueue.splice(utteranceQueue.indexOf(utterance), 1);
    currentUtterance = utteranceQueue.shift();
    currentSpeech = speechQueue.shift();
    utteranceQueueUpdatedHandler?.(utteranceQueue, currentUtterance, 'utterance started');
    speechQueueUpdatedHandler?.(speechQueue, currentSpeech, 'speech started');
  }
  // const defaultUttOpts = defaultUtteranceOptions as (Required<Omit<UtteranceOptions, 'voice'>> & Pick<UtteranceOptions, 'voice'>);

  const {
    lang = 'en-US',
    pitch = 1,
    rate = 1,
    voice = null,
    volume = 1 
  } = defaultUtteranceOptions;
  const synth = window.speechSynthesis;
  let onstartBugFlag = false;
  const addSpeechToQueue = (text: string, options: UtteranceOptions = {}) => {
    if (onstartBugFlag) {
      //This hack currently doesnt work with the queue. We have to find another way
      //stopAllSpeech();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang ?? lang;
    utterance.pitch = options.pitch ?? pitch;
    utterance.rate = options.rate ?? rate;
    utterance.voice = options.voice ?? voice;
    utterance.volume = options.volume ?? volume;
    if (utterance.voice && !utterance.voice.localService) {
      console.warn('Remote voices seem to be buggy in Chrome (ium?)');
    }
    utterance.onstart = () => {
      onstartBugFlag = false;
      setCurrentFromQueue()
      setSpeechState('speaking');
      if (utterance !== currentUtterance) {
        throw new Error('currentUtterance is not the same as utterance. There is a bug');
      }
    }
    utterance.onerror = (event) => {
      console.log('utterance.onerror', event);
      setSpeechState('error');
    }
    utterance.onpause = (event) => {
      console.log('utterance.onpause', event);
      setSpeechState('paused');
    }
    utterance.onresume = (event) => {
      console.log('utterance.onresume', event);
      setSpeechState('speaking');
    }
    utterance.onend = () => {
      currentUtterance = undefined;
      currentSpeech = undefined;
      utteranceQueueUpdatedHandler?.(utteranceQueue, currentUtterance, 'utterance ended');
      speechQueueUpdatedHandler?.(speechQueue, currentSpeech, 'speech ended');
      if (utteranceQueue.length === 0) {
        setSpeechState('idle');
      }
    }
    addToQueue(utterance);
    synth.speak(utterance);
    onstartBugFlag = true;
    setTimeout(() => {
      // console.log('after calling speak');
      // console.log('synth.speaking', synth.speaking);
      console.log('onstartBugFlag', onstartBugFlag);
    }, 350);
  }
  
  function clearQueueAndSpeak(text: string, options: UtteranceOptions = {}) {
    synth.cancel();
    utteranceQueue.length = 0;
    speechQueue.length = 0;
    addSpeechToQueue(text, options);
  }

  function stopAllSpeech() {
    synth.cancel();
    utteranceQueue.length = 0;
    speechQueue.length = 0;
    currentUtterance = undefined;
    currentSpeech = undefined;
    utteranceQueueUpdatedHandler?.(utteranceQueue, currentUtterance, 'all speech cancelled');
    speechQueueUpdatedHandler?.(speechQueue, currentSpeech, 'all speech cancelled');
    setSpeechState('idle');
  }

  function getCurrentSpeech() {
    return currentSpeech;
  }

  function getSpeechQueue() {
    return speechQueue;
  }

  function getCurrentUtterance() {
    return currentUtterance;
  }

  function getUtteranceQueue() {
    return utteranceQueue;
  }

  function pause() {
    synth.pause();
    setSpeechState('paused');
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
    setUtteranceQueueUpdatedListener,
    setSpeechQueueUpdatedListener,
    setSpeechStateChangedListener,
    getCurrentSpeech,
    getSpeechQueue,
    getCurrentUtterance,
    getUtteranceQueue,
    getCurrentSpeechState,
    speechSynthesis: synth,
  }
}