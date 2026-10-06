# One pattern for every lesson

Moved on 2026-10-05: the live copy is `plans/lesson-pattern.md` in `~/Documents/system-design-study`. Edit that one, not this one.

A plan to make every future lesson follow the same pattern, stay close to the size of lesson 1, ask checklist questions that are clear, and show systems as moving things, with the playground's live diagram inside the lessons. The work happens in `~/Documents/system-design-study`. It follows the review of 2026-10-04 and the first study session of 2026-10-05.

## Why

Only one of 170 lessons exists, and it was written by hand over several rounds of feedback. The other 169 will be written by agents that each start with an empty context. Four things will make them drift or repeat a known problem:

- **Rules that are only prose.** The skill says 250 to 450 words per section. Lesson 1 has a 988-word section, and the checker still prints `problems: []`.
- **No memory between lessons.** w01-d1 points to later weeks 8 times ("week 11 shows how to prevent"), and nothing records those promises.
- **Pictures that do not move.** The playground has a live diagram with flowing dots that reacts to every change. The lessons have one static figure, and three of the five sections of w01-d1 have nothing to look at or do.
- **Checklist questions that hide what they ask.** All 7 questions of lesson 1 are two or three questions joined by "and", and three of them ask for a list without saying how long it is.

## Decisions (with the user, 2026-10-05)

- Every next lesson must follow the same pattern.
- **The playground's live diagram and its flowing dots stay.** In the user's words: "system design is not static, is dynamic, is based on the parameters that could change the whole picture". A static diagram is fine sometimes, and it is the exception.
- **Lesson 1 is the yardstick for size.** After studying it: "the total amount of words for lesson 1 was perfect, easy to understand". It took about 30 minutes alone, which is what its header said, and about 40 more to review together.
- **Checklist questions must be clearer, with a tip.** In the user's words: "we did know some answers when tapped the answer, but some questions wasnt clear enough", and for questions that ask for list items "it would be nice to have a tip to answer that, like section".
- The roadmap start stays 2026-10-05. The rest of week 1 is generated soon, so the first block below is small.
- The study folder gets a local git history, with the lesson sources in it.
- D2 may be installed and used for diagrams.
- Excalidraw is out of this plan, by the user's choice.
- Carried over from earlier: our own playground, clean figures with no hand-drawn look, our own review page, no pair teaching.

## The pattern

**A lesson** is an introduction, 3 to 6 sections, "What would happen?" with 2 or 3 questions (one from an older lesson), a checklist, and "Go deeper".

**A section** has a fixed shape:

1. The problem first, in one or two paragraphs: what goes wrong without the idea.
2. The idea, named and highlighted.
3. One thing to look at or do, dynamic first (see below).

A section may also hold up to 2 boxes ("In other words", "Wait, but...", "How to work it out", an analogy, a story, a common mistake).

An earlier draft of this plan added a quick question at the end of every section. It is dropped, because it would add about 360 words to a lesson whose size you called perfect, and the clearer checklist below already asks about every section.

## Checklist questions that are clear

Four rules, and the review cards get them for free because they reuse the checklist text:

1. **One ask per question.** A question has one "?" and no second question joined with "and". "And why?" is allowed.
2. **The question shows the shape of its answer.** It says how many things it wants and of what kind: "Name the three...", "Which of these two...", "How many...".
3. **A list question asks for 3 items at most**, and the number is in the question.
4. **Every question has a hint**, behind a "Hint" button next to "Check my answer". The build adds the section name with a link, and the writer adds one short cue that helps without giving the answer.

Two examples from lesson 1:

- **Before:** "A disk dies, a bug hangs every server, and an operator types a wrong config value. What kind of fault is each, and what is one defense for each?" It asks for six things.
- **After:** "Name the three sources of faults in a system." Hint: "Reliability. One is about machines, one about code, one about us."

- **Before:** "Your system is a big ball of mud, and a new engineer joins. Which part of maintainability is broken, and what are the other two?"
- **After:** "A new engineer cannot follow your code, because it is a big ball of mud. Which of the three parts of maintainability is broken?" Hint: "Maintainability. Each part makes the system easy to do one thing."

A lesson has 5 to 8 of these questions, at least one per section. The checker fails a question with two asks or without a hint. The weekly review adds a test that a checker cannot do: a fresh agent reads the lesson, answers every question without seeing the answers, and each question it answers differently from the key gets rewritten.

## Dynamic first

Every lesson has at least one live block, and the kind of picture follows one rule:

| When the picture... | Use | Built from |
|---|---|---|
| changes with a number or a failure (traffic, servers, a dead part, a cache hit rate) | A **live diagram**: the playground's own stage inside the lesson, with its flowing dots, 1 to 3 controls, a guess first and the reason after | The playground kit, mounted in the lesson |
| is about order (a request's path, a handshake, a cache miss then a hit) | A **path diagram**: the same parts and the same flowing dots, one hop per click of Next | A new shared model in the kit |
| is structure that does not move (a data model, a comparison, a map of parts) | A **static figure** | D2, or hand-written SVG if D2 fails its test |

What this means for the code:

- **The kit learns to live inside a lesson.** Today `kit.js` builds one whole page and finds its parts by page-wide ids. It gets a `Playground.mount(container, config)` that works inside any element, several times per page, and `Playground.start` becomes a thin wrapper around it. The playground pages and the sandbox keep their look and behavior, pixel for pixel.
- **A live diagram in a lesson is one playground challenge**: a question, guesses, a starting state, the controls to show, a reason, and a number proof. The lesson checker runs the proof, so a live diagram whose numbers do not back its answer cannot pass. Lesson widgets have no such proof today.
- **Shared models arrive the week they are first needed**, written once and reused by lessons, playgrounds and the sandbox: the system model (exists), the path model (week 1), a sorter (week 2), a builder for endpoints and tables (week 3), a CDN part (week 4), shards (week 6), a cache over time (week 7), queue and workers (week 8), a rate limiter (week 9), a calculator (week 10). A custom widget written for one lesson stays possible, and the week brief must say why no shared model fits.
- **One look everywhere.** Lesson pictures and the playground use two different styles today. Live and path diagrams use the kit's parts, and the D2 style file copies their shapes and colors.

## Size and load limits

Lesson 1 is the yardstick, so each limit sits just above what lesson 1 has. No words are cut from it.

The rule that lets topics differ: **the size of a section is capped, and the number of sections moves.** A small topic gets 3 short sections, and a big one gets 6. A topic that still does not fit is split over two days or sends its detail to a named later lesson, and that is decided before anything is written.

The checker counts words, because it already does. Characters are words times 5.5, spaces included, measured on lesson 1.

| What | Aim for | Checker fails above | In characters | Lesson 1 |
|---|---|---|---|---|
| Sentence | under 20 words | 30 words | 165 | longest is 29 |
| Paragraph | 2 to 4 sentences | 80 words | 440 | passes |
| Introduction | 120 to 180 words | 220 words | 1,200 | 191 |
| One section, with its boxes | 350 to 500 words | 650 words | 3,600 | 396, 988, 485, 368, 447 |
| Sections | 4 or 5 | 6 | | 5, and 6 after the split below |
| Lesson body (introduction and sections) | 2,000 to 2,800 words | 3,000 words | 16,500 | 2,875 |
| Whole page, with questions and checklist | 3,000 to 3,700 words | 4,000 words | 22,000 | 3,748 |
| New highlighted terms | 2 to 4 per section | 4 per section, 18 per lesson | | 17 |
| Formulas | 0 or 1 per section | 2 per section, 5 per lesson | | 5, and 3 in one section |
| Boxes in a section | 1 | 2 | | 3 in Reliability |
| Minutes in the header | 25 to 30 | 35 | | 30 |

The checker also fails a section under 200 words and a body under 1,500 words.

Lesson 1 breaks one limit, in one place: Reliability has 988 words, 3 formulas and 3 boxes. It gets a second heading at "Where do faults come from?", which makes two sections of 602 and 386 words with no word removed. The second one then needs one thing to look at or do.

Why these numbers:

- **4 new terms per section.** Working memory holds about four new things at once (Cowan, 2001). The skill already says 2 to 4, and the checker will now count them.
- **650 words per section.** That is about 4 minutes with its picture. A reader who stops after any section has finished one whole idea.
- **3,000 words of body.** Lesson 1 has 2,875 and took the 30 minutes its header promised, so the reading speed in `build.mjs` (230 words per minute) is right and stays.

These limits are constants at the top of `check.mjs`, so changing one is a one-line edit.

## How the pattern is kept

Six guards, from cheapest to most expensive:

1. **The checker is the contract.** Every rule above gets a check. A rule that cannot be checked is cut from the skill or moved to the weekly review.
2. **A test for the checker.** `scripts/test.mjs` makes one broken copy of the model lesson for each check and confirms the check catches it. The checker changed four times in five days, each time tested with throwaway scripts.
3. **A model lesson.** Lesson 1 is the example every writer reads for voice, depth and size. One example holds a style better than sixty rules.
4. **A week brief, approved before writing.** `briefs/wNN.json` lists, for each day, its checklist questions with hints, the terms it owns, its live block and the model behind it, the promises it must pay, and the week's running system with its numbers. You read it in 2 minutes and approve it before 2 hours of generation start.
5. **A ledger of what was taught.** `build.mjs` writes `lessons/ledger.json` from the lesson sources: highlighted terms, promises to later weeks, stories and analogies. `day.mjs` gives each writer the terms already taught, the stories already used, and the promises owed to its lesson. A lesson pays a promise by marking the sentence with `data-pays`, and `check.mjs --week N` fails while a promise to week N is unpaid.
6. **A weekly review by a fresh agent.** It rechecks every number and credited claim against the library, and it answers every checklist question blind, as described above.

Each built page also carries a format number. When the pattern changes later, `check.mjs --all` lists the lessons built with an older format, so you know what to upgrade.

## Phases

### Block A: before this week's lessons (about 3.5 hours)

| Phase | Work | Done when | Time |
|---|---|---|---|
| 0. Safety net | `git init` in the study folder with no remote. First commit: the skills, `roadmap.json` and `lessons/src/`. | `git log` shows the commit, and `git status` is clean | 10 min |
| 1. Clear checklist questions | The four checklist rules in `SKILL.md` and `template.html`. `data-hint` on items, the "Hint" button in the lesson and on the review cards, the hint in `cards.js`. The two checks. Lesson 1's checklist rewritten as 5 to 8 single questions with hints. | The checker fails a question with two asks and a question with no hint. Lesson 1 passes, its hints show before its answers in a screenshot, and a review card shows its hint. | 1.5 h |
| 2. Limits and the model lesson | The limits table in `check.mjs`, with the skill and the checker agreeing on every number. Reliability's second heading. Two lines in the writer prompt: read lesson 1 as the model, and read this week's earlier lessons so their terms and stories are not repeated. | Lesson 1 passes every limit. A copy with a 700-word section fails, and so does a copy with 19 terms. | 1 h |
| 3. A faster checker | Text checks run first, and Chrome starts only when they pass. `--fast` skips Chrome. Find why one check takes 113 seconds when Chrome's own limit is 40. | `--fast` takes under 3 seconds and a full check under 30 | 45 min |

Then you run `/lesson week 1` for days 2 to 5, which takes about 1.5 hours plus 15 minutes for the day 5 playground. These four lessons use today's widgets and static figures.

### Block B: before week 2 (lean, about 6.5 hours)

On the evening of 2026-10-05 the user chose a lean block B over the original 10 hours. It keeps the live diagrams and every guard that enforces the user's own rules ("close every loop", clear questions). It defers the path model and the checker's self-test to block C, and upgrades only lesson 1, because lessons 2 to 5 of week 1 are read before block B ends.

| Phase | Work | Done when | Time |
|---|---|---|---|
| 4. Live diagrams in lessons | `Playground.mount`, kit styles that do not leak into the lesson page, and the live diagram block with its proof. The format number moves here from phase 6: the checker asks every lesson of the new format for a live block and every section for something to look at or do, and it runs every proof. Lessons built before this phase keep their format and pass under the rules they were built with. | The sandbox and `play/w01-d1.html` look the same in before and after screenshots, and their checker still passes. A test lesson shows two live diagrams on one page, in light and dark mode, with mouse and keyboard. A wrong proof fails the lesson check. `w01-d2` to `w01-d5` still pass. | 3 h |
| 5. Lesson 1 upgraded | Lesson 1's widget becomes a live block, and each of its sections gets something to look at or do. No text is rewritten. | Lesson 1 passes the new checker, and you approve it as the final model. | 45 min |
| 6. Memory between lessons | The ledger, the week brief, `data-pays`, `--week` and `--all`, the weekly review agent with its blind test, the kinds `walkthrough` and `practice` in `roadmap.json`, and a shorter `SKILL.md` with one line per checked rule. | `day.mjs w02d1` prints the terms week 1 taught and the promises owed to it. A test lesson that repeats a taught term as new, or leaves a promise unpaid, fails. The brief format is ready, and the week 2 brief is drafted in a local session, because it needs the book library. | 3 h |

Until the path model exists, a picture about order (a request's path, a handshake) is a static figure. The week brief names the first lesson that needs the path model, and building it becomes part of that week's preparation.

### Running block B in a cloud session

Block B may run in a Claude Code cloud session on the GitHub repo, so the laptop can sleep. Three things differ there:

- **Chrome.** Both checkers call Chrome at its macOS path. The session reads the path from a `CHROME` environment variable with the macOS path as the default, installs Chromium if none is present, and runs every Chrome check. If no Chromium can be installed, it says so, and the Chrome checks run later on the Mac.
- **The book library.** `search_system_design_knowledge` only exists on the Mac. Block B writes code, not lessons, so it does not need the library, but the week 2 brief and any run of the weekly review agent wait for a local session.
- **Git.** The session works on its own branch, commits once per phase, and pushes that branch. The user reviews and merges, so the friend never pulls half-done work from `main`.

### Block C: later, blocking nothing

| Phase | Work | Done when | Time |
|---|---|---|---|
| 7a. Deferred from block B | The path model (one hop per click of Next, with the same parts and flowing dots), built when the week brief first needs it. `scripts/test.mjs`, which makes one broken copy of the model lesson for each check and confirms the check catches it. | A test lesson shows a path diagram in light and dark mode. Every check in `check.mjs` has a broken copy that fails it. | 2.5 h |
| 7. Static figures and extra blocks | `brew install d2`. Draw lesson 1's figure and one data model in D2, next to hand-written SVG, and you pick from screenshots. If D2 wins, `build.mjs` compiles D2 blocks with the shared style file. Also a "label the diagram" mode and a "Lab" box for commands the generator ran itself. Needed before week 3, the data model week. | With D2: a figure builds inline, under 40 KB, readable in both themes, and a broken D2 block stops the build with its line number. Without D2: the checker flags labels that overlap or leave the figure. | 3 h |
| 8. Playground: time and motion | The stage and its flowing dots stay as they are. On top of them: dots that get denser as traffic grows, dots that wait in line in front of a full part, a clock with play and pause, and a small chart of the last 60 seconds. | The sandbox shows a line growing when traffic passes capacity and draining when it drops, with its numbers proven by the playground checker. | 1 to 2 days, spread over weeks 2 to 8 |

Each phase ends with its check passing before the next one starts. After block B, a normal week costs a 5-minute brief, about 2 hours of generation and a 10-minute review.

## Not in this plan

- A drag-and-drop builder for the playground. Toggles cover the Basics level.
- Supabase, a login, or progress shared between the two of you. Those are now in the study site plan, `.specs/features/study-site/` in the study repo.
- A hand-drawn look for lesson pictures, or an outside simulator in place of our playground.
- Any Excalidraw work: no shared workspace, no shape library and no answer key drawn by an agent. The "Sketch it" boxes that the lesson skill already has are not touched by this plan.
- Publishing lessons anywhere. They stay local and between the two study partners.

## Open questions

None for now.
