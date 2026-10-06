# A study site for the two of you: research and options

Written 2026-10-05 for the system design study in `~/Documents/system-design-study`. It answers three questions: which study methods have the best evidence and why, which of them the lessons do not use yet, and what a small Next.js and Supabase site around the lessons should add.

Review note: every page below was fetched on 2026-10-05 and every quote was checked against the saved page. The tool pages are the vendors' own documentation. The learning papers are older (2009 to 2025) because that research moves slowly, and where a newer paper disputes an older one, both are cited (free recall, section 3). Weaker sources: [1] and [12] are news releases about a paper, [15] is the authors' own informal analysis, and [17] is the FSRS project's wiki. Two claims I believe but could not fetch are in "Unverified claims" at the end.

## 1. Verdict

Build a small private Next.js site that wraps the lessons you already generate, with Supabase for logins and data. `/lesson` and its static pages stay exactly as they are.

Five things are worth building, in this order:

1. **Login and synced progress.** Your friend opens a URL instead of cloning a repo, and nothing lives only in one browser.
2. **FSRS for the review cards, with a lesson's cards first due the next day.** Spaced retrieval and sleep between sessions are the two levers for memory consolidation in this research, and this adds both.
3. **Compare answers.** Each of you answers alone, sees the other's answer only after that, talks about it on your call, and only then sees the lesson's answer.
4. **Close the book, and key points to tick.** A blank-page recall at the end of each lesson, and answers graded against 2 or 3 key points instead of a gut feeling.
5. **Notes per section**, private or shared, with a "talk about this" flag and a "make a card" button.

That is about 5 days of work. The first 2 days already give your friend the website.

The lessons are already interactive (a guess before every widget, a playground every week, and live diagrams planned in block B of the lesson-pattern plan). What is missing sits around the lessons: between the two of you, and over time.

## 2. What you already have

| Piece | Today | The gap |
|---|---|---|
| Lessons | Medium-style pages, a guess before each widget, checklist questions with hints | Your friend clones the repo and opens local files |
| Review cards | Your own page, an SM-2 scheduler, typed answers, number cards with fresh numbers | Progress lives in one browser, and you grade yourself by feel |
| Studying together | About 40 minutes of review after each lesson | The tool knows nothing about it |
| Notes | None | |

## 3. What the research says

| Method | What the research found | You have it? |
|---|---|---|
| Retrieval practice plus spacing | People who combine the two "have the best chance of remembering information" [1], yet learners underuse both [2]. In a review of ten techniques, practice testing and spreading practice over time rated highest, and rereading and highlighting rated low [3]. | Yes: the checklist and the cards |
| Guess before you learn (pretesting) | It often improves learning [4]. A 2025 meta-analysis found a clear gain for the content the question asked about (g = .66) and none for the rest of the material (g = .01) [5]. | Yes: the guess before each widget. Keep each guess on a main idea of the lesson |
| Answer alone, then discuss (peer instruction) | In physics, 59% of wrong answers became right after discussion, and 13% of right answers became wrong [6]. Students weigh their own confidence and their partner's when they pick a final answer [6]. | No |
| Confidence, then feedback | Errors made with high confidence are corrected more often after feedback than low-confidence errors [7], but they also come back more often when the correction is forgotten [8]. | No |
| Grading against key points | In the retrieval, monitoring and feedback method, the right answer is split into small "idea units", and you tick which ones your answer contained [9]. | No |
| Write what you remember (free recall) | A 2011 study found it beat studying with concept maps [10]. A 2024 preregistered replication found that the gap vanished when the concept map group also got the extra study time [11]. Writing what you remember is still retrieval practice, which is the first row. | No |
| Sleep between sessions | People who slept between two study sessions relearned faster and remembered more, "even six months later" [12]. It was a small study with 40 adults learning word pairs [12]. | In part: you study once a day |
| Mixing similar topics (interleaving) | The gain is larger when the ideas look alike, and the authors warn against it for expository texts [13]. | In part: the cards mix lessons |
| Review prompts inside an essay ("mnemonic medium") | Quantum Country put review prompts inside the text [14]. After half an hour of review practice, most readers remembered almost all of its 112 answers for at least 2 weeks [15]. Good prompts are focused, one detail at a time [16]. | Yes: lessons plus cards are this same idea |
| A better scheduler (FSRS) | FSRS beats SM-2 even with its default settings [17], in a public benchmark of about 10,000 Anki collections [18]. | No |

## 4. Options you do not have yet

| # | Option | Research behind it | Effort |
|---|---|---|---|
| 1 | Login, synced progress and a Today page | Everything else needs it | 1.5 days |
| 2 | FSRS, with a lesson's cards first due the next day | Spacing, sleep, FSRS rows | 2 hours |
| 3 | Compare answers, with how sure you were | Peer instruction and confidence rows | 1 day |
| 4 | Close the book, and key points to tick | Retrieval, key points and free recall rows | 1 day, plus a small `/lesson` change |
| 5 | Notes per section, and your own cards from notes | Writing your own prompts [16] | 1 day |
| 6 | AI feedback on typed answers | Key points row, for the answers where ticking is hard | Half a day, about $5 a month |
| 7 | "Which one fits?" cards that contrast similar ideas (cache-aside or write-through) | Interleaving row | A rule in `/lesson` |
| 8 | A daily reminder (an email, or the site on your phone's home screen) | Habit, no study fetched | 2 to 3 hours |
| 9 | Search across lessons and the glossary with Pagefind [32] | Finding "where did we learn X" | 1 hour |
| 10 | See when the other one is studying, with Supabase Presence [26] | Fun, little learning value | 1 to 2 hours |

### 4.1 Login and synced progress

- Your friend opens a URL and signs in with a magic link sent by email. You create both accounts in the Supabase dashboard, then turn off "Allow new users to sign up": with it off, "only existing users can sign in" [22]. The sign-in call sets `shouldCreateUser: false`, because otherwise a new email is signed up automatically [23].
- Progress, card state, answers and notes live in Supabase, one row per user. `review.html` already sends every read and write through `store.load()` and `store.save()`, so the move is small.
- A Today page puts things in this order: due cards first, then the next lesson, then the list for your call. One line shows your friend's progress, such as "w01-d4 done, 12 cards due".

### 4.2 FSRS, and cards that start the next day

- Replace the SM-2 rules with `ts-fsrs` (version 5.4.2, MIT license) [19] [20]. The whole scheduler is `fsrs({ request_retention: 0.9 })` and `scheduler.next(card, now, Rating.Good)` [19]. Keep 90%, which is the value your first research report chose.
- A lesson's new cards appear the day after you read it. The checklist was already that day's retrieval, and the first card review then comes after a night's sleep [12].
- Keep a log of every review in its own table. It feeds a stats page later.

### 4.3 Compare answers

1. You answer a checklist or "What would happen?" question alone, and tap how sure you are: Sure, Unsure or Guess.
2. Your friend's answer unlocks only after both of you have answered. The database enforces this (section 5), so nobody peeks by accident.
3. On your call, the "Talk about these" list shows two kinds of questions first: the ones where you disagree, and the ones someone got wrong while Sure, because confident errors are the ones feedback fixes best [7].
4. Each of you may change your answer. Only then do the lesson's answer and key points open.

The lesson's answer comes last because discussion fixes far more wrong answers than it breaks, but it does break some, and the more confident partner sways the final choice [6]. A Sure answer that was wrong also becomes a card automatically, because confident errors come back when the correction fades [8].

### 4.4 Close the book, and key points

- After the last section, a "Close the book" step gives you 3 minutes and an empty box: write everything you remember. Then the page lists the section names, you tick the ones your text covered, and each section you missed gets a "Read it again" link.
- Every checklist answer and card back shows 2 or 3 key points. You tick the ones your answer had: all of them counts as Good, some as Hard, none as Again. This is the idea-unit method [9], and it replaces the gut-feeling grade.
- The cost is in the generator: `/lesson` writes the key points (for example `data-points` on each answer), `check.mjs` requires 2 or 3, and the five week 1 lessons get theirs added once.

### 4.5 Notes per section

- A drawer next to the lesson holds one note per section per person, private by default.
- "Share" shows the note to your friend under the same section, and "Talk about this" adds it to the call list.
- "Make a card" turns a note into your own review card. Writing prompts in your own words builds understanding beyond what the text gives [16].
- Notes are tied to the lesson id and the section name, not to exact words, so they survive a rebuilt lesson.

### 4.6 AI feedback, if key points are not enough

A route handler sends the section text, the key points and your typed answer to Claude, which returns the key points it found and one hint. The API key stays on the server. At the default model's prices, that is about $0.016 per answer, or about $5 a month for both of you at 8 answers a day; Haiku 4.5 costs about a quarter of that. The key points stay the reference, because the model can be wrong. This needs an Anthropic API key, which is billed apart from a Claude subscription.

## 5. How the site fits around the lessons

```
system-design-study/              private GitHub repo, as today
  .claude/skills/lesson/          the generator, plus a small study.js
  lessons/                        built pages, as today
  web/                            new Next.js 16 app
    proxy.ts                      login check for /lessons/* and every app page
    app/today  app/learn/[id]  app/review  app/notes
    public/lessons/               copied from ../lessons when the site builds
```

- **Hosting.** Vercel's free Hobby plan is for "non-commercial, personal use only" [29], which fits. The database is Supabase's free plan.
- **Lessons behind the login.** `proxy.ts` (the new name of `middleware.ts` in Next.js 16 [28]) lists `/lessons/:path*` in its matcher and sends anyone without a session to the login page. The proxy does run for files in `public/` [27], so this one matcher entry is what keeps the lessons private. The check uses `getClaims()`, as Supabase asks [21]. To test it, open a lesson URL in a private window: you should land on the login page.
- **The lesson inside the app.** `/learn/[id]` shows the lesson page in an iframe from the same site, with the notes drawer and a progress bar around it, all in React. A small `study.js` that `build.mjs` adds to every lesson sends events up to that page: section reached, answer given, guess made. When a lesson is opened as a local file, the script finds no page around it, and the lesson works as it does today.
- **Tables.** `progress`, `answers`, `cards` (FSRS state), `reviews` (the log) and `notes`, each with a `user_id` and row level security (RLS) on. RLS works like a `where user_id = me` that the database adds to every query, so a bug in the React code cannot leak a private note.
- **No peeking, enforced by the database.** This is a sketch, and nobody has run it yet. Policies that read each other's tables never resolve, and Postgres stops with "infinite recursion detected in policy" [24]; a policy on `answers` that queries `answers` is the smallest case of that loop. So the check lives in a `security definer` function, the pattern the Supabase docs show, kept in a `private` schema because a function in an exposed schema can be called through the API with its creator's rights [24]:

```sql
create schema if not exists private;
grant usage on schema private to authenticated;

create function private.has_answered(q text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.answers
    where user_id = (select auth.uid()) and question_id = q
  );
$$;

create policy "own answers, or the other's once you answered"
on public.answers for select to authenticated
using (user_id = (select auth.uid()) or private.has_answered(question_id));
```

- **The free plan's catch.** Supabase pauses a free project after 7 days of low activity, and a few requests a day keep it awake [25]. Daily study is enough, but a holiday or a buffer week could pause it. Restoring takes a click in the dashboard, within a year [25].
- **The books stay home.** The lessons come from copyrighted books, so the site stays behind the login, and `data/` and the book search stay on your Mac. The AI feedback, if you add it, sends lesson text only.

## 6. What I would not do

- **Highlights tied to exact words.** Lessons get rebuilt when the format changes (block B upgrades all of week 1), so word-level anchors break, and highlighting rates low as a study method anyway [3]. Notes per section do the job and survive rebuilds.
- **Hypothesis as the notes tool.** One script tag adds highlights and notes [31], private groups keep them between invited members [30], and it can annotate iframes [31]. But the notes would live outside your database, so they could never become cards or reach the Today page or the call list. It is fine for a few days if you want notes before the site exists.
- **Rewriting the lessons in React or MDX.** The generator, the checker and the playground all work on static HTML. Wrapping the pages costs a day, and a rewrite would cost weeks with no gain for learning.
- **Points, levels or a leaderboard.** This is my judgment, not a fetched finding: between two friends, a ranking turns study into a race. A shared calendar of study days gives the same nudge without the race.
- **Putting the book search online.**

## 7. A suggested order

| Phase | Work | Done when | Time |
|---|---|---|---|
| 1 | The `web/` app, login, lessons behind the login, review moved to Supabase with FSRS and next-day cards, the Today page | Your friend signs in from their laptop, reads a lesson and does a review, and you see their progress on your Today page | About 2 days |
| 2 | Compare answers, close the book, key points in `/lesson`, notes | After one lesson, the call list shows your two answers side by side, and a Sure answer that was wrong is in the deck | About 3 days |
| 3 | Any of options 6 to 10 | Each one on its own | A few hours each |

## Open questions

1. Block B of the lesson-pattern plan (live diagrams, about 10 hours) is planned before week 2. Should it come before or after phase 1 of the site?
2. Do you want to build the site yourselves as Next.js and Supabase practice, or should Claude build it from a session in the study folder?
3. Should compare answers cover every checklist question, or only the "What would happen?" questions? More questions make a longer call.
4. AI feedback: worth about $5 a month, or skip it for now?

## Sources

1. https://www.sciencedaily.com/releases/2022/10/221019172239.htm, fetched 2026-10-05. News release on Carpenter, Pan and Butler (2022): combine spacing and retrieval practice.
   Quote: "The authors argue people who combine spacing and retrieval practice have the best chance of remembering information."
2. https://www.nature.com/articles/s44159-022-00089-1, fetched 2026-10-05. Abstract of the same 2022 review in Nature Reviews Psychology.
   Quote: "However, effective learning strategies are underused by learners."
3. https://www.kent.edu/psychology/all-study-strategies-not-created-equal-according-kent-state-researchers, fetched 2026-10-05. Kent State's own page on Dunlosky and colleagues (2013): practice testing and spacing rated highest, highlighting and rereading low.
   Quote: "Students everywhere, put down those highlighters and pick up some flash cards!"
   Quote: "made the grade, receiving the highest overall utility rating."
4. https://link.springer.com/article/10.1007/s10648-023-09814-5, fetched 2026-10-05. Pan and Carpenter (2023), review of pretesting.
   Quote: "The evidence to date indicates that prequestioning and pretesting can often enhance learning"
5. https://link.springer.com/article/10.1007/s10648-025-10075-7, fetched 2026-10-05. Meta-analysis of prequestions (2025).
   Quote: "We found evidence that prequestions facilitated the learning of information specific to the initial prequestions asked (g = .66)."
   Quote: "Additionally, we found no evidence of a general learning benefit of prequestions for other, non-prequestioned, information present within the educational activity (g = .01)."
6. https://cognitiveresearchjournal.springeropen.com/articles/10.1186/s41235-020-00218-5, fetched 2026-10-05. Tullis and Goldstone (2020), why peer instruction works.
   Quote: "In physics, 59% of incorrect answers switched to correct following discussion, but only 13% of correct answers switched to incorrect (Crouch & Mazur, 2001)."
   Quote: "students did consider both their own confidence and their partner’s confidence when making their final decision"
7. https://pubmed.ncbi.nlm.nih.gov/19145015/, fetched 2026-10-05 through the PubMed API. Fazio and Marsh (2009), the hypercorrection effect.
   Quote: "The hypercorrection effect is the finding that high-confidence errors are more likely to be corrected after feedback than are low-confidence errors (Butterfield & Metcalfe, 2001)."
8. https://link.springer.com/article/10.3758/s13423-011-0173-y, fetched 2026-10-05. Butler, Fazio and Marsh (2011), the effect after a week.
   Quote: "Interestingly, high-confidence errors were more likely than low-confidence errors to be reproduced on the delayed test."
9. https://ies.ed.gov/use-work/awards/developing-retrieval-monitoring-feedback-rmf-method-improving-durability-and-efficiency-student?ID=641, fetched 2026-10-05. US Institute of Education Sciences grant page for the idea-unit method.
   Quote: "Students then assess the correctness of their response by indicating which idea units from the correct answer were contained in their response."
10. https://pubmed.ncbi.nlm.nih.gov/21252317/, fetched 2026-10-05 through the PubMed API. Karpicke and Blunt (2011), Science.
    Quote: "Here, we show that practicing retrieval produces greater gains in meaningful learning than elaborative studying with concept mapping."
11. https://pmc.ncbi.nlm.nih.gov/articles/PMC10783554/, fetched 2026-10-05 through the Europe PMC API. A 2024 preregistered replication that disputes [10].
    Quote: "this advantage of retrieval practice over concept mapping vanished when participants in the concept mapping condition, too, memorized the learning material after having created a concept map."
12. https://www.sciencedaily.com/releases/2016/08/160822083446.htm, fetched 2026-10-05. News release on Mazza and colleagues (2016), Psychological Science.
    Quote: "Getting some sleep in between study sessions may make it easier to recall what you studied and relearn what you've forgotten, even six months later, according to new findings."
    Quote: "A total of 40 French adults were randomly assigned to either a "sleep" group or a "wake" group."
13. https://doi.org/10.1037/bul0000209, fetched 2026-10-05 through the OpenAlex API. Brunmair and Richter (2019), meta-analysis of interleaving.
    Quote: "A multiple metaregression analysis revealed stronger interleaving effects for learning material more similar between categories, for learning material less similar within categories, and for more complex learning material."
    Quote: "The interleaved learning, however, should be used with caution in certain conditions, especially for expository texts and words."
14. https://notes.andymatuschak.org/Mnemonic_medium, fetched 2026-10-05. Andy Matuschak's note on the mnemonic medium.
    Quote: "The mnemonic medium embeds a Spaced repetition memory system within narrative prose."
15. https://notes.andymatuschak.org/z93QR51f6HAUPLVDxE6KT1T, fetched 2026-10-05. The authors' informal analysis of Quantum Country data. The saved page has an invisible control character inside "at least", left out of the quote.
    Quote: "after half an hour of practice most readers can remember the answers to almost all of the essay’s 112 questions across intervals of at least 2 weeks"
16. https://andymatuschak.org/prompts/, fetched 2026-10-05. How to write good review prompts.
    Quote: "This guide describes how to write prompts which produce and reinforce understandings of your own, going beyond what the author explicitly provides."
    Quote: "Retrieval practice prompts should be focused."
17. https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS, fetched 2026-10-05. The FSRS project's wiki.
    Quote: "Even with the default parameters, FSRS is better than SM-2 algorithm."
18. https://github.com/open-spaced-repetition/srs-benchmark, fetched 2026-10-05 as the raw README. The public benchmark of scheduling algorithms.
    Quote: "Total number of collections (each from one Anki user): 9,999."
19. https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/README.md, fetched 2026-10-05. The ts-fsrs usage guide.
    Quote: "const result = scheduler.next(card, new Date(), Rating.Good)"
20. https://github.com/open-spaced-repetition/ts-fsrs, fetched 2026-10-05 as the raw `packages/fsrs/package.json`. Version 5.4.2 and its license.
    Quote: `"license": "MIT"`
21. https://supabase.com/docs/guides/auth/server-side/creating-a-client, fetched 2026-10-05. Supabase with Next.js: the proxy and `getClaims()`.
    Quote: "Always use supabase.auth.getClaims() to protect pages and user data."
22. https://supabase.com/docs/guides/auth/general-configuration, fetched 2026-10-05. The sign-up switch.
    Quote: "If this config is disabled, only existing users can sign in."
23. https://supabase.com/docs/guides/auth/auth-email-passwordless, fetched 2026-10-05. Magic links and `shouldCreateUser`.
    Quote: "If the user hasn't signed up yet, they are automatically signed up by default. To prevent this, set the shouldCreateUser option to false."
24. https://supabase.com/docs/guides/database/postgres/row-level-security, fetched 2026-10-05. Row level security, recursion and security definer functions.
    Quote: "Postgres raises 42P17, infinite recursion detected in policy for relation, and the query fails for every role the policies apply to."
    Quote: "A security definer function in an exposed schema is callable over the Data API with the creator's privileges."
25. https://supabase.com/docs/guides/platform/free-project-pausing, fetched 2026-10-05. Pausing of free projects.
    Quote: "Supabase pauses Free Plan projects that show low activity over a 7-day period to save server resources."
    Quote: "Once the project is paused, there is a 1-year window to restore the project on the platform from within Supabase Studio."
26. https://supabase.com/docs/guides/realtime, fetched 2026-10-05. Realtime Presence.
    Quote: "Presence: Track and synchronize user state across clients."
27. https://nextjs.org/docs/app/api-reference/file-conventions/proxy, fetched 2026-10-05. Where the proxy runs.
    Quote: "Without a matcher, Proxy runs on every request, including static files (_next/static), image optimizations (_next/image), and assets in the public/ folder."
28. https://nextjs.org/docs/messages/middleware-to-proxy, fetched 2026-10-05. The rename in Next.js 16.
    Quote: "You are using the middleware file convention, which is deprecated and has been renamed to proxy."
29. https://vercel.com/docs/plans/hobby, fetched 2026-10-05. What the free plan allows.
    Quote: "As stated in the fair use guidelines, the Hobby plan restricts users to non-commercial, personal use only."
30. https://web.hypothes.is/help/how-to-create-a-private-group/, fetched 2026-10-05. Hypothesis private groups.
    Quote: "Only group members can see annotations created within the group, and users must be invited to join a Private Group."
31. https://github.com/hypothesis/client/blob/main/docs/publishers/embedding.rst, fetched 2026-10-05 as the raw file. Adding Hypothesis to a site, including iframes.
    Quote: "To add Hypothesis to your website, just add this one line to the HTML source of each page that you want to have the Hypothesis client on:"
    Quote: "Enabling annotation of iframed content"
32. https://github.com/CloudCannon/pagefind, fetched 2026-10-05 as the raw README. Static search.
    Quote: "Pagefind is a fully static search library that aims to perform well on large sites, while using as little of your users’ bandwidth as possible, and without hosting any infrastructure."

## Unverified claims

- [unverified] FSRS needs 20 to 30% fewer reviews than SM-2 for the same retention. Only third-party summaries said so today, and the benchmark page [18] reports prediction accuracy, not review counts.
- [unverified] Dunlosky and Rawson (2012, Learning and Instruction) found that students are overconfident when they grade their own answers, and that idea units remove most of that error. Only search summaries were seen today; [9] describes the method but not that result.
- [unverified] The AI feedback cost comes from Anthropic's list prices as of 2026-09-25 ($4 and $20 per million input and output tokens for `claude-opus-5-5`, $1 and $5 for Haiku 4.5), with about 2,000 input and 400 output tokens per answer. It is an estimate, not a measurement.
- [unverified] The SQL in section 5 follows the Supabase documentation [24] but has not been run.
