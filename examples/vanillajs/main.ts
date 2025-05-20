
import type { RecognitionService } from 'speech-utils/recognitionService/interface.ts';
import { WebRecognitionService } from 'speech-utils/recognitionService/webRecognitionService.ts';
import { VoskletRecognitionService } from 'speech-utils/recognitionService/voskletRecognitionService.ts';
import { WhisperRecognitionService } from 'speech-utils/recognitionService/whisperRecognitionService.ts';
import { VoskBrowserRecognitionService } from 'speech-utils/recognitionService/voskBrowserRecognition.ts';
import { kbWhisperlocal } from 'speech-utils/recognitionService/kbWhisperLocal.js';


let recognitionService: RecognitionService | undefined;
let language = 'en-US';
declare const transcriptsContainer: HTMLDivElement;
// let transcriptsContainer: HTMLDivElement | undefined;
function init() {
  // transcriptsDiv = document.querySelector<HTMLDivElement>('#transcripts');
  // transcriptsContainer = transcriptsContainer;
  const emptyP = document.createElement('p');
  transcriptsContainer?.appendChild(emptyP);

  if (!recognitionService) {
    console.error('no recognitionService implementation loaded');
    return;
  }
  recognitionService.onError((error) => {
    console.error('Speech Recognition error', error);
  });
  recognitionService.startListenAudio();
  recognitionService.onInterimTextReceived((text) => {
    console.log('interim text received', text);
    const lastP = transcriptsContainer?.lastElementChild;
    if (lastP) {
      lastP.textContent = text;
    }
  })
  recognitionService.onTextReceived((text) => {
    console.log('text received', text);
    const nrOfChildren = transcriptsContainer?.childElementCount;
    if (nrOfChildren > 10) {
      const firstChild = transcriptsContainer.firstElementChild;
      if (!firstChild) {
        console.error('firstChild undefined. This should never happen');
        return;
      }
      transcriptsContainer.removeChild(firstChild);
    }
    const lastP = transcriptsContainer?.lastElementChild;
    if (lastP) {
      lastP.textContent = text;
    }

    //Create empty paragraph for coming interim text
    const emptyP = document.createElement('p');
    transcriptsContainer?.appendChild(emptyP);
  })
}

type SelectOption = 'web' | 'vosklet' | 'vosk' | 'whisper' | 'localWhisper';
function loadImplementation() {
  if (recognitionService) {
    recognitionService.stopListenAudio();
  }
  const selectedLang = document.querySelector<HTMLSelectElement>('#select-language')?.value;
  // get current value
  const recognitonImpl = document.querySelector<HTMLSelectElement>('#select-implementation')?.value as SelectOption | null;
  switch (recognitonImpl) {
    case 'web':
      console.log('loading web recognition service');
      recognitionService = new WebRecognitionService({
        lang: selectedLang
      });
      break;
    case 'vosklet':
      console.log('loading vosklet recognition service');
      recognitionService = new VoskletRecognitionService();
      // recognitionService = new VoskletRecognitionService({
      //   // modelUrl: '/models/vosk-model-small-en-us-0.15.tar.gz'
      //   modelUrl: 'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz',
      //   // modelUrl: 'https://testyta.se/models/vosk-model-small-en-us-0.15.tar.gz',
      //   // modelUrl: 'http://localhost:3000/models/vosk-model-small-en-us-0.15.tar.gz',
      // });
      break;
    case 'vosk':
      recognitionService = new VoskBrowserRecognitionService({
        modelUrls: {
          'sv': 'https://testyta.se/models/vosk-model-small-sv-rhasspy-0.15.tar.gz',
          'en': 'https://testyta.se/models/vosk-model-small-en-us-0.15.tar.gz',
          // 'sv': '/models/vosk-model-small-sv-rhasspy-0.15.tar.gz',
          // 'en': '/models/vosk-model-small-en-us-0.15.tar.gz'
        },
        lang: selectedLang?.substring(0, 2),
      });
      break;
    case 'whisper':
      console.log('loading openAI recognition service');
      recognitionService = new WhisperRecognitionService({
        url: 'http://localhost:8000/v1',
        key: 'speaches',
        lang: selectedLang?.substring(0, 2),
        model: 'Systran/faster-whisper-large-v3'
      });
      break;
    case 'localWhisper':
      console.log('loading local whisper recognition service');
      recognitionService = new kbWhisperlocal({
        lang: selectedLang?.substring(0, 2)
      });
      break;
  }
  recognitionService?.initialize?.();
}

// (window as any).setLanguage = (lang: string) => {
//   language = lang;
// }

(window as any).initRecognition = init;
(window as any).loadImplementation = loadImplementation;