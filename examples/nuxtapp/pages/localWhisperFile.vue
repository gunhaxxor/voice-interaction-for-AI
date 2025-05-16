<template>
  <div class="m-16">
    <UButton @click="open()">Välj fil</UButton>
    <div class="grid max-w-3xl grid-cols-[auto_auto_auto] items-center gap-4">
      <div class="contents" v-for="file in filesWithURL">
        <div>
          {{ file.file.name }}
        </div>
        <audio controls :src="file.url"></audio>
        <UButton @click="transcribe(file)">transcribe</UButton>
      </div>
    </div>
    <p>{{ transcript }}</p>
  </div>
</template>
<script setup lang="ts">

import { env, pipeline, AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
const { files, open, reset, onCancel, onChange } = useFileDialog({
  multiple: true,
  accept: 'audio/*'
});

type FileWithUrl = {
  file: File,
  url: string
}

const filesWithURL = computed(() => {
  if (files.value === null) return [];

  const list = [] as FileWithUrl[];
  for (const file of files.value) {
    list.push({ file, url: URL.createObjectURL(file) });
  }
  return list;

})

const transcript = ref('');
let transcriber: AutomaticSpeechRecognitionPipeline;

async function transcribe(fileRecord: FileWithUrl) {
  console.log(fileRecord);
  const arrBuffer = await fileRecord.file.arrayBuffer();
  console.log(arrBuffer);
  const result = await transcriber(fileRecord.url, {
    // chunk_length_s: 30,
    // stride_length_s: 5,
    // return_timestamps: true,
    // force_full_sequences: false,
    // language: 'en'
  });
  console.log(result);
  transcript.value = result.text;
}

onMounted(async () => {
  env.allowLocalModels = false;
  try {
    transcriber = await pipeline(
      'automatic-speech-recognition',
      'KBLab/kb-whisper-tiny',
      {
        dtype: 'q4',
        device: 'wasm',
      }
    ) as any as AutomaticSpeechRecognitionPipeline;

    // transcriber = await pipeline(
    //   'automatic-speech-recognition',
    //   // 'Xenova/whisper-small',
    //   // 'Xenova/whisper-tiny',
    //   // 'PierreMesure/kb-whisper-tiny-ONNX',
    //   'KBLab/kb-whisper-tiny',
    //   // {
    //   //   device: 'webgpu',
    //   //   dtype: 'q4',
    //   // }
    // ) as AutomaticSpeechRecognitionPipeline;
  } catch (error) {
    console.error(error);
  }
})
</script>