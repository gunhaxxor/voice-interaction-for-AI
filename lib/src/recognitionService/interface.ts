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

  /**
   * VAD stands for Voice Activity Detection.
   * Represents whether the user is speaking or not.
   */
  getVADState?(): VADState;

  /**
   * 
   * Attach callback to get input speech state changes. Input speech state represents 
   * whether the user is speaking or not
   */
  onVADStateChanged?(handler?: ((state: 'speaking' | 'idle') => void)): void;
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

export class RecognitionServiceCallbackHandling implements Pick<RecognitionService, 'onError'
  | 'getListeningState'
  | 'onListeningStateChanged'
  | 'getVADState'
  | 'onVADStateChanged'
  | 'onTextReceived'
  | 'onInterimTextReceived'
> {
  protected errorHandler?: (error: Error) => void
  onError(errorHandler: (error: Error) => void): void {
    this.errorHandler = errorHandler;
  }

  protected listeningState: ListeningState = 'inactive'
  public getListeningState(): ListeningState {
    return this.listeningState;
  }
  protected setListeningState(state: ListeningState): void {
    this.listeningState = state;
    this.listeningStateChangedHandler?.(state);
  }

  protected listeningStateChangedHandler?: (state: ListeningState) => void
  public onListeningStateChanged(handler?: ((state: ListeningState) => void)): void {
    this.listeningStateChangedHandler = handler;
  }


  protected VADState: VADState = 'idle'
  public getVADState(): VADState {
    return this.VADState;
  }
  protected setVADState(state: VADState): void {
    this.VADState = state;
    this.VADStateChangedHandler?.(state);
  }
  protected VADStateChangedHandler?: (state: VADState) => void
  onVADStateChanged(handler?: ((state: VADState) => void)): void {
    this.VADStateChangedHandler = handler;
  }

  protected textReceivedHandler?: (text: string) => void
  onTextReceived(handler?: ((text: string) => void)): void {
    this.textReceivedHandler = handler;
  }

  protected interimTextReceivedHandler?: (text: string) => void
  onInterimTextReceived(handler?: ((text: string) => void)): void {
    this.interimTextReceivedHandler = handler;
  }
}