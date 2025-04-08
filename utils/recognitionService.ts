export interface STTService {
  startListenAudio(): void;
  stopListenAudio(): void;
  // getTranscript(): string;
  addTextReceivedListener(listener: (text: string) => void): void;
  removeTextReceivedListener(listener: (text: string) => void): void;
}

export class MockSTTService implements STTService {
  private ee = new TinyEventEmitter();
  private readonly randomTexts = [
    'Hello!',
    // 'How are you?',
    // 'I am fine',
    // 'I am not fine',
    // 'I like big butts and I cannot lie',
    // 'How about next year?'
  ]
  private currentInterval = 0;
  startListenAudio(): void {
    console.log('startListening audio');
    // clear previous interval if is set
    if(this.currentInterval) clearInterval(this.currentInterval);

    this.currentInterval = setInterval(() => {
      console.log('setting interval');
      // this.ee.triggerEvent('textReceived', this.randomTexts.at(Math.floor(Math.random() * this.randomTexts.length))!);
      this.ee.triggerEvent('textReceived', 'Hello!');
    }, 100);
  }
  stopListenAudio(): void {
    console.log('stopListening audio');
    clearInterval(this.currentInterval);
  }
  // getTranscript(): string {
  //   return 'mock transcript';
  // }
  addTextReceivedListener(listener: (text: string) => void): void {
    this.ee.addListener('textReceived', listener);
  }
  removeTextReceivedListener(listener: (text: string) => void): void {
    this.ee.removeListener('textReceived', listener);
  }
}

// type EvtMap = Record<string, (param: string) => void>

// interface STTEvents extends EvtMap {
//   textReceived: (text: string) => void
// } 

class TinyEventEmitter {
  // eventTarget: EventTarget;
  private callbacks: Map<string, Set<Function>>
  // private fallbackCallback?: (type: string, data: unknown) => void;
  constructor() {
    // this.eventTarget = new EventTarget();
    this.callbacks = new Map();
  }
  // onUnregistered(callback: (type: string, data: unknown) => void){
  //   // this.fallbackCallback = callback;
  // }
  
  addListener<K extends string, L extends (data:any) => void>(event: K, listener: L): void {
    // console.log('attaching eventhandler:', type, callback);
    if(!this.callbacks.has(event)){
      this.callbacks.set(event, new Set())
    }
    this.callbacks.get(event)?.add(listener);
  }
  removeListener<K extends string, L extends (data:any) => void>(event: K, listener: L): void {
    this.callbacks.get(event)?.delete(listener);
  }
  
  removeAllListers<K extends string>(event: K): void {
    this.callbacks.delete(event);
  }
  
  triggerEvent<K extends string>(type: K, data: unknown){
    console.log('evt triggered', type, data);
    const cbSet = this.callbacks.get(type);
    if(cbSet === undefined){
      // throw Error('received event which didnt have an attached handler');
      // if(this.fallbackCallback){
      //   // console.log('fbc: ', type, data);
      //   this.fallbackCallback(type, data);
      //   return;
      // }
      console.warn('received event for which no handler exists');
      return;
    };
    cbSet.forEach((cb) => cb(data))
  }
}