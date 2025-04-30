export interface STTServiceListenOptions {
  /**
   * Language to recognize. Either ISO6391 or BCP47 (or both) depending on the implementation
   */
  lang?: PossibleLanguagesBCP47 | PossibleLanguagesISO6391
}

/**
 * Represents whether the recognition service is listening to incoming audio or not
 */
type ListeningState = 'listening' | 'inactive';

/**
 * VAD stands for Voice Activity Detection.
 * Represents whether the user is speaking or not.
 */
type VADState = 'speaking' | 'idle';

/**
 * VAD stands for Voice Activity Detection.
 * This state overrides whether the input audio is considered speech or not.
 * unset = no override
 */
type VADOverrideState = 'unset' | VADState;
export interface STTService {
  /**
   * 
   * Attach callback to get any error happening within this recognition implementation
   */
  onError(errorHandler: (error: Error) => void): void;
  /**
   * 
   * @param {STTServiceListenOptions} options - Listening options
   */
  startListenAudio(options?: STTServiceListenOptions): Promise<void>;
  /**
   * Stops listening to audio.
   * Does not kill the recognition service. Implementations should allow to start again after stopping
   */
  stopListenAudio(): void;

  getListeningState(): ListeningState;
  /**
   * 
   * Attach callback to get listening state changes. Listening state represents 
   * whether the recognition service is listening to incoming audio or not
   */
  onListeningStateChanged(handler?: ((state: ListeningState) => void)): void;

  getVADState(): VADState;

  /**
   * 
   * Attach callback to get input speech state changes. Input speech state represents 
   * whether the user is speaking or not
   */
  onVADStateChanged(handler?: ((state: 'speaking' | 'idle') => void)): void;
  /**
   * 
   * Manually override the Voice Activity Detection. This is optional to implement but 
   * is recommended if the underlying api allows. 
   * The most common use case for this function is to react to the output of a TTS engine and dynamically set the state
   * between `speaking` and `unset`. This is done to mitigate that the system recognizes it's own voice as speech
   * @param {VADOverrideState} state - Voice Activity Detection state
   */
  setVADOverride?(state: VADOverrideState): void;
  /**
   * 
   * Manually release the Voice Activity Detection override.
   * Equivalent to calling `setVADOverride('unset')`
   */
  releaseVADOverride?(): void;

  onTextReceived(handler?: ((text: string) => void)): void;
  onInterimTextReceived(handler?: ((text: string) => void)): void;
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
    this.recognition.onsoundend = () => {
      console.log('WebRecognitionService:sound ended');
      this.setVADState('idle');
    }
    this.recognition.onsoundstart = () => {
      console.log('WebRecognitionService:sound started');
      this.setVADState('speaking');
    }
    this.recognition.onspeechstart = () => {
      console.log('WebRecognitionService:speech started');
      this.setVADState('speaking');
    }
    this.recognition.onspeechend = () => {
      console.log('WebRecognitionService:speech ended');
      this.setVADState('idle');
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
      this.VADState = 'idle';
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

  getVADState(): VADState {
    return this.VADState;
  }

  private VADState: VADState = 'idle';
  private setVADState(state: VADState): void {
    this.VADState = state;
    this.VADStateChangedHandler?.(state);
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

  private VADStateChangedHandler?: (state: VADState) => void;
  onVADStateChanged(handler?: ((state: "speaking" | "idle") => void)): void {
    this.VADStateChangedHandler = handler;
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
