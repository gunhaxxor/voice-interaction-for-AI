class SentenceTransformer implements Transformer<string, string> {
  private buffer = '';

  transform(word: string, controller: TransformStreamDefaultController<string>) {
    this.buffer += (this.buffer ? ' ' : '') + word;
    // this.buffer += word;

    if (/[.!?]$/.test(word)) {
      controller.enqueue(this.buffer.trim());
      // controller.enqueue(this.buffer);
      this.buffer = '';
    }
  }

  flush(controller: TransformStreamDefaultController<string>) {
    if (this.buffer) {
      controller.enqueue(this.buffer.trim());
      // controller.enqueue(this.buffer);
    }
  }
}

const sentenceTransformer = new TransformStream<string, string>(new SentenceTransformer());

export default sentenceTransformer;