import { createModel } from 'vosk-browser';
export async function init() {
    // const model = await Vosk.createModel('model.tar.gz');
    // const model = await createModel('/models/vosk-model-small-en-us-0.15.tar.gz');
    const model = await createModel('/models/vosk-model-small-sv-rhasspy-0.15.tar.gz');

    const recognizer = new model.KaldiRecognizer(16000);
    recognizer.on("result", (message) => {
        console.log(`Result: ${message.result.text}`);
    });
    recognizer.on("partialresult", (message) => {
        console.log(`Partial result: ${message.result.partial}`);
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
}
export function onRMSUpdate(handler: (rms: number) => void) {
    callback = handler;
}
export function getCurrentRMS() {
    return currentRms;
}
