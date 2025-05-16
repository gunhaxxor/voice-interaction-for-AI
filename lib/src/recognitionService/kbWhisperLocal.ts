import type { SpeechProbabilities } from "@ricky0123/vad-web/dist/models";
import {
  type RecognitionService,
  type RecognitionServiceListenOptions
} from './interface';

import { MicVAD, utils } from '@ricky0123/vad-web';
import { pipeline, env, AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';

export interface kbWhisperLocalOptions extends RecognitionServiceListenOptions {
  lang?: string;
}

export class kbWhisperlocal implements RecognitionService {
  private options?: kbWhisperLocalOptions;
  private vad?: Awaited<ReturnType<typeof MicVAD.new>>;
  private transcriber?: AutomaticSpeechRecognitionPipeline;

  private listeningState: "listening" | "inactive" = "inactive";
  private inputSpeechState: "speaking" | "idle" = "idle";

  constructor(options?: kbWhisperLocalOptions) {
    this.options = options;
  }

  private async loadTranscriber() {
    env.allowLocalModels = false;
    this.transcriber = await pipeline(
      'automatic-speech-recognition',
      // 'Xenova/whisper-tiny',
      'KBLab/kb-whisper-small',
      {
        // local_files_only: false,
        dtype: 'q4',
        device: 'webgpu',
      }
    ) 
  }
  
  private aggregateAudioBuffer: Float32Array<ArrayBufferLike> | undefined;
  addToAggregateAudioBuffer(audio: Float32Array<ArrayBufferLike>) {
    if (!this.aggregateAudioBuffer) {
      this.aggregateAudioBuffer = audio;
    } else {
      const tempArray = new Float32Array(this.aggregateAudioBuffer.length + audio.length);
      tempArray.set(this.aggregateAudioBuffer, 0);
      tempArray.set(audio, this.aggregateAudioBuffer.length);
      this.aggregateAudioBuffer = tempArray;
    }
    return this.aggregateAudioBuffer;
  }

  private whisperIsBusy = false;
  async processAggregateAudioBuffer() {
    if (!this.aggregateAudioBuffer) return;
    if (!this.transcriber) {
      console.error('Transcriber not loaded, call loadTranscriber() first');
      return;
    }
    console.log('Processing aggregate audio buffer');
    this.whisperIsBusy = true;
    const toTranscription = this.aggregateAudioBuffer;
    this.aggregateAudioBuffer = undefined;
    const result = await this.transcriber(toTranscription, {
      chunk_length_s: 10,
      stride_length_s: 3,
      return_timestamps: false,
      language: this.options?.lang || 'sv'
    });
    console.log('Transcription result:', result);
    if (!result) {
      console.error('No result from whisper');
      return;
    }
    if (Array.isArray(result)) {
      result.forEach((r) => {
        this.textReceivedHandler?.(r.text);
      })
    } else {
      this.textReceivedHandler?.(result.text);
    }
    this.whisperIsBusy = false;
    if (this.aggregateAudioBuffer) {
      await this.processAggregateAudioBuffer();
    }
  }
  // TODO: Find a way to handle that whisper doesnt like short audio input, like one word or such.
  private VADonSpeechEndHandler = async (audio: Float32Array<ArrayBufferLike>) => {
    console.log('VAD detected end of speech');
    this.addToAggregateAudioBuffer(audio);
    if (!this.whisperIsBusy) {
      await this.processAggregateAudioBuffer();
    }

  }

  private VADonFramesProcessedHandler = (probs: SpeechProbabilities) => {
    if (!this.vad) return;
    const threshold = this.vad.options.positiveSpeechThreshold;
    const state = probs.isSpeech > threshold ? 'speaking' : 'idle';
    this.setInputSpeechState(state);
  }

  async startListenAudio() {
    this.vad = await MicVAD.new({
      model: 'v5',
      frameSamples: 512,
      redemptionFrames: 8,
      minSpeechFrames: 2,
      onSpeechStart() {
        console.log('Speech started');
      },
      onSpeechEnd: this.VADonSpeechEndHandler,
      onFrameProcessed: this.VADonFramesProcessedHandler,
    });

    this.vad.start();
    this.setListeningState('listening');
    console.log('Microphone listening started');
    if(!this.transcriber) {
      await this.loadTranscriber();
    }
  }

  stopListenAudio(): void {
    this.vad?.destroy();
    this.setListeningState('inactive');
    console.log('Microphone listening stopped');
  }

  private setListeningState(state: "listening" | "inactive") {
    this.listeningState = state;
    this.listeningStateChangedHandler?.(state);
  }

  getListeningState(): "listening" | "inactive" {
    return this.listeningState;
  }

  private listeningStateChangedHandler?: (state: "listening" | "inactive") => void;
  onListeningStateChanged(handler?: (state: "listening" | "inactive") => void): void {
    this.listeningStateChangedHandler = handler;
  }

  private setInputSpeechState(state: "speaking" | "idle") {
    this.inputSpeechState = state;
    this.inputSpeechStateChangedHandler?.(state);
  }
  
  supportsVADState(): boolean {
    return true;
  }

  getVADState(): "speaking" | "idle" {
    return this.inputSpeechState;
  }

  private inputSpeechStateChangedHandler?: (state: "speaking" | "idle") => void;
  onVADStateChanged(handler?: (state: "speaking" | "idle") => void): void {
    this.inputSpeechStateChangedHandler = handler;
  }

  private textReceivedHandler?: (text: string) => void;
  onTextReceived(handler?: (text: string) => void): void {
    this.textReceivedHandler = handler;
  }

  private interimTextReceivedHandler?: (text: string) => void;
  onInterimTextReceived(handler?: (text: string) => void): void {
    this.interimTextReceivedHandler = handler;
  }

  private errorHandler?: (error: Error) => void;
  onError(handler: (error: Error) => void): void {
    this.errorHandler = handler;
  }
}
