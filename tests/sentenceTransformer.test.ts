import { describe, expect, test } from "vitest";
import { expectedSentences, markdownString } from './markdown-example';

describe('sentenceStreamer', () => {
  test('handles basic markdown', async () => {
    const transformer = sentenceStreamer();
    const writer = transformer.writable.getWriter();
    const reader = transformer.readable.getReader();
    let mrkStr = markdownString;
    while(mrkStr.length > 0) {
      const chunk = mrkStr.slice(0, 10);
      mrkStr = mrkStr.slice(10);
      writer.write(chunk);
    }
    writer.close();
    const readArr: string[] = [];
    while(true){
      const { value, done } = await reader.read();
      if(done) break;
      readArr.push(value);
    }
    console.log(readArr);
    // console.log(markdownString);
    // console.log(expectedSentences);
    expect(readArr).toEqual(expectedSentences);
  })
  test('reads most recent sentence if isnt closed', async () => {
    const transformer = sentenceStreamer();
    const writer = transformer.writable.getWriter();
    const reader = transformer.readable.getReader();
    let mrkStr = markdownString;
    const readArr: string[] = [];
    const { promise: readCompleted, resolve } = Promise.withResolvers<void>();
    let readInterval = setInterval(async () => {
      const { value, done } = await reader.read();
      if (done) {
        clearInterval(readInterval);
        resolve();
        return;
      }
      readArr.push(value);
    })
    const writeInterval = setInterval(async () => {
      if (mrkStr.length === 0) {
        // writer.close();
        clearInterval(writeInterval);
        return;
      }
      const chunk = mrkStr.slice(0, 10);
      mrkStr = mrkStr.slice(10);
      writer.write(chunk);
    });
    console.log(readArr);
    // console.log(markdownString);
    // console.log(expectedSentences);
    await readCompleted;
    expect(readArr).toEqual(expectedSentences);
  })
})