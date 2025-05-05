import type { SpeechService, SpeechState } from "./speechService";

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
