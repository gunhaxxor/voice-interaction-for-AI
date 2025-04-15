import OpenAI from "openai";
import { playAudio } from 'openai/helpers/audio';


interface OpenAISpeechServiceOptions extends TTSServiceSpeechOptions {
  baseUrl: string,
  apiKey: string,
  lang: PossibleLanguagesISO6391,
}

export class OpenAISpeechService implements TTSService {
  private openai: OpenAI
  
  constructor(options: OpenAISpeechServiceOptions | OpenAI) {
    if(options instanceof OpenAI) {
      this.openai = options;
      return;
    }

    this.openai = new OpenAI({
      baseURL: options.baseUrl?? 'https://api.openai.com/v1',
      apiKey: options.apiKey,
    });
  }
  
  private currentSpeech?: string
  getCurrentSpeech(): string | undefined {
    return this.currentSpeech;
  }
  private speechQueue: string[] = [];
  getPendingSpeech(): string[] {
    return this.speechQueue;
  }

  private currentAudio?: HTMLAudioElement
  private nextAudio?: HTMLAudioElement

  // TODO: make async queue deterministic. I.E. first in first out.
  async enqueueSpeech(text: string, options?: TTSServiceSpeechOptions): Promise<void> {
    if(!this.currentSpeech) {
      this.currentSpeech = text;
    }else {
      this.speechQueue.push(text);
    }

    
    const response = await this.openai.audio.speech.create({
      model: 'rhasspy/piper-voices',
      input: text,
      voice: 'sv_SE-nst-medium',
      speed: options?.speed,
    })
    
    // console.log(response);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    if(this.currentAudio) {
      this.nextAudio = audio;
    } else {
      this.currentAudio = audio;
      audio.play();
    }
    // this.currentAudio = audio;
    audio.addEventListener('play', () => {
      this.setSpeechState('speaking');
    })
    audio.addEventListener('ended', () => {
      this.currentAudio = undefined;
      if(this.nextAudio) {
        this.currentAudio = this.nextAudio;
        this.nextAudio = undefined;
        this.currentAudio.play();
      }
    })

  }
  
  private errorHandler?: (error: Error) => void
  onError(errorHandler?: (error: Error) => void): void {
    this.errorHandler = errorHandler;
  }
  
  private speechState: SpeechState = 'idle';
  private setSpeechState(newSpeechState: SpeechState): void {
    const prevSpeechState = this.speechState;
    this.speechState = newSpeechState;
    this.speechStateHandler?.(newSpeechState, prevSpeechState);
  }
  private speechStateHandler?: (newSpeechState: SpeechState, prevSpeechState: SpeechState) => void
  onSpeechStateChanged(handler?: (newSpeechState: SpeechState, prevSpeechState: SpeechState) => void): void {
    this.speechStateHandler = handler;
  }
  
  private speechQueueHandler?: (pendingSpeech: string[], currentSpeech?: string, reason?: string) => void
  onSpeechQueueUpdated(handler?: (pendingSpeech: string[], currentSpeech?: string, reason?: string) => void): void {
    this.speechQueueHandler = handler;
  }
  
}