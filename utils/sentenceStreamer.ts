
const markdownRegex = /[*_#]/g;
const newlineRegex = /\r?\n+/g;
// const sentenceEndRegex = /([.!?:;])\s+/g;
const sentenceEndRegex = /([.!?:;]|[\r\n]+)/g;


const parenRegex = /\(([^)]+)\)/g;

function processText(text: string, controller: TransformStreamDefaultController<string>) {
  // Replace newlines with space
  text = text.replace(newlineRegex, ' ');

  // Remove markdown symbols except parentheses (we handle those separately)
  text = text.replace(markdownRegex, '');

  // Extract content from parentheses and emit as separate sentences
  // let parenMatch;
  // while ((parenMatch = parenRegex.exec(text)) !== null) {
  //   const inner = parenMatch[1].trim();
  //   if (inner) controller.enqueue(inner);
  // }
  // text = text.replace(parenRegex, ''); // remove the full (content)
  return text;
}

class SentenceTransformer implements Transformer<string, string> {
  private buffer = '';

  transform(chunk: string, controller: TransformStreamDefaultController<string>) {
    this.buffer += chunk;


    this.buffer = processText(this.buffer, controller);

    // Emit on sentence-ending punctuation
    let match;

    while ((match = sentenceEndRegex.exec(this.buffer)) !== null) {
      const endIndex = sentenceEndRegex.lastIndex;
      const sentence = this.buffer.slice(0, endIndex).trimEnd();
      controller.enqueue(sentence);
      this.buffer = this.buffer.slice(endIndex);
      sentenceEndRegex.lastIndex = 0; // reset for new buffer
    }
  }

  flush(controller: TransformStreamDefaultController<string>) {
    this.buffer = processText(this.buffer, controller);

    const cleaned = this.buffer.trim();
    if (cleaned) {
      controller.enqueue(cleaned);
    }
    this.buffer = '';
  }
}

export default function createSentenceTransformer() { return new TransformStream<string, string>(new SentenceTransformer()); }
