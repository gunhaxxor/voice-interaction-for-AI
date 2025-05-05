import type { RecognitionService } from "./recognitionService";

export class MockRecognitionService implements RecognitionService {
  private readonly manuscript = [
    'Hello!',
    'How are you?',
    'I am fine',
    'I am not fine',
    'I like big butts and I cannot lie',
    'How about next year?'
  ]
  constructor(manuscript?: string[]) {
    if (manuscript) {
      this.manuscript = manuscript;
    }
  }
  private errorHandler?: (error: Error) => void;
  onError(errorHandler: (error: Error) => void): void {
    this.errorHandler = errorHandler;
  }
  private currentInterval = 0;
  async startListenAudio() {
    console.log('startListening audio');
    // clear previous interval if is set
    if (this.currentInterval) clearInterval(this.currentInterval);

    this.setListeningState('listening');

    let intervalCounter = 0;
    this.currentInterval = setInterval(() => {

      let currentTextIdx = Math.floor((intervalCounter - 1) / 3);
      currentTextIdx = currentTextIdx === -1 ? 0 : currentTextIdx;
      currentTextIdx = currentTextIdx % this.manuscript.length;
      const currentText = this.manuscript[currentTextIdx];
      switch (intervalCounter % 3) {
        case 0:
          const interim = currentText.slice(0, Math.floor(currentText.length / 2));
          this.speechStateChangedHandler?.('speaking');
          this.interimTextReceivedHandler?.(interim);
          break;
        case 1:
          this.textReceivedHandler?.(currentText);
          break;
        case 2:
          this.speechStateChangedHandler?.('idle');
          break;
      }

      intervalCounter++;
    }, 50);


    return Promise.resolve();
  }
  stopListenAudio(): void {
    console.log('stopListening audio');
    this.setListeningState('inactive');
    clearInterval(this.currentInterval);
  }

  private textReceivedHandler?: (text: string) => void;
  onTextReceived(handler?: (text: string) => void): void {
    this.textReceivedHandler = handler;
  }

  private interimTextReceivedHandler?: (text: string) => void;
  onInterimTextReceived(handler?: (text: string) => void): void {
    this.interimTextReceivedHandler = handler;
  }

  private setInputSpeechState(state: VADState): void {
    this.inputSpeechState = state;
    this.speechStateChangedHandler?.(state);
  }
  private inputSpeechState: VADState = 'idle';
  getVADState(): VADState {
    return this.inputSpeechState;
  }

  private setListeningState(state: ListeningState): void {
    this.listeningState = state;
    this.listeningStateChangedHandler?.(state);
  }
  private listeningState: ListeningState = 'inactive';
  getListeningState(): ListeningState {
    return this.listeningState;
  }

  private speechStateChangedHandler?: (state: VADState) => void;
  onVADStateChanged(handler?: ((state: "speaking" | "idle") => void)): void {
    this.speechStateChangedHandler = handler;
  }

  private listeningStateChangedHandler?: (state: ListeningState) => void;
  onListeningStateChanged(handler?: ((state: ListeningState) => void)): void {
    this.listeningStateChangedHandler = handler;
  }
}
