import type { PossibleLanguagesBCP47, PossibleLanguagesISO6391 } from "../utilityTypes";

export interface RecognitionServiceListenOptions {
  /**
   * Language to recognize. Either ISO6391 or BCP47 (or both) depending on the implementation
   */
  lang?: PossibleLanguagesBCP47 | PossibleLanguagesISO6391
}

/**
 * Represents whether the recognition service is listening to incoming audio or not
 */
export type ListeningState = 'listening' | 'inactive';

/**
 * VAD stands for Voice Activity Detection.
 * Represents whether the user is speaking or not.
 */
export type VADState = 'speaking' | 'idle';

/**
 * VAD stands for Voice Activity Detection.
 * This state overrides whether the input audio is considered speech or not.
 * unset = no override
 */
export type VADOverrideState = 'unset' | VADState;
export interface RecognitionService {
  /**
   * 
   * Attach callback to get any error happening within this recognition implementation
   */
  onError(errorHandler: (error: Error) => void): void;
  /**
   * 
   * @param {RecognitionServiceListenOptions} options - Listening options
   */
  startListenAudio(options?: RecognitionServiceListenOptions): Promise<void>;
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
