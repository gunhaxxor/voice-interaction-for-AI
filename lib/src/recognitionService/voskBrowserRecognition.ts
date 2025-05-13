import { createModel, Model, type KaldiRecognizer } from 'vosk-browser';
import { type RecognitionService, RecognitionServiceCallbackHandling, type RecognitionServiceListenOptions } from './interface';
import type { PossibleLanguagesISO6391 } from '../utilityTypes';
interface VoskBrowserRecognitionServiceListenOptions extends RecognitionServiceListenOptions {
    /**
     * Language to recognize. Two letter language/country code (ISO 639-1). Default is 'en'.      
     * */
    lang?: PossibleLanguagesISO6391
    modelUrls: {
        [key in PossibleLanguagesISO6391]: string
    }
}
export class VoskBrowserRecognitionService extends RecognitionServiceCallbackHandling implements RecognitionService {

    private modelUrls: VoskBrowserRecognitionServiceListenOptions['modelUrls']
    private currentModelUrl?: string
    constructor(options?: VoskBrowserRecognitionServiceListenOptions) {
        super();
        this.modelUrls = options?.modelUrls || {
            'sv': '/models/vosk-model-small-sv-rhasspy-0.15.tar.gz',
            'en': '/models/vosk-model-small-en-us-0.15.tar.gz'
        }
        this.currentModelUrl = this.modelUrls[options?.lang || 'en'];
        if (!this.currentModelUrl) {
            throw new Error(`No model url found or provided for ${options?.lang || 'en'}`);
        }
    }
    private model?: Model;
    private recognizer?: KaldiRecognizer;
    async initialize() {
        if (!this.model) {
            this.model = await createModel(this.currentModelUrl!);
        }

        if (!this.recognizer) {
            this.recognizer = new this.model.KaldiRecognizer(16000);
        }
        this.recognizer.on('error', (error) => {
            if (error.event !== 'error') {
                console.error('KaldiRecognizer error that wasnt marked as error event', error);
                return;
            };
            this.errorHandler?.(Error(error.error));
        })
        this.recognizer.on("result", (message) => {
            if (message.event !== 'result') return;
            this.textReceivedHandler?.(message.result.text);
            // console.log(`Result: ${message.result.text}`);
        });
        this.recognizer.on("partialresult", (message) => {
            if (message.event !== 'partialresult') return
            this.interimTextReceivedHandler?.(message.result.partial);
            // console.log(`Partial result: ${message.result.partial}`);
        });

    }
    private audioCtx?: AudioContext;
    private micStream?: MediaStream;
    private micNode?: MediaStreamAudioSourceNode;
    private audioProcessor?: ScriptProcessorNode;
    async startListenAudio(options?: RecognitionServiceListenOptions) {
        //TODO: Make it possible to change model dynamically...
        this.currentModelUrl = this.modelUrls[options?.lang || 'en'];
        if (!this.currentModelUrl) {
            throw new Error(`No model url found or provided for ${options?.lang || 'en'}`);
        }

        this.audioCtx = new AudioContext({
            sinkId: { type: 'none' }
        });

        this.micStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            // audio: true,
            audio: {
                // echoCancellation: true,
                // noiseSuppression: true,
                channelCount: 1,
                sampleRate: 16000
            },
        });

        this.micNode = this.audioCtx.createMediaStreamSource(this.micStream);
        // createAnalyser(mediaStream);
        // await new Promise<void>((resolve) => setTimeout(resolve, 2000));

        this.audioProcessor = this.audioCtx.createScriptProcessor(4096, 1, 1)
        console.log(this.audioProcessor);
        this.audioProcessor.onaudioprocess = (event) => {
            // console.log('audio chunk received');
            try {
                this.recognizer?.acceptWaveform(event.inputBuffer)
            } catch (error) {
                console.error('acceptWaveform failed', error)
            }
        }
        this.micNode.connect(this.audioProcessor);
        // Required to connect the scriptProcessor so that browser wont force it off
        this.audioProcessor.connect(this.audioCtx.destination);

        this.setListeningState('listening')
    }
    stopListenAudio(): void {
        // this.micNode?.disconnect();
        // this.audioProcessor?.disconnect();
        this.audioCtx?.close();
        this.audioCtx = undefined;
        this.micStream?.getTracks().forEach(track => track.stop());
        // this.micStream = undefined;
        this.setListeningState('inactive')
    }

    supportsVADState(): boolean {
        return false;
    }

    async dispose() {
        this.recognizer?.remove();
        this.model?.terminate();
    }

}
export async function init() {
    const model = await createModel('/models/vosk-model-small-sv-rhasspy-0.15.tar.gz');

    const recognizer = new model.KaldiRecognizer(16000);
    recognizer.on("result", (message) => {
        // console.log(`Result: ${message.result.text}`);
    });
    recognizer.on("partialresult", (message) => {
        // console.log(`Partial result: ${message.result.partial}`);
    });

    const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        // audio: true,
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            channelCount: 1,
            sampleRate: 16000
        },
    });

    const audioContext = new AudioContext({
        sinkId: { type: 'none' }
    });
    const source = audioContext.createMediaStreamSource(mediaStream);
    // createAnalyser(mediaStream);
    // await new Promise<void>((resolve) => setTimeout(resolve, 2000));

    const audioProcessor = audioContext.createScriptProcessor(4096, 1, 1)
    console.log(audioProcessor);
    audioProcessor.onaudioprocess = (event) => {
        // console.log('audio chunk received');
        try {
            recognizer.acceptWaveform(event.inputBuffer)
        } catch (error) {
            console.error('acceptWaveform failed', error)
        }
    }
    source.connect(audioProcessor);
    audioProcessor.connect(audioContext.destination);
}

let currentRms = 0;
let callback: undefined | ((rms: number) => void);
async function createAnalyser(stream: MediaStream) {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    source.connect(analyser);

    setInterval(() => {
        analyser.getByteTimeDomainData(dataArray);
        // Compute RMS (root mean square) to see if there's any signal
        const rms = Math.sqrt(dataArray.reduce((sum, val) => {
            const centered = val - 128; // center on 0
            return sum + centered * centered;
        }, 0) / bufferLength);
        currentRms = rms;
        callback?.(rms);
    }, 30);
    return analyser;
}
export function onRMSUpdate(handler: (rms: number) => void) {
    callback = handler;
}
export function getCurrentRMS() {
    return currentRms;
}
