
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

export class MockSpeechServiceImpl implements SpeechService{
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
