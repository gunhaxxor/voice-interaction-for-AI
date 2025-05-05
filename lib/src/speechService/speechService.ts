
import type { PossibleLanguagesBCP47 } from "../utilityTypes";
export type SpeechState = 'idle' | 'speaking' | 'paused' | 'error'
export interface SpeechServiceSpeechOptions {
  lang?: PossibleLanguagesBCP47,
  speed?: number
  pitch?: number
}
export interface SpeechService {
  onError(errorHandler: (error: Error) => void): void
  speakDirectly(text: string, options?: SpeechServiceSpeechOptions): void,
  pause(): void,
  resume(): void,
  cancel(): void,
  enqueueSpeech(text: string, options?: SpeechServiceSpeechOptions): void,
  getPendingSpeech(): string[],
  getCurrentSpeech(): string | undefined,
  getCurrentSpeechState(): SpeechState,
  onSpeechStateChanged(handler?: (newSpeechState: SpeechState, prevSpeechState: SpeechState) => void): void
  onSpeechQueueUpdated(handler?: (pendingSpeech: string[], currentSpeech?: string, reason?: string) => void): void
}

export class SpeechServiceCallbackHandling implements Pick<SpeechService, 'onError' | 'onSpeechStateChanged' | 'onSpeechQueueUpdated'> {

  protected errorHandler?: (error: Error) => void;
  onError(errorHandler: (error: Error) => void): void {
    this.errorHandler = errorHandler;
  }

  protected speechState: SpeechState = 'idle';
  protected setSpeechState(newSpeechState: SpeechState): void {
    const prevSpeechState = this.speechState;
    this.speechState = newSpeechState;
    this.speechStateHandler?.(newSpeechState, prevSpeechState);
  }

  protected speechStateHandler?: (newSpeechState: SpeechState, prevSpeechState: SpeechState) => void;
  onSpeechStateChanged(handler?: (newSpeechState: SpeechState, prevSpeechState: SpeechState) => void): void {
    this.speechStateHandler = handler;
  }
  protected speechQueueUpdatedHandler?: (pendingSpeech: string[], currentSpeech?: string, reason?: string) => void;
  onSpeechQueueUpdated(handler?: (pendingSpeech: string[], currentSpeech?: string, reason?: string) => void): void {
    this.speechQueueUpdatedHandler = handler;
  }
}

