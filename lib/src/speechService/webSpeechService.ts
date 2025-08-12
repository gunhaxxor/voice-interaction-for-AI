import type { SpeechService, SpeechState } from "./interface";
import { isSpeechSynthesisSupported, initiatateSpeechSynth, type UtteranceOptions } from "./webSpeech";

export type { SpeechState } from "./interface";
export class WebSpeechService implements SpeechService {
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