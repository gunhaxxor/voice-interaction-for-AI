import type { ListeningState, RecognitionService, RecognitionServiceListenOptions, VADState } from './interface';
import * as RecognitionTypes from './recognitionTypes';

export class WebRecognitionService implements RecognitionService {
  private recognition: RecognitionTypes.SpeechRecognition;
  private defaultListenOptions?: RecognitionServiceListenOptions;
  private listeningTargetState: ListeningState = 'inactive';

  constructor(options?: RecognitionServiceListenOptions) {
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
  async startListenAudio(options?: RecognitionServiceListenOptions) {
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
  private setListeningState(state: ListeningState): void {
    this.listeningState = state;
    this.listeningStateChangedHandler?.(state);
  }
  private listeningStateChangedHandler?: (state: ListeningState) => void;
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


  // Unfortunately the browser api is not working correctly with the onSpeechStart and onSpeechEnd events.
  // Thus VADState is not supported at the moment.
  supportsVADState(): boolean {
    return false;
  }

  private VADState: VADState = 'idle';
  getVADState(): VADState {
    return this.VADState;
  }
  private setVADState(state: VADState): void {
    this.VADState = state;
    this.VADStateChangedHandler?.(state);
  }
  private VADStateChangedHandler?: (state: VADState) => void;
  onVADStateChanged(handler?: ((state: "speaking" | "idle") => void)): void {
    this.VADStateChangedHandler = handler;
  }

}