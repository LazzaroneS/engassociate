const words = [
  "time",
  "person",
  "year",
  "way",
  "day",
  "thing",
  "man",
  "world",
  "life",
  "hand",
];

const selectedWords = [];
while (selectedWords.length < 3) {
  const randomIndex = Math.floor(Math.random() * words.length);
  if (!selectedWords.includes(words[randomIndex])) {
    selectedWords.push(words[randomIndex]);
  }
}

console.log(selectedWords);
