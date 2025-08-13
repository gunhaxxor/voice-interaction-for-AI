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
  /** If user speaks continuously for this long, flush even if VAD doesn't detect a pause */
  maxUtteranceMs?: number
}

export class WhisperRecognitionService extends RecognitionServiceCallbackHandling implements RecognitionService {
  private options: WhisperRecognitionServiceOptions;
  private vad?: Awaited<ReturnType<typeof MicVAD.new>>;
  private openai: OpenAI;

  // Accumulation state
  private readonly SAMPLE_RATE = 16000; // vad-web outputs 16kHz
  private audioBuffer: Float32Array | null = null;
  // Only accumulate audio after speech start, not after flush/silence
  private shouldAccumulateBuffer: boolean = false;


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
      // minChunkSec: 3,
      // graceMs: 1200,
      // maxUtteranceMs: 7000,
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
  private async sendAudioBuffer(audio: Float32Array, force: boolean = false) {

    const minSec = this.options.minChunkSec!;
    const ready = this.durSec(audio) >= minSec;

    if (!force && !ready) return;

    console.log('Flushing audioBuffer:', audio.length, 'samples,', this.durSec(audio).toFixed(2), 'seconds');

    const wavBuffer = utils.encodeWAV(audio);
    this.audioBuffer = null;          // prevent double-send
    this.shouldAccumulateBuffer = false; // buffer is now fresh after flush

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

  private VADonSpeechEndHandler = async (audio: Float32Array) => {
    this.speechEndHandler?.();
    await this.sendAudioBuffer(audio, true);
  }

  // Accumulate audio frames and update VAD state
  private VADonFramesProcessedHandler = (probs: SpeechProbabilities, audio: Float32Array) => {
  // Accumulate audio frames in real time
  // if (audio && this.shouldAccumulateBuffer) {
  //   this.audioBuffer = this.audioBuffer ? this.concatAudio(this.audioBuffer, audio) : audio;
  // }
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
      redemptionFrames: 10,       // nr of silent frames before considered speechend
      minSpeechFrames: 2,         // min speech frames are discarded, so keep low so single words aren’t discarded
      onSpeechStart: () => {
        // new speech incoming — avoid mid-utterance grace flush
        // this.clearGraceTimer();
        // this.clearMaxUtteranceTimer();
        // this.hold = null; // Always clear buffer at start of utterance
        // this.shouldAccumulateBuffer = true; // Start accumulating
        // this.scheduleMaxUtteranceFlush();
        // this.speechStartHandler?.();
        // 
        console.log('Speech started');
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
    // this.clearGraceTimer();
    // this.clearMaxUtteranceTimer();

    // Force-flush remaining audio (even if under min)
    // await this.sendAudioBuffer(true);
  }

  supportsSpeechState(): boolean { return true; }
  supportsVADState(): boolean { return true; }
}
