import { assert, describe, expect, test, vi } from "vitest";
import { type STTService, MockSTTService } from "@/utils/recognitionService";

describe('MockSTTService', () => {
  test('can initialize', () => {
    const sttService = new MockSTTService();
    expect(sttService).toBeDefined();
  })
  test('can startListenAudio without error', () => {
    const sttService = new MockSTTService();
    sttService.startListenAudio();
  })
  test('can stopListenAudio without error', () => {
    const sttService = new MockSTTService();
    sttService.startListenAudio();
    sttService.stopListenAudio();
  })
  test('can addTextReceivedListener without error', () => {
    const sttService = new MockSTTService();
    sttService.onTextReceived(() => { });
  })
  test('receives events if event listener added and startListenAudio', async () => {
    const mocklistener = vi.fn((text: string) => {
      // console.log(text);
    });
    const sttService = new MockSTTService();
    sttService.onTextReceived(mocklistener);
    sttService.startListenAudio();
    await vi.waitUntil(() => mocklistener.mock.calls.length > 0, { timeout: 3000 });
    // mocklistener('asdf');
    // console.log(mocklistener.mock.calls.length);
    assert(mocklistener.mock.lastCall?.at(0) === 'Hello!', 'expected last call to be "Hello!"');
  })
  test('doesnt receive event if stopListenAudio', async () => {
    const mocklistener = vi.fn((text: string) => {
      // console.log(text);
    });
    const sttService = new MockSTTService();
    sttService.startListenAudio();
    sttService.stopListenAudio()
    sttService.onTextReceived(mocklistener);
    await vi.waitUntil(() => mocklistener.mock.calls.length === 0, { timeout: 40 });
    // mocklistener('asdf');
    // console.log(mocklistener.mock.calls.length);
  })
  test('doesnt trigger listener if listener is removed', async () => {
    const mocklistener = vi.fn((text: string) => {
      // console.log(text);
    });
    const sttService = new MockSTTService();
    sttService.startListenAudio();
    sttService.onTextReceived(mocklistener);
    sttService.onTextReceived(undefined);
    await vi.waitUntil(() => mocklistener.mock.calls.length === 0, { timeout: 40 });
    // mocklistener('asdf');
    // console.log(mocklistener.mock.calls.length);
  })
})