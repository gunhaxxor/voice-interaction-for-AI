const markdownRegex = /[*_#~]/g;
const newlineRegex = /\r?\n+/g;
const sentenceEndRegex = /([.!?:;](?=\s)|[\r\n]+)/g;

const strikethroughRegex = /~~/g;
const backtickRegex = /`+/g;
const bracketRegex = /[![\]]/g;

function processText(text: string): string {
  return text
    .replace(/[*_#~]/g, '')                     // strip markdown
    .replace(/```+/g, '')                       // strip code block fences, keep language label
    .replace(/`+/g, '')                         // strip inline backticks
}

class SentenceTransformer implements Transformer<string, string> {
  private buffer = '';

  transform(chunk: string, controller: TransformStreamDefaultController<string>) {
    this.buffer += chunk;
    this.buffer = processText(this.buffer);

    let match;
    while ((match = sentenceEndRegex.exec(this.buffer)) !== null) {
      const endIndex = sentenceEndRegex.lastIndex;
      const sentence = this.buffer.slice(0, endIndex).trim();
      if (sentence) controller.enqueue(sentence);
      this.buffer = this.buffer.slice(endIndex);
      sentenceEndRegex.lastIndex = 0;
    }
  }

  flush(controller: TransformStreamDefaultController<string>) {
    this.buffer = processText(this.buffer);
    const cleaned = this.buffer.trim();
    if (cleaned) controller.enqueue(cleaned);
    this.buffer = '';
  }
}


export default function createSentenceTransformer() {
  return new TransformStream<string, string>(new SentenceTransformer());
}
