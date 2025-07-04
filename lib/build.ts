await Bun.build({
  entrypoints: [
    './src/recognitionService/webRecognitionService.ts',
    './src/recognitionService/localWhisperRecognitionService.ts',
    './src/recognitionService/voskBrowserRecognition.ts',
    './src/recognitionService/voskletRecognitionService.ts',
    './src/recognitionService/whisperRecognitionService.ts'],
  outdir: './dist',
  target: 'browser',
  splitting: true,
})