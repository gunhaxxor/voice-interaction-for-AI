import type { SpeechProbabilities } from "@ricky0123/vad-web/dist/models";
import { type STTService, type STTServiceListenOptions } from "./recognitionService";
import { MicVAD, utils } from '@ricky0123/vad-web';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

export interface WhisperRecognitionServiceOptions extends STTServiceListenOptions {
  url?: string,
  key?: string,
  lang?: PossibleLanguagesISO6391
}

export class WhisperRecognitionService implements STTService {
  private options?: WhisperRecognitionServiceOptions;
  private vad?: Awaited<ReturnType<typeof MicVAD.new>>;
  private openai: OpenAI;

  constructor(options?: WhisperRecognitionServiceOptions | OpenAI) {
    if (options instanceof OpenAI) {
      this.openai = options;
      return;
    }

    const defaultOptions: WhisperRecognitionServiceOptions = {
      url: 'https://api.openai.com/v1/',
      key: 'nokeyset',
    }
    this.options = { ...defaultOptions, ...options }

    this.openai = new OpenAI({
      dangerouslyAllowBrowser: true,
      apiKey: this.options.key,
      baseURL: this.options.url,
    })
  }
  
  private VADonSpeechEndHandler = async (audio: Float32Array<ArrayBufferLike>) => {
    const wavBuffer = utils.encodeWAV(audio);

    const file = await toFile(wavBuffer);
    const text = await this.openai.audio.transcriptions.create({
      model: 'KBLab/kb-whisper-medium',
      file,
      stream: true,
      language: this.options.lang
    })
    for await (const chunk of text) {
      if (chunk.type === 'transcript.text.delta') {
        console.log('delta transcript received');
        this.interimTextReceivedHandler?.(chunk.delta);
      } else {
        this.textReceivedHandler?.(chunk.text);
      }
    }
  }
  // private interimRawAudio: Array<number> = [];
  // private framesThreshold = utils.minFramesForTargetMS(3000, 512, 16000);
  private VADonFramesProcessedHandler = (probs: SpeechProbabilities, frame: Float32Array<ArrayBufferLike>) => {
    // for(let i = 0; i < frame.length; i++){
    //   const val = frame[i];
    //   this.interimRawAudio.push(val);
    // }

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
      frameSamples: 512, //silero 5 should use 512 according to VAD-browser docs
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