export const manuscript = [
  'Hello!',
  'How are you?',
  'I am fine',
  'I am not fine',
  'I like big butts and I cannot lie',
  'How about next year?'
]

export function getRandomSentence() {
  return manuscript[Math.floor(Math.random() * manuscript.length)];
}