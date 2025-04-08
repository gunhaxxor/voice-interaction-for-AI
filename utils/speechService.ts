
export interface TTSService{
  speakDirectly(text: string): void,
  pause(): void,
  resume(): void,
  cancel(): void,
  enqueueSpeech(text: string): void,
  getPendingSpeech(): string[],
}

export class MockTTSServiceImpl implements TTSService{
  private queue: string[] = [];
  private currentSpeech: string | undefined = undefined;
  constructor(){

  } 
  
  speakDirectly(text: string): void {
    this.currentSpeech = text;
    this.queue.length = 0;
    console.log(text);
  }

  cancel(): void {
    this.queue.length = 0;
    this.currentSpeech = undefined;
    console.log('cancel');
  }
  
  pause(): void {
    console.log('pause');
  }
  
  resume(): void {
    console.log('resume');
  }

  enqueueSpeech(text: string): void {
    this.queue.push(text);
    console.log('enqueueSpeech');
  }

  getPendingSpeech(): string[] {
    console.log('getPendingSpeech');
    return this.queue;
  }

}
