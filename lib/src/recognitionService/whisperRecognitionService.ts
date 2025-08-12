import type { SpeechProbabilities } from "@ricky0123/vad-web/dist/models";
import { RecognitionServiceCallbackHandling, type RecognitionService, type RecognitionServiceListenOptions, type VADState } from "./interface";
import { MicVAD, utils } from '@ricky0123/vad-web';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import type { PossibleLanguagesISO6391, StringWithSuggestedLiterals } from "../utilityTypes";

export interface WhisperRecognitionServiceOptions extends RecognitionServiceListenOptions {
  url?: string,
  key?: string,
  model?: StringWithSuggestedLiterals<'KBLab/kb-whisper-medium' | 'KBLab/kb-whisper-large' | 'Systran/faster-whisper-medium' | 'whisper-1'>,
  lang?: PossibleLanguagesISO6391
}

export class WhisperRecognitionService extends RecognitionServiceCallbackHandling implements RecognitionService {
  private options: WhisperRecognitionServiceOptions;
  private vad?: Awaited<ReturnType<typeof MicVAD.new>>;
  private openai: OpenAI;

  constructor(options?: WhisperRecognitionServiceOptions | OpenAI) {
    super();
    const defaultOptions: WhisperRecognitionServiceOptions = {
      url: 'https://api.openai.com/v1/',
      key: 'nokeyset',
      model: 'KBLab/kb-whisper-medium',
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
    this.speechEndHandler?.();
    const wavBuffer = utils.encodeWAV(audio);

    const file = await toFile(wavBuffer);

    const text = await this.openai.audio.transcriptions.create({
      model: this.options.model!,
      // model: 'Systran/faster-whisper-large-v3',
      // model: 'Systran/faster-whisper-medium',
      // model: 'deepdml/faster-distil-whisper-large-v3.5',
      file,
      stream: true,
      language: this.options.lang
    });
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
      this.setVADState('speaking');
    } else {
      this.setVADState('idle');
    }
  }
  async startListenAudio(options?: RecognitionServiceListenOptions){
    this.vad = await MicVAD.new({
      model: 'v5',
      frameSamples: 512, //silero 5 should use 512 according to VAD-browser docs
      // frames to wait before triggering endSpeech
      redemptionFrames: 10,
      minSpeechFrames: 4,
      onSpeechStart: () => {
        console.log('speech start');
        this.speechStartHandler?.();
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
  
  supportsSpeechState(): boolean {
    return true;
  }
  
  supportsVADState(): boolean {
    return true
  }

  
}