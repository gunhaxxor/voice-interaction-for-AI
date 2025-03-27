const sentenceEndRegex = /([.!?:;](?=\s)|[\r\n]+)/g;

const markdownRegex = /[*_#~]/g;
const backtickRegex = /`+/g;

function processText(text: string): string {
  return text
    .replace(markdownRegex, '')                     // strip markdown
    .replace(backtickRegex, '')                         // strip inline backticks
}

class SentenceTransformer implements Transformer<string, string> {
  private buffer = '';

  transform(chunk: string, controller: TransformStreamDefaultController<string>) {
    this.buffer += chunk;
    // this.buffer = processText(this.buffer);

    let match;
    while ((match = sentenceEndRegex.exec(this.buffer)) !== null) {
      const endIndex = sentenceEndRegex.lastIndex;
      const sentence = this.buffer.slice(0, endIndex);
      const cleaned = processText(sentence).trim();
      if (cleaned) controller.enqueue(cleaned);
      this.buffer = this.buffer.slice(endIndex);
      sentenceEndRegex.lastIndex = 0;
    }
  }

  flush(controller: TransformStreamDefaultController<string>) {
    const cleaned = processText(this.buffer).trim();
    if (cleaned) controller.enqueue(cleaned);
    this.buffer = '';
  }
}


export default function createSentenceTransformer() {
  return new TransformStream<string, string>(new SentenceTransformer());
}
