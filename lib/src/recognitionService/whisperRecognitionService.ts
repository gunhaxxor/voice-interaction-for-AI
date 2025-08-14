import type { SpeechProbabilities } from "@ricky0123/vad-web/dist/models";
import { RecognitionServiceCallbackHandling, type RecognitionService, type RecognitionServiceListenOptions, type VADState } from "./interface";
import { MicVAD, utils } from '@ricky0123/vad-web';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import type { PossibleLanguagesISO6391, StringWithSuggestedLiterals } from "../utilityTypes";

export interface WhisperRecognitionServiceOptions extends RecognitionServiceListenOptions {
  url?: string,
  key?: string,
  model?: StringWithSuggestedLiterals<
    'KBLab/kb-whisper-medium' |
    'KBLab/kb-whisper-large' |
    'Systran/faster-whisper-medium' |
    'whisper-1' |
    'Systran/faster-whisper-large-v3'
  >,
  lang?: PossibleLanguagesISO6391,
  mode?: 'translate' | 'transcribe',
  /** Only send to Whisper once accumulated audio >= this many seconds */
  minChunkSec?: number,
  /** If under minChunkSec, wait this many seconds before sending anyway */
  secToWaitBeforeSendingSmallChunk?: number, 
  /** If buffer grows to this many seconds, flush even if speech hasn't ended */
  maxChunkSec?: number
}

export class WhisperRecognitionService extends RecognitionServiceCallbackHandling implements RecognitionService {
  private options: WhisperRecognitionServiceOptions;
  private vad?: Awaited<ReturnType<typeof MicVAD.new>>;
  private openai: OpenAI;

  // Accumulation state
  private readonly SAMPLE_RATE = 16000; // vad-web outputs 16kHz
  private readonly FRAMESAMPLES = 512; // 512 samples per frame
  private audioBuffer: Float32Array | null = null;
  // Only accumulate audio after speech start, not after flush/silence
  private shouldAccumulateBuffer: boolean = false;


  private concatAudio(a: Float32Array, b: Float32Array) {
    const out = new Float32Array(a.length + b.length);
    out.set(a, 0); out.set(b, a.length);
    return out;
  }
  private durSecOfBuffer(a: Float32Array) { return a.length / this.SAMPLE_RATE; }
  private samplesToSec(samples: number) {
    return samples / this.SAMPLE_RATE;
  }
  private secToFrames(sec: number) {
    return Math.round(sec * this.SAMPLE_RATE / this.FRAMESAMPLES);
  }

  constructor(options?: WhisperRecognitionServiceOptions | OpenAI) {
    super();
    const defaultOptions = {
      url: 'https://api.openai.com/v1/',
      key: 'nokeyset',
      model: 'KBLab/kb-whisper-medium',
      mode: 'transcribe',
      minChunkSec: 2,
      secToWaitBeforeSendingSmallChunk: 1,
      maxChunkSec: undefined, // no max chunk by default
    } satisfies WhisperRecognitionServiceOptions;

    if (options instanceof OpenAI) {
      this.openai = options;
      this.options = defaultOptions;
      return;
    }

    this.options = { ...defaultOptions, ...options };

    this.openai = new OpenAI({
      dangerouslyAllowBrowser: true,
      apiKey: this.options.key,
      baseURL: this.options.url,
    });
  }

  // Centralized send path: if force=false, send only if >= minChunkSec; if force=true, send whatever is buffered
  private async sendAudioBuffer() {
    if (!this.audioBuffer || this.durSecOfBuffer(this.audioBuffer) === 0) {
      console.warn('No audio to send, skipping flush');
      return;
    }
    console.log('Sending audioBuffer:', this.audioBuffer.length, 'samples,', this.durSecOfBuffer(this.audioBuffer).toFixed(2), 'seconds');

    const wavBuffer = utils.encodeWAV(this.audioBuffer);
    this.audioBuffer = null;
    const file = await toFile(wavBuffer);
    try {
      if (this.options.mode === 'transcribe') {
        const text = await this.openai.audio.transcriptions.create({
          model: this.options.model!,
          file,
          stream: true,
          language: this.options.lang,
        });
        for await (const chunk of text) {
          if (chunk.type === 'transcript.text.delta') {
            this.interimTextReceivedHandler?.(chunk.delta);
          } else {
            this.textReceivedHandler?.(chunk.text);
          }
        }
      } else {
        const text = await this.openai.audio.translations.create({
          model: this.options.model!,
          file,
        });
        this.textReceivedHandler?.(text.text);
      }
    } finally {
      // Optionally, log or emit an event here if you want to monitor
      console.log('Response received');
    }
  }

  private prematureBufferLength: number | null = null;

  private VADonSpeechStartHandler = () => {
    this.shouldAccumulateBuffer = true; // If not already accumulating, start accumulating audio
    this.prematureBufferLength = null; // Reset premature buffer length
    console.log('Speech started');
  }

  private VADonSpeechEndHandler = async () => {
    const minSec = this.options.minChunkSec!;

    if (this.audioBuffer && this.durSecOfBuffer(this.audioBuffer) <= minSec) {
      this.prematureBufferLength = this.audioBuffer.length;
      console.log('Premature buffer (', this.prematureBufferLength, ') not sending:', this.durSecOfBuffer(this.audioBuffer).toFixed(2), 'seconds');

      return; // Don't send if under minChunkSec
    } else {
      this.speechEndHandler?.();
      this.shouldAccumulateBuffer = false; // dont start accumulating again until next speech start
      await this.sendAudioBuffer();
    }
  }

  // Accumulate audio frames and update VAD state
  private VADonFramesProcessedHandler = async (probs: SpeechProbabilities, audio: Float32Array) => {
    if (probs.isSpeech > this.vad!.options.positiveSpeechThreshold) {
      this.setVADState('speaking');
    } else {
      this.setVADState('idle');
    }
    if (this.audioBuffer && this.prematureBufferLength !== null) {
      const secSinceFalseSpeechEnd = this.samplesToSec(this.audioBuffer.length - this.prematureBufferLength!);
      if (secSinceFalseSpeechEnd >= this.options.secToWaitBeforeSendingSmallChunk!) {
        this.prematureBufferLength = null;
        this.shouldAccumulateBuffer = false; // Reset accumulation state
        await this.sendAudioBuffer();
      }
    }

    // Accumulate audio frames in real time
    if (!this.shouldAccumulateBuffer) {
      console.log('Skipping audio accumulation, not in accumulation mode');
      return;
    }
    this.audioBuffer = this.audioBuffer ? this.concatAudio(this.audioBuffer, audio) : audio;
    const maxSec = this.options.maxChunkSec;
    if (maxSec && this.durSecOfBuffer(this.audioBuffer) >= maxSec) {
      // Flush immediately if buffer exceeds maxChunkSec
      this.sendAudioBuffer();
      return;
    }
  }

  async startListenAudio(options?: RecognitionServiceListenOptions){
    this.vad = await MicVAD.new({
      model: 'v5',
      frameSamples: this.FRAMESAMPLES,          // silero v5
      // Express in seconds instead of frames
      redemptionFrames: this.secToFrames(0.5), // 0.5 seconds of silence before considered speechend
      minSpeechFrames: this.secToFrames(0.05), // 0.05 seconds minimum speech (keep low so single words aren’t discarded)
      onSpeechStart: this.VADonSpeechStartHandler,
      onSpeechEnd: this.VADonSpeechEndHandler,
      onFrameProcessed: this.VADonFramesProcessedHandler,
    });

    this.vad.start();
    this.setListeningState('listening');
  }

  async stopListenAudio(): Promise<void> {
    this.vad?.destroy();
    this.setListeningState('inactive');
    // Force-flush remaining audio (even if under min)
    await this.sendAudioBuffer();
  }

  supportsSpeechState(): boolean { return true; }
  supportsVADState(): boolean { return true; }
}
