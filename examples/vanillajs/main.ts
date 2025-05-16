
import type { RecognitionService } from 'speech-utils/recognitionService/interface.ts';
import { WebRecognitionService } from 'speech-utils/recognitionService/webRecognitionService.ts';
import { VoskletRecognitionService } from 'speech-utils/recognitionService/voskletRecognitionService.ts';
import { WhisperRecognitionService } from 'speech-utils/recognitionService/whisperRecognitionService.ts';
import { VoskBrowserRecognitionService } from 'speech-utils/recognitionService/voskBrowserRecognition.ts';
import { kbWhisperlocal } from 'speech-utils/recognitionService/kbWhisperLocal.js';


let recognitionService: RecognitionService | undefined;
let language = 'en-US';
function init() {
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
  })
  recognitionService.onTextReceived((text) => {
    console.log('text received', text);
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
      recognitionService = new VoskletRecognitionService({
        modelUrl: '/models/vosk-model-small-en-us-0.15.tar.gz'
        // modelUrl: 'http://localhost:3000/models/vosk-model-small-en-us-0.15.tar.gz',
      });
      break;
    case 'vosk':
      recognitionService = new VoskBrowserRecognitionService({
        modelUrls: {
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