
import { WebRecognitionService } from 'speech-utils/recognitionService/webRecognitionService.ts';

console.log('hello from main.ts');
function init() {
  const recognitionService = new WebRecognitionService({lang: 'sv-SE'});
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


(window as any).initRecognition = init