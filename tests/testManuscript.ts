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

export const swedishManuscript = [
  'Tjenare!',
  'Hur är läget?',
  'Jag mår bra!',
  'Jag är så himla ledsen',
  'Min hund har fått cancer',
  'Kineser äter hund. Sjukt va?'
]

export function getRandomSwedishSentence() {
  return swedishManuscript[Math.floor(Math.random() * swedishManuscript.length)];
}