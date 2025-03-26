class SentenceTransformer implements Transformer<string, string> {
  private buffer = '';

  transform(chunk: string, controller: TransformStreamDefaultController<string>) {
    this.buffer += chunk;

    // Remove unwanted markdown symbols globally (non-destructively)
    this.buffer = this.buffer.replace(/[*_()]/g, '');

    let match;
    // Match sentence-ending punctuation with following space, newline, or end of input
    const sentenceEndRegex = /([.!?:;])(?:\s+|\n+|$)/g;

    while ((match = sentenceEndRegex.exec(this.buffer)) !== null) {
      const endIndex = sentenceEndRegex.lastIndex;
      const sentence = this.buffer.slice(0, endIndex).trimEnd();
      controller.enqueue(sentence);
      this.buffer = this.buffer.slice(endIndex);
      sentenceEndRegex.lastIndex = 0; // reset for new buffer
    }
  }

  flush(controller: TransformStreamDefaultController<string>) {
    const cleaned = this.buffer.replace(/[#*_()]/g, '').trim();
    if (cleaned) {
      controller.enqueue(cleaned);
    }
    this.buffer = '';
  }
}

const sentenceTransformer = new TransformStream<string, string>(new SentenceTransformer());

export default sentenceTransformer;