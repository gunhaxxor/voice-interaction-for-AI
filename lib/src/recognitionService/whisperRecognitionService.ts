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
  /** If nothing new is appended within this time, flush even if under minChunkSec */
  graceMs?: number
}

export class WhisperRecognitionService extends RecognitionServiceCallbackHandling implements RecognitionService {
  private options: WhisperRecognitionServiceOptions;
  private vad?: Awaited<ReturnType<typeof MicVAD.new>>;
  private openai: OpenAI;

  // Accumulation state
  private readonly SAMPLE_RATE = 16000; // vad-web outputs 16kHz
  private hold: Float32Array | null = null;

  // Grace timer state
  private graceTimer: number | null = null;

  private concatAudio(a: Float32Array, b: Float32Array) {
    const out = new Float32Array(a.length + b.length);
    out.set(a, 0); out.set(b, a.length);
    return out;
  }
  private durSec(a: Float32Array) { return a.length / this.SAMPLE_RATE; }

  private clearGraceTimer() {
    if (this.graceTimer) {
      clearTimeout(this.graceTimer as unknown as number);
      this.graceTimer = null;
    }
  }

  private scheduleGraceFlush() {
    this.clearGraceTimer();
    const ms = this.options.graceMs!;
    this.graceTimer = setTimeout(() => {
      void this.flushHold(true); // force flush even if under min
    }, ms) as unknown as number;
  }

  constructor(options?: WhisperRecognitionServiceOptions | OpenAI) {
    super();
    const defaultOptions = {
      url: 'https://api.openai.com/v1/',
      key: 'nokeyset',
      model: 'KBLab/kb-whisper-medium',
      mode: 'transcribe',
      minChunkSec: 3,
      graceMs: 1200,
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
  private async flushHold(force: boolean) {
    if (!this.hold) return;

    const minSec = this.options.minChunkSec!;
    const ready = this.durSec(this.hold) >= minSec;

    if (!force && !ready) return;

    const wavBuffer = utils.encodeWAV(this.hold);
    this.hold = null;          // prevent double-send
    this.clearGraceTimer();    // no pending flush after we send

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

  // Accumulate and either send immediately (>= min) or schedule grace flush
  private VADonSpeechEndHandler = async (audio: Float32Array<ArrayBufferLike>) => {
    this.speechEndHandler?.();

    const seg = audio as unknown as Float32Array;
    this.hold = this.hold ? this.concatAudio(this.hold, seg) : seg;

    if (this.durSec(this.hold) >= this.options.minChunkSec!) {
      await this.flushHold(false); // send now
      return;
    }

    // Not long enough yet — arm/reset grace timer
    this.scheduleGraceFlush();
  }

  private VADonFramesProcessedHandler = (probs: SpeechProbabilities) => {
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
        // new speech incoming — avoid mid-utterance grace flush
        this.clearGraceTimer();
        this.speechStartHandler?.();
      },
      onSpeechEnd: this.VADonSpeechEndHandler,
      onFrameProcessed: this.VADonFramesProcessedHandler,
    });

    this.vad.start();
    this.setListeningState('listening');
  }

  async stopListenAudio(): Promise<void> {
    this.vad?.destroy();
    this.setListeningState('inactive');
    this.clearGraceTimer();

    // Force-flush remaining audio (even if under min)
    await this.flushHold(true);
  }

  supportsSpeechState(): boolean { return true; }
  supportsVADState(): boolean { return true; }
}
