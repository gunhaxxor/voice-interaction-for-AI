# Voice Interaction Utilities
Hello! This project aims to create typescript/javacript interfaces for voice interaction (STT and TTS).
Currently the primary focus is on speech recognition, with an interface called `RecognitionService` acting as the blueprint for implementations.
There are already a few implementations of this interface created with varying levels of functionality.

## Examples
Check the examples folder for demos of how to use the interface/implementations.
some of the implementations require external endpoints to be accessible.
For example, the whisperRecognitionService uses the [openai whisper api](https://platform.openai.com/docs/guides/speech-to-text/quickstart) and expects an openai-compatible url to be provided.
The vosk related implementations expect vosk models to be accessible via a provided url.
To use local vosk models, make sure you have vosk models with tar.gz extensions in the folder `./models/`. Models in zip format are available here: https://alphacephei.com/vosk/models. Some models already convert to tar.gz format is available here: https://ccoreilly.github.io/vosk-browser/models/[modelname].tar.gz, where modelname is replaced with the name of the model. You need to do some detective work to find the model name for the language you want to use. 

## API
The best way to learn the api of `RecognitonService` is to look at it's source code in [`lib/src/recognitionService/interface.ts`](lib/src/recognitionService/interface.ts). The API is commented with JSDOCs, which should also provide some hints from within your IDE.


Martin was here
