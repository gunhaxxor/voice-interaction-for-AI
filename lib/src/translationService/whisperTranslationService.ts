import type { SpeechProbabilities } from "@ricky0123/vad-web/dist/models";
import { type RecognitionService, type RecognitionServiceListenOptions } from "../recognitionService/interface";
import { MicVAD, utils } from '@ricky0123/vad-web';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import type { PossibleLanguagesISO6391, StringWithSuggestedLiterals } from "../utilityTypes";

export interface WhisperTranslationServiceOptions extends Omit<RecognitionServiceListenOptions, 'lang'> {
  url?: string,
  key?: string,
  model?: StringWithSuggestedLiterals<'Systran/faster-whisper-large-v3' | 'Systran/faster-whisper-medium' | 'whisper-1'>,
}

/**
 * Translates audio into english text. 
 **/
export class WhisperTranslationService implements RecognitionService {
  private options: WhisperTranslationServiceOptions;
  private vad?: Awaited<ReturnType<typeof MicVAD.new>>;
  private openai: OpenAI;

  constructor(options?: WhisperTranslationServiceOptions | OpenAI) {
    const defaultOptions: WhisperTranslationServiceOptions = {
      url: 'https://api.openai.com/v1/',
      key: 'nokeyset',
      model: 'Systran/faster-whisper-large-v3',
    }

    if (options instanceof OpenAI) {
      this.openai = options;
      this.options = defaultOptions;
      return;
    }

    this.options = { ...defaultOptions, ...options }

    this.openai = new OpenAI({
      dangerouslyAllowBrowser: true,
      apiKey: this.options.key,
      baseURL: this.options.url,
    })
  }

  private VADonSpeechEndHandler = async (audio: Float32Array<ArrayBufferLike>) => {
    try {

      const wavBuffer = utils.encodeWAV(audio);

      const file = await toFile(wavBuffer);

      const text = await this.openai.audio.translations.create({
        model: this.options.model!,
        // model: 'Systran/faster-whisper-large-v3',
        // model: 'Systran/faster-whisper-medium',
        // model: 'deepdml/faster-distil-whisper-large-v3.5',
        // model: 'KBLab/kb-whisper-medium',
        file,
      });

      this.textReceivedHandler?.(text.text);
    } catch (error) {
      this.errorHandler?.(error as Error);
    }
  }
  // private interimRawAudio: Array<number> = [];
  // private framesThreshold = utils.minFramesForTargetMS(3000, 512, 16000);
  private VADonFramesProcessedHandler = (probs: SpeechProbabilities, frame: Float32Array<ArrayBufferLike>) => {
    // for(let i = 0; i < frame.length; i++){
    //   const val = frame[i];
    //   this.interimRawAudio.push(val);
    // }

    if (!this.vad) return;
    if (probs.isSpeech > this.vad?.options.positiveSpeechThreshold) {
      this.setInputSpeechState('speaking');
    } else {
      this.setInputSpeechState('idle');
    }
  }

  async startListenAudio(options?: RecognitionServiceListenOptions) {
    try {
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
    } catch (error: unknown) {
      this.errorHandler?.(error as Error);
    }
  }

  stopListenAudio(): void {
    try {
      this.vad?.destroy();
      this.setListeningState('inactive')
    } catch (error: unknown) {
      this.errorHandler?.(error as Error);
    }
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
  getVADState(): "speaking" | "idle" {
    return this.inputSpeechState
  }

  private setInputSpeechState(state: "speaking" | "idle"): void {
    this.inputSpeechState = state;
    this.inputSpeechStateChangedHandler?.(state);
  }

  private inputSpeechStateChangedHandler?: ((state: "speaking" | "idle") => void)
  onVADStateChanged(handler?: ((state: "speaking" | "idle") => void)): void {
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