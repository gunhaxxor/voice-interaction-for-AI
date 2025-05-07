
import { RecognitionServiceCallbackHandling, type RecognitionService, type RecognitionServiceListenOptions } from './interface';

function injectVoskletScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).loadVosklet) {
      // Already loaded
      return resolve();
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/gh/msqr1/Vosklet@1.2.1/Examples/Vosklet.js';
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

declare const loadVosklet: () => Promise<VoskletModule>;

//Not added to ts but documented on MDN
interface AudioContextOptionsWithSinkId extends AudioContextOptions {
  sinkId?: string | { type: 'none' };
}

interface VoskModel {
  findWord(word: string): number;
  delete(): void
}

interface VoskSpkModel {

}

interface VoskRecognizerEventMap {
  'result': CustomEvent<string>
  'partialResult': CustomEvent<string>
}

interface VoskRecognizer extends EventTarget {
  addEventListener<K extends keyof VoskRecognizerEventMap>(
    type: K,
    listener: (ev: VoskRecognizerEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends keyof VoskRecognizerEventMap>(
    type: K,
    listener: (ev: VoskRecognizerEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void;

  acceptWaveform(buf: Float32Array): void;
  setWords(words: boolean): void;
  setPartialWords(partialWords: boolean): void;
  setNLSM(nlsm: boolean): void;
  setMaxAlternatives(alts: number): void;
  setGrm(grm: string): void;
  setSpkModel(mdl: VoskSpkModel): void;
  // setEndpointerMode(mode: EpMode): void;
  setEndpointerDelays(tStartMax: number, tEnd: number, tMax: number): void;
  /**
   * Delete the recognizer right after it processes its current block if processCurrent is true; or after processing all remaining blocks if processCurrent is false (default: false)
   */
  delete(processCurrent?: boolean): Promise<void>;
}

interface VoskCache {

}

interface VoskTransferer extends AudioWorkletNode {
  // port: {
  //   onmessage: (ev: MessageEvent) => void
  // }
}

interface VoskletModule {
  /**
   * Create a Model or SpkModel, model files must be directly under the model root, and compressed model must be in .tar.gz/.tgz format. Tar format must be USTAR. If:
   * - path contains valid model files and id is the same, there will not be a fetch from url.
   * - path doesn't contain valid model files, or if it contains valid model files but id is different, there will be a fetch from url, and the model is stored with id. Models are thread-safe and reusable across recognizers.
   */
  createModel(url: string, path: string, id: string): Promise<VoskModel>;
  createSpkModel(url: string, path: string, id: string): Promise<VoskSpkModel>;
  createRecognizer(model: VoskModel, sampleRate: number): Promise<VoskRecognizer>;
  createRecognizerWithSpkModel(model: VoskModel, spkModel: VoskSpkModel, sampleRate: number): Promise<VoskRecognizer>;
  createRecognizerWithGrm(model: VoskModel, grammar: string, sampleRate: number): Promise<VoskRecognizer>;
  /**
   * Set log level for Kaldi messages (default: 0: Info)
   * -2: Error
   * -1: Warning
   *  1: Verbose
   *  2: More verbose
   *  3: Debug
   */
  setLogLevel(lvl: number): void;
  /**
   * A convenience function that call delete() on all objects and revoke all URLs. Run this when you're done!
   */
  cleanUp(): Promise<void>;
  getModelCache(): Promise<VoskCache>
  // EpMode:
  
  createTransferer(ctx: AudioContext, size: number): Promise<VoskTransferer>
}

export class VoskletRecognitionService extends RecognitionServiceCallbackHandling implements RecognitionService {
  private ctx: AudioContext;
  private micStream?: MediaStream;
  private micNode?: MediaStreamAudioSourceNode;
  private vosklet?: VoskletModule;
  private voskModel?: VoskModel;
  private voskRecognizer?: VoskRecognizer;
  private voskTransferer?: VoskTransferer;
  private lang?: RecognitionServiceListenOptions['lang'];
  constructor() {
    super();
    this.ctx = new AudioContext({
      sinkId: { type: 'none' }
    } as AudioContextOptionsWithSinkId);


  }
  
  private serviceLoaded = false;
  async load() {
    if(this.serviceLoaded) {
      return;
    }
    await injectVoskletScript();
    this.serviceLoaded = true;
  }

  async startListenAudio(options?: RecognitionServiceListenOptions) {
    await this.ctx.resume();
    if(!this.serviceLoaded) {
      console.log('loading service');
      await this.load();
    }
    if (!this.vosklet) {
      console.log('loading vosklet (module)');
      this.vosklet = await loadVosklet();
      this.vosklet.setLogLevel(3);

      const cache = await this.vosklet.getModelCache();
      console.log('model cache', cache);

    };
    if (!this.voskModel) {
      console.log('creating vosk model');
      this.lang = options?.lang || 'en-US';
      // const modelUrl = 'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz'
      // this.voskModel = await this.vosklet.createModel(modelUrl, 'english', 'vosk-model-small-en-us-0.15');

      const modelUrl = `${window.location.origin}/models/vosk-model-small-en-us-0.15.tar.gz`
      // const modelUrl = `/models/vosk-model-small-en-us-0.15.tar.gz`
      console.log(modelUrl);
      this.voskModel = await this.vosklet.createModel(modelUrl, 'english', 'local---vosk-model-small-en-us-0.15');


      // const modelUrl = `${window.location.origin}/models/vosk-model-small-sv-rhasspy-0.15.tar.gz`
      // console.log(modelUrl);
      // this.voskModel = await this.vosklet.createModel(modelUrl, 'swedish', 'vosk-model-small-sv-rhasspy-0.15');

      this.vosklet.getModelCache().then(cache => console.log('model cache', cache));
    }
    if (!this.voskRecognizer) {
      console.log('creating vosk recognizer');
      this.voskRecognizer = await this.vosklet.createRecognizer(this.voskModel, this.ctx.sampleRate);
      this.voskRecognizer.addEventListener('partialResult', ev => this.interimTextReceivedHandler?.(ev.detail))
      this.voskRecognizer.addEventListener('result', ev => this.textReceivedHandler?.(ev.detail))
    }

    if(!this.voskTransferer) {
      console.log('creating vosk transferer');
      this.voskTransferer = await this.vosklet.createTransferer(this.ctx, 128 * 150);
      this.voskTransferer.port.onmessage = ev => this.voskRecognizer?.acceptWaveform(ev.data);

      console.log(this.voskTransferer);
      console.log(this.voskTransferer instanceof AudioWorkletNode);
      // this.micNode.connect(this.ctx.destination);
      // this.voskTransferer.connect(this.ctx.destination);
    }
    if (!this.micNode) {
      console.log('creating mic node');
      this.micStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true
      });
      this.micNode = this.ctx.createMediaStreamSource(this.micStream)
      this.micNode.connect(this.voskTransferer);
    }
    this.setListeningState('listening');

  }
  
  async stopListenAudio() {
    if(this.voskRecognizer) {
      await this.voskRecognizer.delete();
      this.voskRecognizer = undefined;
    }
    // if(this.voskModel) {
    //   await this.voskModel.delete();
    // }
    if(this.vosklet) {
      // await this.vosklet.cleanUp();
    }
    if(this.micNode) {
      this.micNode.disconnect();
      this.micNode = undefined;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = undefined;
    }

    this.setListeningState('inactive');
  }

}