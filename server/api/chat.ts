import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
// import { createOllama } from 'ollama-ai-provider';

export default defineLazyEventHandler(async () => {
  // const apiKey = useRuntimeConfig().openaiApiKey;
  // if(!apiKey) throw new Error('Missing OpenAI API key');
  // console.log('apiKey:', apiKey);

  // const ollama = createOllama({
  //   baseURL: 'http://localhost:11434/v1',
  // });

  // ollama.languageModel('llama3.2');

  // const chat = ollama.chat('llama3.2', {

  // });

  const openai = createOpenAI({
    // baseURL: 'http://192.168.51.51:11434/v1',
    baseURL: 'http://localhost:11434/v1',
    apiKey: 'ollama'
  });


  return defineEventHandler(async (event) => {
    const { messages } = await readBody(event);
    // console.log('received messages:', messages);
    const result = streamText({
      model: openai('llama3.2'),
      // model: openai('gemma3'),
      // model: openai('deepseek-r1'),
      messages,
    })
    return result.toDataStreamResponse();
  })
})