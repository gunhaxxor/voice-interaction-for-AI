
export type SpeechState = 'idle' | 'speaking' | 'paused' | 'error'
interface TTSServiceSpeechOptions {
  lang?: PossibleLanguages,
  speed?: number
  pitch?: number
}
export interface TTSService {
  onError(errorHandler: (error: Error) => void): void
  speakDirectly(text: string, options?: TTSServiceSpeechOptions): void,
  pause(): void,
  resume(): void,
  cancel(): void,
  enqueueSpeech(text: string, options?: TTSServiceSpeechOptions): void,
  getPendingSpeech(): string[],
  getCurrentSpeech(): string | undefined,
  getCurrentSpeechState(): SpeechState,
  onSpeechStateChanged(handler?: (newSpeechState: SpeechState, prevSpeechState: SpeechState) => void): void
  onSpeechQueueUpdated(handler?: (pendingSpeech: string[], currentSpeech?: string, reason?: string) => void): void
}


import { isSpeechSynthesisSupported, initiatateSpeechSynth, type UtteranceOptions } from "./webSpeech";
export class WebSpeechService implements TTSService {
  private speech: ReturnType<typeof initiatateSpeechSynth>

  constructor(options?: Parameters<typeof initiatateSpeechSynth>[0]) {
    if (!isSpeechSynthesisSupported()) {
      console.error('SpeechSynthesis is not supported on this device');
      throw new Error('SpeechSynthesis is not supported on this device. Chech with isSpeechSynthesisSupported() before init');
    }
    this.speech = initiatateSpeechSynth(options)
  }
  //TODO: Actually call handler if error
  private errorHandler?: (error: Error) => void;
  onError(errorHandler: (error: Error) => void): void {
    this.errorHandler = errorHandler;
  }
  enqueueSpeech(text: string, options?: UtteranceOptions) {
    this.speech.addSpeechToQueue(text, options);
  }
  speakDirectly(text: string, options?: UtteranceOptions) {
    this.speech.clearQueueAndSpeak(text, options);
  }
  cancel() {
    this.speech.stopAllSpeech();
  }
  pause() {
    this.speech.pause();
  }
  resume() {
    this.speech.resume();
  }
  getPendingSpeech() {
    return this.speech.getSpeechQueue()
  }
  getCurrentSpeech(): string | undefined {
    return this.speech.getCurrentSpeech();
  }

  onSpeechQueueUpdated(handler: (pendingSpeech: string[], currentSpeech?: string, reason?: string) => void): void {
    this.speech.setSpeechQueueUpdatedListener(handler);
  }

  getCurrentSpeechState(): SpeechState {
    return this.speech.getCurrentSpeechState();
  }

  onSpeechStateChanged(handler: (newSpeechState: SpeechState, prevSpeechState: SpeechState) => void): void {
    this.speech.setSpeechStateChangedListener(handler);
  }

  // Implementation specific functionality
  // Should prefer to not use this as its not in interface and thus not as easily replaceable

  getAvailableVoices() {
    return this.speech.getAvailableVoices();
  }
  setVoicesChangedListener(handler: (voices: SpeechSynthesisVoice[]) => void) {
    this.speech.setVoicesChangedListener(handler);
  }
}

export class MockTTSServiceImpl implements TTSService{
  private queue: string[] = [];
  private currentSpeech: string | undefined = undefined;
  private queueHandler?: (pendingSpeech: string[], currentSpeech?: string, reason?: string) => void

  private speechState: SpeechState = 'idle';
  private speechStateHandler?: (newSpeechState: SpeechState, prevSpeechState: SpeechState) => void
  constructor(){

  } 
  
  private errorHandler?: (error: Error) => void
  onError(errorHandler: (error: Error) => void): void {
    this.errorHandler = errorHandler;
  }

  private setNewSpeechState(newSpeechState: SpeechState): void {
    const prevSpeechState = this.speechState;
    this.speechState = newSpeechState;
    this.speechStateHandler?.(newSpeechState, prevSpeechState);
  }

  speakDirectly(text: string): void {
    this.currentSpeech = text;
    this.queue.length = 0;
    this.queueHandler?.(this.queue, this.currentSpeech, 'directly');
    this.setNewSpeechState('speaking');
    console.log(text);
  }

  cancel(): void {
    this.queue.length = 0;
    this.currentSpeech = undefined;
    this.queueHandler?.(this.queue, this.currentSpeech, 'all speech cancelled');
    this.setNewSpeechState('idle');
    console.log('cancel');
  }
  
  pause(): void {
    console.log('pause');
    this.setNewSpeechState('paused')
  }
  
  resume(): void {
    console.log('resume');
    this.setNewSpeechState('speaking');
  }

  enqueueSpeech(text: string): void {
    this.queue.push(text);
    this.queueHandler?.(this.queue, this.currentSpeech, 'speech added');
    this.setNewSpeechState('speaking');
    console.log('enqueueSpeech');
  }

  getPendingSpeech(): string[] {
    console.log('getPendingSpeech');
    return this.queue;
  }

  getCurrentSpeech(): string | undefined {
    console.log('getCurrentSpeech');
    return this.currentSpeech
  }

  onSpeechQueueUpdated(handler?: (pendingSpeech: string[], currentSpeech?: string, reason?: string) => void): void {
    this.queueHandler = handler;
  }

  onSpeechStateChanged(handler?: (newSpeechState: SpeechState, prevSpeechState: SpeechState) => void): void {
    this.speechStateHandler = handler
  }

  getCurrentSpeechState(): SpeechState {
    return this.speechState;
  }

}
