import { WebRecognitionService } from 'https://gunhaxxor.github.io/voice-interaction-for-AI/webRecognitionService.js';
import { VoskletRecognitionService } from 'https://gunhaxxor.github.io/voice-interaction-for-AI/voskletRecognitionService.js';
import { WhisperRecognitionService } from 'https://gunhaxxor.github.io/voice-interaction-for-AI/whisperRecognitionService.js';
import { VoskBrowserRecognitionService } from 'https://gunhaxxor.github.io/voice-interaction-for-AI/voskBrowserRecognition.js';
import { localWhisperRecognitionService } from 'https://gunhaxxor.github.io/voice-interaction-for-AI/localWhisperRecognitionService.js';

let language = 'en-US';
// let transcriptsContainer: HTMLDivElement | undefined;
let recognitionService = undefined;
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

function loadImplementation() {
  if (recognitionService) {
    recognitionService.stopListenAudio();
  }
  const selectedLang = document.querySelector('#select-language')?.value;
  // get current value
  const recognitonImpl = document.querySelector('#select-implementation')?.value;
  switch (recognitonImpl) {
    case 'web':
      console.log('loading web recognition service');
      recognitionService = new WebRecognitionService({
        lang: selectedLang
      });
      break;
    case 'vosklet':
      console.log('loading vosklet recognition service');
      // recognitionService = new VoskletRecognitionService();
      recognitionService = new VoskletRecognitionService({
        // modelUrl: '/models/vosk-model-small-en-us-0.15.tar.gz'
        // modelUrl: '/models/vosk-model-small-en-us-0.15.tar.gz'
        // modelUrl: 'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz',
        // modelUrl: 'https://testyta.se/models/vosk-model-small-en-us-0.15.tar.gz',
        modelUrl: 'https://testyta.se/models/vosk-model-small-sv-rhasspy-0.15.tar.gz',
        // modelUrl: 'http://localhost:3000/models/vosk-model-small-en-us-0.15.tar.gz',
      });
      break;
    case 'vosk':
      recognitionService = new VoskBrowserRecognitionService({
        modelUrls: {
          // 'sv': 'https://testyta.se/models/vosk-model-small-sv-rhasspy-0.15.tar.gz',
          // 'en': 'https://testyta.se/models/vosk-model-small-en-us-0.15.tar.gz',
          'sv': '/models/vosk-model-small-sv-rhasspy-0.15.tar.gz',
          'en': '/models/vosk-model-small-en-us-0.15.tar.gz'
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
      recognitionService = new localWhisperRecognitionService({
        lang: selectedLang?.substring(0, 2)
      });
      break;
  }
  recognitionService?.initialize?.();
}

// (window).setLanguage = (lang: string) => {
//   language = lang;
// }

(window).initRecognition = init;
(window).loadImplementation = loadImplementation;