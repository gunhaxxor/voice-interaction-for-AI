interface STTServiceListenOptions {
  lang?: PossibleLanguages
}

type ListeningState = 'listening' | 'inactive';
type InputSpeechState = 'speaking' | 'idle';
type VADState = 'unset' | 'voiceIsInactive' | 'voiceIsActive';
export interface STTService {
  onError(errorHandler: (error: Error) => void): void;
  startListenAudio(options?: STTServiceListenOptions): Promise<void>;
  stopListenAudio(): void;
  setVADOverride?(state: VADState): void;
  releaseVADOverride?(): void;
  getListeningState(): ListeningState;
  getInputSpeechState(): InputSpeechState;
  // getTranscript(): string;
  onListeningStateChanged(handler?: ((state: ListeningState) => void)): void;
  onTextReceived(handler?: ((text: string) => void)): void;
  onInterimTextReceived(handler?: ((text: string) => void)): void;
  onInputSpeechStateChanged(handler?: ((state: 'speaking' | 'idle') => void)): void;
  // removeTextReceivedListener(listener: (text: string) => void): void;
}

export class WebRecognitionService implements STTService {
  private recognition: SpeechRecognition;
  private defaultListenOptions?: STTServiceListenOptions;
  private listeningTargetState: ListeningState = 'inactive';

  constructor(options?: STTServiceListenOptions) {
    this.defaultListenOptions = options;
    const SpeechRecognition = window && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    if (!SpeechRecognition) {
      throw new Error('Speech Recognition is not supported in this browser');
    }
    this.recognition = new SpeechRecognition();
  }
  private errorHandler?: (error: Error) => void;
  onError(errorHandler: (error: Error) => void): void {
    this.errorHandler = errorHandler;
    this.recognition.onerror = (event) => {
      const error = new Error(`Speech Recognition error (${event.error}): ` + event.message);
      if (!this.errorHandler) {
        console.error('No recognition errorhandler set, Speech Recognition error', error);
      } else {
        this.errorHandler?.(error);
      }
    };
  }
  private inputSpeechState: InputSpeechState = 'idle';
  private setInputSpeechState(state: InputSpeechState): void {
    this.inputSpeechState = state;
    this.speechStateChangedHandler?.(state);
  }
  async startListenAudio(options?: STTServiceListenOptions) {
    this.listeningTargetState = 'listening';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = options?.lang ?? this.defaultListenOptions?.lang ?? 'en-US';
    this.recognition.start();
    this.recognition.onresult = (evt) => {
      const resultList = evt.results;
      const latestResult = resultList[resultList.length - 1];
      const isFinal = latestResult.isFinal;
      const text = latestResult[0].transcript;
      if (isFinal) {
        this.textReceivedHandler?.(text);
      } else {
        this.interimTextReceivedHandler?.(text);
      }
    }
    this.recognition.onspeechstart = () => {
      this.setInputSpeechState('speaking');
    }
    this.recognition.onspeechend = () => {
      this.setInputSpeechState('idle');
    }
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    this.recognition.onstart = () => {
      // console.log('recognition listen started');
      this.setListeningState('listening');
      resolve();
    }
    this.recognition.onend = () => {
      // console.log('recognition listen stopped');
      if (this.listeningTargetState === 'listening') {
        console.warn('recognition listen ended by browser, will try start it again');
        this.recognition.start();
        return;
      }
      this.inputSpeechState = 'idle';
    }
    return promise;
  }
  stopListenAudio(): void {
    this.listeningTargetState = 'inactive';
    this.setListeningState('inactive');
    this.recognition.stop();
  }

  private listeningState: ListeningState = 'inactive';
  getListeningState(): ListeningState {
    return this.listeningState;
  }

  getInputSpeechState(): InputSpeechState {
    return this.inputSpeechState;
  }

  private listeningStateChangedHandler?: (state: ListeningState) => void;
  private setListeningState(state: ListeningState): void {
    this.listeningState = state;
    this.listeningStateChangedHandler?.(state);
  }
  onListeningStateChanged(handler?: (state: ListeningState) => void): void {
    this.listeningStateChangedHandler = handler;
  }

  private textReceivedHandler?: (text: string) => void;
  onTextReceived(handler?: (text: string) => void): void {
    this.textReceivedHandler = handler;
  }
  
  private interimTextReceivedHandler?: (text: string) => void;
  onInterimTextReceived(handler?: ((text: string) => void)): void {
    this.interimTextReceivedHandler = handler;
  }

  private speechStateChangedHandler?: (state: InputSpeechState) => void;
  onInputSpeechStateChanged(handler?: ((state: "speaking" | "idle") => void)): void {
    this.speechStateChangedHandler = handler;
  }

}

export class MockSTTService implements STTService {
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

  private setInputSpeechState(state: InputSpeechState): void {
    this.inputSpeechState = state;
    this.speechStateChangedHandler?.(state);
  }
  private inputSpeechState: InputSpeechState = 'idle';
  getInputSpeechState(): InputSpeechState {
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

  private speechStateChangedHandler?: (state: InputSpeechState) => void;
  onInputSpeechStateChanged(handler?: ((state: "speaking" | "idle") => void)): void {
    this.speechStateChangedHandler = handler;
  }

  private listeningStateChangedHandler?: (state: ListeningState) => void;
  onListeningStateChanged(handler?: ((state: ListeningState) => void)): void {
    this.listeningStateChangedHandler = handler;
  }
}
