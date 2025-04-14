import type { SpeechProbabilities } from "@ricky0123/vad-web/dist/models";
import { type STTService, type STTServiceListenOptions } from "./recognitionService";
import { MicVAD, utils } from '@ricky0123/vad-web';


import { getRandomSentence } from '@/tests/testManuscript'

export interface WhisperRecognitionServiceOptions {
  url: string,
  key: string,
}

export class WhisperRecognitionService implements STTService {
  private options:WhisperRecognitionServiceOptions;
  private vad?: Awaited<ReturnType<typeof MicVAD.new>>;

  constructor(options?: WhisperRecognitionServiceOptions){
    const defaultOptions: WhisperRecognitionServiceOptions = {
      url: 'https://api.openai.com/v1/audio/transcriptions',
      key: 'nokeyset',
    }
    this.options = {...defaultOptions, ...options}
  }
  
  private VADonSpeechEndHandler = (audio: Float32Array<ArrayBufferLike>) => {
    this.textReceivedHandler?.(getRandomSentence());
  }
  private VADonFramesProcessedHandler = (probs: SpeechProbabilities, frame: Float32Array<ArrayBufferLike>) => {
    console.log('vad frame processed. speech prob:', probs.isSpeech);
    if(!this.vad) return;
    if (probs.isSpeech > this.vad?.options.positiveSpeechThreshold) {
      this.setInputSpeechState('speaking');
    } else {
      this.setInputSpeechState('idle');
    }
  }
  async startListenAudio(options?: STTServiceListenOptions){
    this.vad = await MicVAD.new({
      model: 'v5',
      frameSamples: 512,
      // frames to wait before triggering endSpeech
      redemptionFrames: 6,
      minSpeechFrames: 2,
      onSpeechStart() {
        console.log('speech start');
      },
      onSpeechEnd: this.VADonSpeechEndHandler,
      onFrameProcessed: this.VADonFramesProcessedHandler,
    });


    this.vad.start();
    this.setListeningState('listening');
  }
  
  stopListenAudio(): void {
    this.vad?.destroy();
    this.setListeningState('inactive')
  }
  
  private listeningState: "listening" | "inactive" = "inactive"
  private setListeningState(state: "listening" | "inactive"): void {
    this.listeningState = state;
    this.listeningStateChangedHandler?.(state);
  }
  getListeningState(): "listening" | "inactive" {
    return this.listeningState
  }

  private listeningStateChangedHandler?: ((state: "listening" | "inactive") => void)
  onListeningStateChanged(handler?: ((state: "listening" | "inactive") => void)): void {
    this.listeningStateChangedHandler = handler;
  }
  
  private inputSpeechState: "speaking" | "idle" = "idle"
  getInputSpeechState(): "speaking" | "idle" {
    return this.inputSpeechState
  }

  private setInputSpeechState(state: "speaking" | "idle"): void {
    this.inputSpeechState = state;
    this.inputSpeechStateChangedHandler?.(state);
  }

  private inputSpeechStateChangedHandler?: ((state: "speaking" | "idle") => void)
  onInputSpeechStateChanged(handler?: ((state: "speaking" | "idle") => void)): void {
    this.inputSpeechStateChangedHandler = handler;
  }
  
  private textReceivedHandler?: ((text: string) => void)
  onTextReceived(handler?: ((text: string) => void)): void {
    this.textReceivedHandler = handler;
  }
  
  private interimTextReceivedHandler?: ((text: string) => void)
  onInterimTextReceived(handler?: ((text: string) => void)): void {
    this.interimTextReceivedHandler = handler;
  }
  
  private errorHandler?: (error: Error) => void
  onError(errorHandler: (error: Error) => void): void {
    this.errorHandler = errorHandler;
  }
  
}