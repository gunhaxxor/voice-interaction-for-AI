
import type { RecognitionService } from 'speech-utils/recognitionService/interface.ts';
import { WebRecognitionService } from 'speech-utils/recognitionService/webRecognitionService.ts';
import { VoskletRecognitionService } from 'speech-utils/recognitionService/voskletRecognitionService.ts';
import { WhisperRecognitionService } from 'speech-utils/recognitionService/whisperRecognitionService.ts';
import { VoskBrowserRecognitionService } from 'speech-utils/recognitionService/voskBrowserRecognition.ts';


let recognitionService: RecognitionService | undefined;
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

type SelectOption = 'web' | 'vosklet' | 'vosk' | 'whisper';
function loadImplementation() {
  if (recognitionService) {
    recognitionService.stopListenAudio();
  }
  // get current value
  const recognitonImpl = document.querySelector<HTMLSelectElement>('#select-implementation')?.value as SelectOption | null;
  switch (recognitonImpl) {
    case 'web':
      console.log('loading web recognition service');
      recognitionService = new WebRecognitionService();
      break;
    case 'vosklet':
      console.log('loading vosklet recognition service');
      recognitionService = new VoskletRecognitionService({
        modelUrl: '/models/vosk-model-small-en-us-0.15.tar.gz'
        // modelUrl: 'http://localhost:3000/models/vosk-model-small-en-us-0.15.tar.gz',
      });
      break;
    case 'vosk':
      recognitionService = new VoskBrowserRecognitionService();
      break;
    case 'whisper':
      console.log('loading openAI recognition service');
      recognitionService = new WhisperRecognitionService();
      break;
  }
  recognitionService?.initialize?.();
}


(window as any).initRecognition = init;
(window as any).loadImplementation = loadImplementation;