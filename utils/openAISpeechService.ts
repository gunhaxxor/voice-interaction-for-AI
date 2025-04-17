import OpenAI from "openai";
interface OpenAISpeechServiceOptions extends TTSServiceSpeechOptions {
  baseUrl: string,
  apiKey: string,
  lang: PossibleLanguagesISO6391,
}

type RequestState = 'standby' | 'requested' | 'resolved' | 'rejected' | 'cancelled';
type SpeechQueueRecord = {
  text: string,
  requestPromise?: Promise<void>,
  playedPromise?: Promise<void>,
  requestState: RequestState,
  audio?: HTMLAudioElement
}

type RequestedSpeechQueueRecord = SpeechQueueRecord & { requestPromise: Promise<void> };
type StartedSpeechQueueRecord = Required<SpeechQueueRecord>;

export class OpenAISpeechService extends TTSServiceCallbackHandling implements TTSService {
  private openai: OpenAI

  constructor(options: OpenAISpeechServiceOptions | OpenAI) {
    super();
    if (options instanceof OpenAI) {
      this.openai = options;
      return;
    }

    this.openai = new OpenAI({
      baseURL: options.baseUrl ?? 'https://api.openai.com/v1',
      apiKey: options.apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  private currentSpeech?: Required<SpeechQueueRecord>;
  getCurrentSpeech(): string | undefined {
    return this.currentSpeech?.text;
  }

  speakDirectly(text: string, options?: TTSServiceSpeechOptions): void {
    this.cancel();
    this.enqueueSpeech(text, options);
  }

  cancel(): void {
    if (this.currentSpeech) {
      this.currentSpeech.requestState = 'cancelled';
      this.currentSpeech.audio?.pause();
      this.currentSpeech.audio?.remove();
      this.currentSpeech = undefined;
    }
    this.speechQueue.forEach((speech) => {
      speech.requestState = 'cancelled';
    })
    this.speechQueue.length = 0;
    this.setSpeechState('idle');
  }

  pause(): void {
    this.currentSpeech?.audio?.pause();
    this.setSpeechState('paused');
  }

  resume(): void {
    this.currentSpeech?.audio?.play();
    this.setSpeechState('speaking');
  }

  getCurrentSpeechState(): SpeechState {
    return this.speechState;
  }

  private speechQueue: SpeechQueueRecord[] = [];
  getPendingSpeech(): string[] {
    return this.speechQueue.map(speech => speech.text);
  }

  private isRequestedSpeechRecord(record: SpeechQueueRecord): record is RequestedSpeechQueueRecord {
    return 'requestPromise' in record;
  }

  private isStartedSpeechRecord(record: SpeechQueueRecord): record is StartedSpeechQueueRecord {
    return ('requestState' in record) && ('requestPromise' in record) && ('audio' in record);
  }

  private pluckAndStartNextSpeech() {
    console.log('plucking and starting next speech from queue:', JSON.stringify(this.speechQueue));
    const pluckedSpeech = this.speechQueue.shift();
    if (!pluckedSpeech) {
      throw new Error('pluckedSpeech is undefined for next speech in queue');
    }
    if (!this.isRequestedSpeechRecord(pluckedSpeech)) {
      throw new Error('pluckedSpeech.requestPromise is undefined for next speech in queue');
    }
    this.internalQueueUpdatedHandler(this.speechQueue, 'speech plucked');
    this.currentSpeech = this.startSpeechPlayback(pluckedSpeech);

    //Hopefully this reliably consumes the queue until its empty
    this.currentSpeech.playedPromise.catch((err) => {
      console.error(err);
      this.setSpeechState('error');
    }).finally(() => {
      // console.log('current speech playedPromise fullfilled', this.currentSpeech);

      // This was the last speech, lets handle state accordingly
      if (!this.speechQueue.length) {
        this.currentSpeech = undefined;
        this.setSpeechState('idle');
        this.internalQueueUpdatedHandler(this.speechQueue, 'last speech ended');
        return;
      }
      const firstInQueue = this.speechQueue.at(0);
      if (firstInQueue?.requestState === 'cancelled') {
        return;
      }
      if (firstInQueue?.requestState === 'resolved') {
        this.pluckAndStartNextSpeech();
      } else if (firstInQueue?.requestPromise) {
        console.warn('next speechRecord was not resolved yet, will await its finish before plucking it');
        firstInQueue?.requestPromise.finally(() => this.pluckAndStartNextSpeech());
      }
    })
  }

  private startSpeechPlayback(record: RequestedSpeechQueueRecord): StartedSpeechQueueRecord {
    if (!record.audio) {
      throw new Error('No audio to play: ' + record.text);
    }
    const { promise: playedPromise, resolve: resolvePlayed, reject: rejectPlayed } = Promise.withResolvers<void>();
    record.playedPromise = playedPromise;
    record.audio.play();
    if (this.speechState !== 'speaking') {
      this.setSpeechState('speaking');
    }
    record.audio.onerror = (errorEvt) => rejectPlayed(errorEvt);
    record.audio.onended = () => resolvePlayed()
    if (!this.isStartedSpeechRecord(record)) {
      throw new Error('shouldnt be possible to get here. Record is not started');
    }
    return record;
  }

  private internalQueueUpdatedHandler(queue: SpeechQueueRecord[], reason?: string) {

    console.log('queue updated', JSON.stringify(queue), reason);
    // Check if we should start requests for the top requests
    const loops = Math.min(queue.length, 2);
    for (let i = 0; i < loops; i++) {
      const record = queue[i];
      if (record.requestState === 'standby') {
        console.log('found an idle request. Firing it off');
        this.startSpeechRequest(record, { speed: 1.5 });
      }
    }


    const firstInQueue = queue.at(0);
    if (firstInQueue) {
      if (!this.isRequestedSpeechRecord(firstInQueue)) {
        throw new Error('firstInQueue is not requested');
      }
      firstInQueue.requestPromise?.finally(() => {
        if (firstInQueue.requestState === 'cancelled') return;
        // console.log('first in queue requestPromise fullfilled', firstInQueue);
        if (!this.currentSpeech) {
          this.pluckAndStartNextSpeech();
        }
      })
    }
    this.speechQueueUpdatedHandler?.(this.getPendingSpeech(), this.getCurrentSpeech(), reason);
  }

  /**
   * @returns the antecedent record. That is, the record that was last in queue before this record was added or currentspeech id queue was empty.
   */
  private addToQueue(speech: SpeechQueueRecord) {
    let antecedentRecord = this.speechQueue.at(-1);
    //If queue was empty, antecedent is current speech
    if (!antecedentRecord) {
      antecedentRecord = this.currentSpeech;
    }
    this.speechQueue.push(speech);
    this.internalQueueUpdatedHandler(this.speechQueue, 'speech added');
    return antecedentRecord;
  }

  private speechRecordRequestHasFinished(record: SpeechQueueRecord): boolean {
    return record.requestState === 'resolved' || record.requestState === 'rejected';
  }

  private async startSpeechRequest(record: SpeechQueueRecord, options?: TTSServiceSpeechOptions) {
    record.requestState = 'requested';
    const { promise: requestPromise, resolve: resolveRequest, reject: rejectRequest } = Promise.withResolvers<void>();
    record.requestPromise = requestPromise;
    const response = await this.openai.audio.speech.create({
      model: 'rhasspy/piper-voices',
      input: record.text,
      voice: 'sv_SE-nst-medium',
      speed: options?.speed,
      // instructions: 'be sad when responding',
    })
    try {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      record.requestState = 'resolved';
      resolveRequest();
      record.audio = audio;
    } catch (error) {
      console.error(error);
      record.requestState = 'rejected';
      rejectRequest();
    }
    return requestPromise;
  }

  async enqueueSpeech(text: string, options?: TTSServiceSpeechOptions): Promise<void> {
    const speechRecord: SpeechQueueRecord = {
      text,
      requestState: 'standby',
    };

    const antecedentRecord = this.addToQueue(speechRecord);
  }
}