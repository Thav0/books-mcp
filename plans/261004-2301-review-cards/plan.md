# Review cards for the system design lessons

A local review page, like a small Anki, that brings each lesson's key ideas back just before you would forget them. It lives in `~/Documents/system-design-study`, next to the lessons, and runs in the browser from local files.

## Why

Every review today happens inside the lesson you just read, and nothing brings an idea back a week or a month later, which is when forgetting happens. Testing yourself and spreading practice over time are the two study techniques with the strongest evidence (Dunlosky et al., 2013), and spaced review cards do both.

## Decisions (with the user, 2026-10-04)

- Our own page, no external tool. Study is local and mostly on a desktop.
- Progress stays in the browser's storage for now. Supabase may replace it later, so every read and write of progress goes through one `load` and one `save` function.
- Cards come out of the lessons automatically, 3 to 5 per lesson, so the deck grows by about 20 cards a week and a review takes about 10 minutes a day.
- Checklist questions must be easy to understand: a concrete situation, or a short example of what is asked. Every answer must come from the lesson. The cards reuse these questions, so this rule makes the cards easy too.
- Weekends stay free. Skipped days are fine: due cards simply wait.

## Checklist questions that are easy to answer

Each checklist item becomes one plain question about a concrete situation, instead of an abstract "I can explain..." line. When the question cannot hold a situation, it gives a short example of what is asked. It has at most 30 words and ends with "?".

- **Before:** "I can explain the difference between a fault and a failure."
- **After:** "A disk dies, and users notice nothing. Was that a fault or a failure, and what would turn it into the other one?"
- **Answer:** "A fault, because one part broke but users were still served. It would become a failure if users lost the service, for example if that disk held the only copy of their photos."

The answer has 1 to 3 sentences and at most 60 words, and uses only what the section named by its `data-from` teaches. When the section does not teach it, the writer adds it to the section instead of changing the question. The checklist heading stays "What you should know now", and its counter says how many you answered right.

## How a review works

1. Open `lessons/review.html` from any lesson or the index. The top says how many cards are due today and how many are new.
2. A card shows its question. You type your answer and press Enter or "Show answer".
3. The answer appears under yours, with a "Read it again" link to the lesson section that teaches it. You grade yourself: Again, Hard, Good or Easy (keys 1 to 4).
4. A number card checks itself: it says whether your number is right, shows the worked steps, and picks Good or Again, which you can change.
5. When nothing is due, the page says how many cards come back tomorrow.

## Two kinds of cards

- **Concept cards** are checklist items marked with `data-card`, 3 or 4 per lesson, chosen because they matter most. The card's front is the checklist question, its back is the "Check my answer" text, and its link goes to the `data-from` section, so nothing is written twice:
  ```html
  <li data-from="Reliability" data-card>
  ```
- **Number cards** get new numbers on every review, so you practice the method instead of memorizing one answer. They sit in a JSON block in the lesson source, and the method they test must be taught in one of the lesson's "How to work it out" boxes:
  ```html
  <script type="application/json" class="cards">
  [{ "id": "room-after-crash", "type": "number", "from": "Reliability",
     "q": "{n} servers handle up to {cap} requests per second each, and the peak is {peak}. One server dies at the peak. How many requests per second fail?",
     "vars": { "n": [2, 3, 4], "cap": [500, 800, 1000], "extra": [100, 200, 300] },
     "let": { "room": "(n - 1) * cap", "peak": "room + extra" },
     "answer": "peak - room",
     "steps": "Room left: ({n} - 1) × {cap} = {room}. The peak is {peak}, so {answer} fail every second." }]
  </script>
  ```
  `vars` lists the values to pick from, `let` computes helper values in order, `answer` is the number to type, `steps` shows the working, and `from` names the section with the method. A fact with no variables, such as the seconds in a day, is a number card without `vars`. The answer counts as right within 2%, unless the card sets its own `tolerance`.

Card ids are the lesson id plus a short hash of the question, so progress survives a rebuild, and a reworded card starts fresh.

## Scheduling

A small version of the SM-2 rules that Anki started from, about 30 lines:

- A new card is due the day you first see it. At most 10 new cards a day, so a heavy week does not flood the next one.
- Again: due tomorrow, and the card gets harder (its ease drops).
- Hard: the interval grows a little. Good: it grows by the card's ease (2.5 at the start), so 1 day, then about 3, 7, 18 and 45. Easy: it grows faster.
- Due dates are calendar days in local time, so a review at 23:00 and one at 08:00 the next morning fall on different days.

## Storage

- One browser storage key, `review-progress-v1`, holds every card's due date, interval, ease, repetitions and lapses, plus a count of reviews per day.
- Only `store.load()` and `store.save()` touch it. Moving to Supabase later means rewriting those two functions and adding a login, with two tables: `card_progress` (user, card, due, interval, ease, reps, lapses) and `reviews` (user, card, time, grade).
- "Export progress" saves a JSON backup file, and "Import progress" restores one, because clearing browser data would wipe the schedule.

## Where the files live

All in `~/Documents/system-design-study/.claude/skills/lesson/`:

- `review.html`: the review page. `build.mjs` copies it to `lessons/review.html`, the same way it copies the playground.
- `template.html`: checklist items as questions, with `data-from` and an optional `data-card`.
- `build.mjs`: on every build, it reads the cards of every lesson in `lessons/src/` and writes `lessons/cards.js` (`window.CARDS = [...]`). Pages opened from local files cannot load a JSON file, but they can load a script. A broken card stops the build with a message, like a bad `data-from` does today.
- `check.mjs`: every checklist item is a question that ends with "?" and has at most 30 words, every answer has at most 60 words, each lesson has 3 to 5 cards, and a lesson with a "How to work it out" box has at least one number card.
- `SKILL.md`: the checklist rule above and the card rules for writers.

## Three study rules for the lessons

Small rules in the lesson skill, proposed with the cards:

1. **One question from an older lesson.** From w01-d2 on, "What would happen?" adds one question that mixes today's idea with an older lesson's. Its `data-from` names that lesson and section, such as `data-from="w01-d1 Reliability"`, and the build links the answer back to that page.
2. **Answer before you peek.** The build adds one fixed line under every checklist heading: say or write your answer first, then open "Check my answer", and tick only what you got right.
3. **One system map for the whole year.** The "Sketch it" box of every Apply it lesson asks you to add the week's parts to a single Excalidraw canvas that you keep for all 36 weeks.

## Phases

| Phase | Work | Done when | Time |
|---|---|---|---|
| 1. Questions and cards in lessons | Checklist items as questions in `template.html` and `SKILL.md`, `data-card` and the number card format, extraction in `build.mjs`, `lessons/cards.js` | A build of w01-d1 writes its cards to `cards.js`, and two builds in a row give the same ids | 35 min |
| 2. Review page | `review.html`: typed answers, the four grades, number cards with fresh numbers, "Read it again" links, the scheduler, Export and Import | Headless Chrome tests pass with a fixed test date (`review.html?today=2026-10-05`): a new card is due today, Good moves it to a later day, Again moves it to tomorrow, every number card makes valid numbers and grades a typed answer, and export then import restores the same progress | 50 min |
| 3. Checks and links | The checklist and card checks in `check.mjs`, Review links in every lesson and the index | `check.mjs` fails a lesson with an "I can explain" item, an answer over 60 words, no cards or a broken formula, and the rebuilt w01-d1 passes | 20 min |
| 4. Study rules | The three rules above in `SKILL.md`, `build.mjs` and `check.mjs` | `check.mjs` asks for an older-lesson question from w01-d2 on, every checklist shows the new line, and Apply it lessons ask for the system map | 20 min |
| 5. First deck | w01-d1's checklist rewritten as easy questions with answers taught in their sections, 4 marked as cards, and 2 number cards | `check.mjs` passes on w01-d1, and one full review of its cards works in the browser, checked with a screenshot | 20 min |

About 2 hours and 25 minutes in total. Each phase ends with its check passing before the next one starts.

## Not in this plan

- Supabase sync, a login, or a phone app.
- A schedule shared between the two study partners. Each of you reviews in your own browser.
- Cards for every highlighted word. Cards stay for the ideas worth explaining and the numbers worth knowing.

## Open questions

- Is 10 new cards a day the right limit? With 3 to 5 cards per lesson it is rarely reached, and the limit only matters after a missed week.
