import { describe, expect, it } from "vitest";
import { judgeAnswer } from "./judge";

const cases = [
  {
    "id": "Z1",
    "words": [
      "surface",
      "up",
      "top",
      "air"
    ],
    "answer": "Swim up to the surface for air."
  },
  {
    "id": "Z2",
    "words": [
      "danger",
      "unsafe",
      "seen",
      "see",
      "spot",
      "eaten"
    ],
    "answer": "More danger. Hunters can see it easily."
  },
  {
    "id": "Z3",
    "words": [
      "hungry",
      "starve",
      "fewer",
      "less",
      "die"
    ],
    "answer": "They go hungry, and there are fewer of them."
  },
  {
    "id": "Z4",
    "words": [
      "mammal"
    ],
    "answer": "A mammal. It has fur and feeds its babies milk."
  },
  {
    "id": "Z5",
    "words": [
      "heavy",
      "heavier",
      "solid"
    ],
    "answer": "Heavy bones. They help penguins sink and dive."
  },
  {
    "id": "Z6",
    "words": [
      "no",
      "doesn't",
      "not"
    ],
    "answer": "No. Its food never runs out."
  },
  {
    "id": "Z7",
    "words": [
      "hunted",
      "prey"
    ],
    "answer": "Hunted. Side eyes watch for danger all around."
  },
  {
    "id": "Z8",
    "words": [
      "no",
      "stay",
      "doesn't",
      "not"
    ],
    "answer": "No. It can stay, because the food is there."
  },
  {
    "id": "Z9",
    "words": [
      "plants",
      "plant",
      "grass",
      "leaves"
    ],
    "answer": "Plants. Flat teeth grind leaves and grass."
  },
  {
    "id": "Z10",
    "words": [
      "slow",
      "slowly",
      "sluggish"
    ],
    "answer": "Slow. Its body is cold, so it has no energy."
  }
];

describe("supplied Zoology golden pairs", () => {
  for (const c of cases) {
    it(`${c.id} accepts any listed whole word and rejects partial words`, () => {
      expect(judgeAnswer(c.answer, [c.words])).toBe(true);
      for (const word of c.words) {
        expect(judgeAnswer(word, [c.words])).toBe(true);
        expect(judgeAnswer(`xx${word}xx`, [c.words])).toBe(false);
      }
      expect(judgeAnswer("xyz", [c.words])).toBe(false);
    });
  }
});
