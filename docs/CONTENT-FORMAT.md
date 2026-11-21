# Content pack format v1

A content pack is a folder of plain files. People can read it, review it, translate it and share it, and AI tools can read it reliably. The schemas are in [`packages/content/src/schema.ts`](../packages/content/src/schema.ts); [`content/examples/solar-system`](../content/examples/solar-system) is a small complete example.

```
my-pack/
  pack.json          what the pack is
  facts.json         every piece of knowledge, with where it came from
  questions.json     questions, each linked to the facts it tests
  lessons/           optional: lessons that teach the facts
    u1-l1.json       structured lesson
    u1-l1.md         the same lesson, readable (generated)
  source/            optional: transcribed source pages (made by the pipeline)
  coverage.json      optional: check results (made by the pipeline)
```

## The key idea: everything links to facts

```
source page ──► fact ◄── lesson section
                 ▲
                 └────── question
```

- A **fact** is one small, self-contained piece of knowledge ("The Sun is a star."), with the page it came from.
- Every **lesson section** lists the facts it teaches.
- Every **question** lists the facts it tests.

So we can prove nothing was lost (every fact is taught and tested), show "learn more" after a wrong answer, and trace any question back to its page.

## pack.json

```json
{
  "formatVersion": 1,
  "id": "example-solar-system",
  "title": "Example: The Solar System",
  "language": "en",
  "subject": "science",
  "audience": { "grade": 4, "ageRange": "9-10" },
  "source": { "title": "Written for this project as a sample", "pageOffset": 0 },
  "license": "CC-BY-SA-4.0",
  "units": [
    {
      "id": "u1",
      "title": "Our Solar System",
      "lessons": [{ "id": "u1-l1", "title": "The Sun and its planets", "pages": [1, 1] }]
    }
  ]
}
```

`id`s use lowercase letters, digits and dashes. `language` is a language code such as `ar` or `en`.

## facts.json

```json
{
  "id": "u1-l1-f01",
  "unitId": "u1",
  "lessonId": "u1-l1",
  "statement": "The Sun is a star.",
  "kind": "fact",
  "pages": [1],
  "importance": "core"
}
```

`kind`: `definition`, `fact`, `process`, `function`, `classification`, `example`, `comparison`, `health-advice`, `vocabulary`. `importance`: `core` (a test would ask it) or `supporting`.

## questions.json

Multiple choice (3–4 choices, exactly one right):

```json
{
  "id": "u1-l1-q02",
  "type": "multiple-choice",
  "factIds": ["u1-l1-f02"],
  "prompt": "How many planets move around the Sun?",
  "choices": ["Six", "Eight", "Ten", "Twelve"],
  "answerIndex": 1,
  "explanation": "Eight planets move around the Sun.",
  "difficulty": 1
}
```

True / false:

```json
{
  "id": "u1-l1-q01",
  "type": "true-false",
  "factIds": ["u1-l1-f01"],
  "prompt": "The Sun is a star.",
  "answer": true,
  "explanation": "Yes! The Sun is a star.",
  "difficulty": 1
}
```

`difficulty`: 1 easy, 2 medium, 3 harder.

## Writing good questions for players

- Short: under 20 words. The player reads it between game moments.
- One clearly right answer; wrong choices should be believable but clearly wrong to someone who learned it.
- No "all of the above" or "none of the above".
- Explanations teach and are kind. Never make the player feel stupid.

## Check a pack

```sh
pnpm pipeline check --pack content/examples/solar-system
```

It validates every file and reports facts that are not taught or not tested.

## Licenses

Packs we publish use **CC BY-SA 4.0**. Packs made from copyrighted books stay private in `content/private/`, which git ignores.
