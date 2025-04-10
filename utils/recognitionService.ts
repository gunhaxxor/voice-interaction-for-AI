interface STTServiceListenOptions {
  lang?: PossibleLanguages
}

type ListeningState = 'listening' | 'inactive';
export interface STTService {
  startListenAudio(options?: STTServiceListenOptions): Promise<void>;
  stopListenAudio(): void;
  getListeningState(): ListeningState;
  // getTranscript(): string;
  onListeningStateChanged(handler?: ((state: ListeningState) => void)): void;
  onTextReceived(handler?: ((text: string) => void)): void;
  onInterimTextReceived(handler?: ((text: string) => void)): void;
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
      }
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
}

export class MockSTTService implements STTService {
  private readonly randomTexts = [
    'Hello!',
    // 'How are you?',
    // 'I am fine',
    // 'I am not fine',
    // 'I like big butts and I cannot lie',
    // 'How about next year?'
  ]
  private currentInterval = 0;
  async startListenAudio() {
    console.log('startListening audio');
    // clear previous interval if is set
    if (this.currentInterval) clearInterval(this.currentInterval);

    this.currentInterval = setInterval(() => {
      console.log('setting interval');
      this.interimTextReceivedHandler?.('Hel');
      this.textReceivedHandler?.('Hello!');
    }, 100);

    return Promise.resolve();
  }
  stopListenAudio(): void {
    console.log('stopListening audio');
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
}
