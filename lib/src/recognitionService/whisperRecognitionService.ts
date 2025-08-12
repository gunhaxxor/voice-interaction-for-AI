import type { SpeechProbabilities } from "@ricky0123/vad-web/dist/models";
import { RecognitionServiceCallbackHandling, type RecognitionService, type RecognitionServiceListenOptions, type VADState } from "./interface";
import { MicVAD, utils } from '@ricky0123/vad-web';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import type { PossibleLanguagesISO6391, StringWithSuggestedLiterals } from "../utilityTypes";

export interface WhisperRecognitionServiceOptions extends RecognitionServiceListenOptions {
  url?: string,
  key?: string,
  model?: StringWithSuggestedLiterals<'KBLab/kb-whisper-medium' | 'KBLab/kb-whisper-large' | 'Systran/faster-whisper-medium' | 'whisper-1' | 'Systran/faster-whisper-large-v3'>,
  lang?: PossibleLanguagesISO6391,
  mode?: 'translate' | 'transcribe',
  /** Only send to Whisper once accumulated audio >= this many seconds */
  minChunkSec?: number
}

export class WhisperRecognitionService extends RecognitionServiceCallbackHandling implements RecognitionService {
  private options: WhisperRecognitionServiceOptions;
  private vad?: Awaited<ReturnType<typeof MicVAD.new>>;
  private openai: OpenAI;

  // --- NEW: accumulation state ---
  private readonly SAMPLE_RATE = 16000;               // vad-web outputs 16kHz
  private hold: Float32Array | null = null;           // accumulated audio

  private concatAudio(a: Float32Array, b: Float32Array) {
    const out = new Float32Array(a.length + b.length);
    out.set(a, 0); out.set(b, a.length);
    return out;
  }
  private durSec(a: Float32Array) { return a.length / this.SAMPLE_RATE; }

  constructor(options?: WhisperRecognitionServiceOptions | OpenAI) {
    super();
    const defaultOptions = {
      url: 'https://api.openai.com/v1/',
      key: 'nokeyset',
      model: 'KBLab/kb-whisper-medium',
      mode: 'transcribe',
      minChunkSec: 3, // --- NEW default ---
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

  // --- CHANGED: accumulate and only send when long enough ---
  private VADonSpeechEndHandler = async (audio: Float32Array<ArrayBufferLike>) => {
    this.speechEndHandler?.();

    const seg = audio as unknown as Float32Array; // keep as Float32Array@16k
    this.hold = this.hold ? this.concatAudio(this.hold, seg) : seg;

    if (this.durSec(this.hold) < (this.options.minChunkSec!)) {
      // Not long enough yet—just keep holding
      return;
    }

    // Long enough → encode & send, then reset
    const wavBuffer = utils.encodeWAV(this.hold);
    this.hold = null;

    const file = await toFile(wavBuffer);
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

  }

  private VADonFramesProcessedHandler = (probs: SpeechProbabilities, frame: Float32Array<ArrayBufferLike>) => {
    if (!this.vad) return;
    if (probs.isSpeech > this.vad.options.positiveSpeechThreshold) {
      this.setVADState('speaking');
    } else {
      this.setVADState('idle');
    }
  }

  async startListenAudio(options?: RecognitionServiceListenOptions){
    this.vad = await MicVAD.new({
      model: 'v5',
      frameSamples: 512,          // silero v5
      redemptionFrames: 30,       // brief pauses stay inside a segment
      minSpeechFrames: 4,         // keep low so single words aren’t discarded
      onSpeechStart: () => {
        this.speechStartHandler?.();
      },
      onSpeechEnd: this.VADonSpeechEndHandler,
      onFrameProcessed: this.VADonFramesProcessedHandler,
    });

    this.vad.start();
    this.setListeningState('listening');
  }

  // --- CHANGED: flush any leftover audio on stop so nothing is lost ---
  async stopListenAudio(): Promise<void> {
    this.vad?.destroy();
    this.setListeningState('inactive');

    if (this.hold && this.hold.length > 0) {
      const wavBuffer = utils.encodeWAV(this.hold);
      this.hold = null;

      const file = await toFile(wavBuffer);
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
    }
  }
}
