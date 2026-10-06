# System design in 6 months: method and roadmap

Update 2026-09-30: sections 3 to 5 and 7 are superseded by the backend-only pair plan at https://claude.ai/artifact/NqTSCVRM4r3qeK9V9etpVZ (daily 8:30 teaching session with a friend, weekend mocks). Sections 1, 2 and the sources still apply.

Written 2026-09-30. Time budget: 1 hour a day, 7 days a week, 26 weeks, which is 182 hours. Proposed dates: setup from Thursday 2026-10-01 to Sunday 2026-10-04, week 1 starts Monday 2026-10-05, week 26 ends Sunday 2027-04-04.

Nothing in this file comes from your book files. Chapter titles come from the books' published tables of contents, and the RAG will find the exact sections when lessons are generated.

Review note on the research (pages fetched 2026-09-30, numbers in brackets match `manifest.tsv` in the session scratchpad): the strongest pages are Hello Interview [5], written by an interviewer with 500+ system design interviews, the Anki manual [12], and the author's own DDIA page [14]. The job data [9] is one board (Built In) in five US and European cities, so it says nothing direct about Brazil or remote LatAm roles. The AI interview guide [1] collects community reports, and the pages [7], [8], [10] and [17] are blogs, so treat their lists as a signal and not as a rule.

## 1. Verdict

RAG is not the learning system. It is the data layer that keeps each lesson faithful to your books, and the place you ask the books a question when you are stuck.

A learning system needs four parts, and RAG serves only the second one:

| Part | Job | React/Next.js analogy |
| --- | --- | --- |
| Roadmap | Decides what you learn on which day | The router: which page renders on which day |
| Lessons | Make you understand: story, analogy, diagram, simulation | The page component, with RAG as its data fetch |
| Spaced retrieval (Anki with FSRS) | Makes you keep it: brings each fact back just before you forget it | React Query `staleTime`: revalidate before the data goes stale, and each successful revalidation makes the next `staleTime` longer |
| Practice (labs, drills, mocks) | Makes you able to design and talk under time pressure | End-to-end tests: the only proof the whole thing works in real conditions |

Your HTML lesson idea is good, so keep it. On its own, though, it is rereading with nicer visuals, and rereading is one of the weakest study techniques (section 2). Two changes make it work:

1. Every lesson ends closed-book: you answer questions, redraw the main diagram from memory, and explain the idea out loud in English.
2. Every lesson produces 4 to 6 flashcards for Anki, so each idea comes back after a few days, then a few weeks, then months (FSRS picks the exact days).

## 2. What the research says

**Interviews**

- Classic problems still dominate. A 2026 guide lists the most frequent as URL shortener, chat, news feed, rate limiter, notification system, search autocomplete and file storage [7], and all of them are chapters of the Alex Xu book you have.
- AI system design is a new interview category of its own [1]. Doctolib and Anthropic run dedicated rounds, and Google, OpenAI and others test it [1]. It still expects the classic distributed systems basics, then pushes harder on evaluation, guardrails and context design [1], and RAG is its most common pattern [1]. That is why the AI phase comes last and builds on the classic ones.
- AI system design is mostly a senior-level round [1].
- An interviewer with 500+ system design interviews recommends reading the solutions for your first 3 or 4 problems, then attempting every new problem yourself before reading any solution, and always practicing out loud [5]. The Saturday drills follow that order, and most of them come from that interviewer's list of 10 problems [5].
- Coding rounds are changing too: Hello Interview published prep guides for AI-enabled coding interviews at Meta, LinkedIn and Shopify in February 2026 [5], and a 2026 hiring guide calls fluency with tools like Claude Code a screening filter [10]. You already have that part.
- Search systems now pair an inverted index with a vector index and hybrid ranking [8], which is what you built in this repo.

**Jobs** (889 AI engineer postings from January 2026, Berlin, Amsterdam, London, Los Angeles and New York [9])

- RAG appears in 35.9% of roles, more than prompt engineering at 29.1% [9].
- Python appears in 82.5% of roles and TypeScript in 23.4% [9]. Python is the main gap for your AI engineer target: it stays out of these 6 months and comes first in the next 6.
- The role is mostly backend: nearly half of AI-first roles ask for backend skills [9], and AWS (40.1%), Docker (31.0%), CI/CD (29.3%) and Kubernetes (29.1%) show up often [9]. Strong system design is the right foundation.

**Learning**

- Practice testing and spacing practice over time are the two techniques rated most useful in a well-known review of ten study techniques, and rereading and highlighting rate low (see Unverified claims).
- In Anki's FSRS scheduler, desired retention is the most important setting, and the default of 90% balances retention and workload [12]. Keep 90%.

**Books**

- DDIA has a second edition by Kleppmann and Riccomini, announced on the author's site on 2026-03-24 [14]. Your PDF is the first edition, which is fine for the fundamentals, and the second one adds how major cloud services are designed [14]. Buy it later if you like the book.
- ByteByteGo's Generative AI System Design Interview has 10 worked questions [16], but its examples span text, retrieval, image and video systems [17], so it leans toward ML engineer roles. Skip it for now.
- For phase 7, the reference is Chip Huyen's AI Engineering (see Unverified claims).

## 3. A day (60 minutes)

| Minutes | Block | What you do | Why |
| --- | --- | --- | --- |
| 0 to 10 | Review | Anki due cards, always first, even on a bad day | Spacing and retrieval |
| 10 to 13 | Pretest | Answer the lesson's 3 opening questions before reading, guessing is fine | A wrong guess first makes the right answer stick better |
| 13 to 43 | Lesson | The HTML page: story, concept, analogy, diagram, simulation, trade-offs | Understanding, with words and pictures together |
| 43 to 53 | Recall | Close the page, answer 5 questions, redraw the diagram, explain it out loud in English for 2 minutes | Retrieval and self-explanation, and interviews are spoken |
| 53 to 60 | Cards | Check your answers, rewrite the proposed cards in your own words, add them to Anki | One fact per card, only facts you understand |

## 4. A week

- Monday to Thursday: one lesson a day, with the template above.
- Friday: build lab. Implement the week's core mechanism in TypeScript (about 50 minutes, plus Anki). Labs go into a public `system-design-labs` repo with your own code only, which doubles as a portfolio.
- Saturday: design drill. Weeks 1 to 3 are guided: read the worked solution first, then close it and redo it out loud. From week 4 on, work 40 minutes timed on Excalidraw, out loud and recorded, then spend 20 minutes comparing with the reference and writing down 3 things you missed.
- Sunday: review. Anki, a 10-question quiz that mixes this week with older weeks, and a 15-minute redo of the drill from 3 weeks ago. While you review, Claude generates next week's four lessons.

Two rules: if you miss a day, do Anki only and do not double up (weeks 13 and 26 absorb the delay), and never add a card you do not understand.

## 5. Roadmap

| Phase | Weeks | Goal | Main source |
| --- | --- | --- | --- |
| 1. Foundations | 1 to 4 | See the whole map, and HTTP, APIs and databases from the server side | Alex Xu (SDI), DDIA Part I |
| 2. Distributed data | 5 to 9 | Replication, sharding, transactions, failures, consensus | DDIA Part II |
| 3. Building blocks | 10 to 12 | Caches, queues, streams, search | SDI, DDIA Part III |
| Checkpoint | 13 | Repair weak spots, first mock interview | Your Anki stats and drill notes |
| 4. Architecture | 14 to 16 | Trade-off thinking, styles, data in microservices | Fundamentals of Software Architecture (FoSA), The Hard Parts |
| 5. Production | 17 to 18 | Reliability, observability, security, multi-tenancy | Google SRE book (free online) |
| 6. Interview practice | 19 to 21 | Timed problems and mock interviews | SDI, Hello Interview breakdowns |
| 7. AI systems | 22 to 25 | RAG, agents, LLM gateway, AI mocks | AI Engineering (Chip Huyen), this repo |
| Buffer | 26 | Catch up, final review, plan the next 6 months | |

Every lesson also carries one AI example where it fits (a semantic cache in the caching week, embedding backfills in the queues week), so phase 7 connects to things you already know.

### Week 0 (Thursday Oct 1 to Sunday Oct 4): setup

Four sessions: ingest the books, split the search, create the study repo with the `/lesson` command, and install Anki (section 7).

### Phase 1: Foundations

**W1 (Oct 5): the map**
- Mon: what the interview tests, and the 4-step framework (SDI: A Framework For System Design Interviews)
- Tue: from one server to millions, part 1: database split, vertical and horizontal scaling, load balancer, replication (SDI: Scale From Zero To Millions Of Users)
- Wed: part 2: cache, CDN, stateless web tier, data centers, message queue, sharding (same chapter)
- Thu: numbers that matter: latency table, QPS and storage estimates, p50, p95 and p99 (SDI: Back-Of-The-Envelope Estimation; DDIA: Reliable, Scalable, and Maintainable Applications)
- Fri lab: load test a small Node server with autocannon, make 1% of requests slow, watch p99 move
- Sat drill, guided: URL shortener (SDI: Design A URL Shortener)

**W2 (Oct 12): networking and APIs from the server side**
- Mon: DNS, TCP and UDP, the TLS handshake, connection reuse
- Tue: HTTP/1.1, HTTP/2 and HTTP/3, head-of-line blocking, proxies and reverse proxies
- Wed: API design: resources, status codes, idempotent methods, cursor and offset pagination, versioning, and when gRPC or GraphQL fits
- Thu: real time: polling, long polling, SSE and WebSockets, and what each costs the server (SDI: Design A Chat System, the part on these options)
- Fri lab: token bucket and sliding window rate limiters as pure TypeScript functions with tests
- Sat drill, guided: rate limiter (SDI: Design A Rate Limiter)

**W3 (Oct 19): data models and storage engines**
- Mon: relational, document and graph models, starting from access patterns (DDIA: Data Models and Query Languages)
- Tue: how a database stores data: append-only log, hash index, SSTables, LSM-trees (DDIA: Storage and Retrieval)
- Wed: B-trees, and LSM against B-tree: read cost, write cost, write amplification (same chapter)
- Thu: indexes in practice (secondary, composite, covering), full-text and vector indexes (your FTS5 and sqlite-vec), OLTP and OLAP, column storage (same chapter)
- Fri lab: a Bitcask-style key-value store in TypeScript: append-only file, in-memory hash index, compaction
- Sat drill, guided: data model and indexes for an Instagram-like app, access patterns first (Hello Interview: Data Modeling)

**W4 (Oct 26): moving data between services**
- Mon: load balancers: L4 and L7, algorithms, health checks, sticky sessions
- Tue: API gateway and service discovery, and where auth and rate limiting live
- Wed: encoding and schema evolution: JSON, Protobuf and Avro, backward and forward compatibility (DDIA: Encoding and Evolution); old React Native builds in the wild are the same problem
- Thu: unique IDs across machines: UUID v4 and v7, Snowflake, ticket servers (SDI: Design A Unique ID Generator In Distributed Systems)
- Fri lab: round-robin and least-connections balancer in Node in front of three local servers; kill one and watch the health check remove it
- Sat drill: URL shortener again at 10x traffic, unguided and timed, then compare with your W1 notes

### Phase 2: Distributed data

**W5 (Nov 2): replication (DDIA: Replication)**
- Mon: why replicate, single leader, sync and async followers, failover and its traps
- Tue: replication lag: read-your-writes, monotonic reads, consistent prefix (your optimistic UI showing old data after a refresh is the same bug)
- Wed: multi-leader replication and conflicts: last write wins, merges, CRDTs (offline-first apps, Google Docs)
- Thu: leaderless replication: quorums (R + W > N), sloppy quorums, hinted handoff, read repair
- Fri lab: simulate one leader and two async followers; reproduce a read-your-writes violation, then fix it
- Sat drill: Google Docs collaborative editing

**W6 (Nov 9): sharding (DDIA: Partitioning; SDI: Design Consistent Hashing)**
- Mon: why shard, key-range and hash partitioning, hot spots and the celebrity problem
- Tue: consistent hashing and virtual nodes
- Wed: secondary indexes on sharded data, local and global
- Thu: rebalancing and request routing: fixed partitions, dynamic splits, coordination services, gossip
- Fri lab: consistent hash ring with virtual nodes; count how many keys move when a node joins, with and without vnodes
- Sat drill: distributed key-value store (SDI: Design A Key-Value Store)

**W7 (Nov 16): transactions (DDIA: Transactions)**
- Mon: ACID, and what each letter does and does not promise
- Tue: read committed and snapshot isolation (MVCC), dirty reads, read skew
- Wed: lost updates and write skew, fixed with atomic updates, `SELECT ... FOR UPDATE`, compare-and-set or version columns
- Thu: serializable: serial execution, two-phase locking, SSI, and what Postgres gives you by default
- Fri lab: reproduce a lost update with two concurrent Node clients on a local Postgres, fix it with a row lock, then with a version column
- Sat drill: Ticketmaster (seat holds, double booking, traffic spikes)

**W8 (Nov 23): when things fail (DDIA: The Trouble with Distributed Systems)**
- Mon: partial failures, unreliable networks, how to choose timeouts
- Tue: unreliable clocks: wall clock and monotonic clock, skew, why last write wins loses data
- Wed: process pauses, leases, fencing tokens, and why the majority decides what is true
- Thu: resilience patterns: retries with exponential backoff and jitter, idempotency keys, circuit breakers, bulkheads
- Fri lab: wrap a flaky HTTP dependency with a timeout, retries with jitter and a circuit breaker; show a retry storm without jitter
- Sat drill: payment system (idempotency keys, ledger, retries, reconciliation)

**W9 (Nov 30): consistency and consensus (DDIA: Consistency and Consensus)**
- Mon: linearizability and eventual consistency, CAP said correctly, PACELC
- Tue: ordering: causality, Lamport timestamps, total order broadcast
- Wed: two-phase commit and why it blocks
- Thu: consensus: Raft in plain words, leader election, what ZooKeeper and etcd are used for
- Fri lab: simulate a leader lease with fencing tokens in TypeScript
- Sat drill: distributed job scheduler (leader election, at-least-once runs, idempotent jobs)

### Phase 3: Building blocks

**W10 (Dec 7): caching**
- Mon: where to cache, and the patterns: cache-aside, read-through, write-through, write-back (React Query is cache-aside with extras)
- Tue: eviction (LRU, LFU), TTLs, invalidation, stampedes and request coalescing, hot keys
- Wed: Redis in depth: data structures, persistence, replication, cluster, typical uses
- Thu: CDNs and HTTP caching: `Cache-Control`, `ETag`, `stale-while-revalidate`, which you know from Next.js, now seen from the server
- Fri lab: an LRU cache in TypeScript, then cache-aside in front of a slow function with single-flight stampede protection
- Sat drill: news feed (SDI: Design A News Feed System)

**W11 (Dec 14): queues, logs and async work (DDIA: Stream Processing, first half)**
- Mon: why async (decoupling, buffering, load leveling), and a queue (SQS, RabbitMQ) against a log (Kafka)
- Tue: delivery guarantees: at-most-once, at-least-once, effectively-once, idempotent consumers, ordering per partition
- Wed: Kafka in depth: partitions, consumer groups, offsets, retention, compaction, backpressure, dead-letter queues
- Thu: change data capture, event sourcing and the transactional outbox
- Fri lab: a job queue on Postgres with `FOR UPDATE SKIP LOCKED`, an idempotent consumer and a dead-letter table
- Sat drill: notification system (SDI: Design A Notification System)

**W12 (Dec 21, Christmas week): batch, streams and search (DDIA: Batch Processing, Stream Processing)**
- Mon: batch processing: MapReduce and dataflow engines in plain words
- Tue: stream processing: windows, event time and processing time, late events
- Wed: search: inverted index, BM25, Elasticsearch basics, typeahead with tries (you already built BM25 with FTS5)
- Thu: analytical data: warehouses and lakes (Hard Parts: Managing Analytical Data)
- Fri lab: windowed click counts over a generated event stream, with late events
- Sat drill: search autocomplete (SDI: Design A Search Autocomplete System)

**W13 (Dec 28, New Year): checkpoint**
- Mon to Thu: four repair lessons on your weakest topics, picked from Anki lapses and drill notes
- Fri: free
- Sat: mock interview 1 on a problem you have not seen: web crawler (SDI: Design A Web Crawler), 45 minutes, recorded
- Sun: review the plan at the halfway point and adjust it

### Phase 4: Architecture

**W14 (Jan 4): thinking in trade-offs (FoSA Part I)**
- Mon: architectural thinking, and why there are no best practices, only trade-offs (FoSA: Architectural Thinking; Hard Parts: first chapter)
- Tue: architecture characteristics: finding the "-ilities" hidden in requirements (FoSA: Architectural Characteristics Defined, Identifying Architectural Characteristics)
- Wed: modularity: cohesion, coupling, connascence (FoSA: Modularity)
- Thu: architecture quantum and component thinking (FoSA: The Scope of Architectural Characteristics, Component-Based Thinking)
- Fri lab: write an ADR on modular monolith against microservices for a product you know (FoSA: Architectural Decisions)
- Sat drill: WhatsApp-style chat (SDI: Design A Chat System)

**W15 (Jan 11): architecture styles (FoSA Part II)**
- Mon: layered and modular monolith
- Tue: pipeline, microkernel, service-based
- Wed: event-driven (broker and mediator) and space-based
- Thu: microservices, and how to choose a style
- Fri lab: turn a small layered Node app into a modular monolith with enforced module boundaries
- Sat drill: YouTube (SDI: Design YouTube)

**W16 (Jan 18): the hard parts (Software Architecture: The Hard Parts)**
- Mon: coupling and service granularity: what pulls services apart and what pulls them back together
- Tue: pulling data apart: data ownership and the shared database problem
- Wed: orchestration and choreography
- Thu: sagas, compensations and contracts
- Fri lab: an order, payment and inventory saga with an orchestrator and compensations
- Sat drill: Dropbox (SDI: Design Google Drive)

### Phase 5: Production

**W17 (Jan 25): reliability and observability**
- Mon: SLIs, SLOs, SLAs and error budgets (Google SRE book)
- Tue: overload: load shedding, backpressure, graceful degradation, cascading failures
- Wed: logs, metrics and traces, OpenTelemetry, the RED and USE methods
- Thu: releases and disasters: blue-green, canary, feature flags, multi-region, RPO and RTO, backups
- Fri lab: add OpenTelemetry traces and a p99 metric to your W11 queue
- Sat drill: metrics monitoring and alerting system

**W18 (Feb 1): security, tenants and location**
- Mon: authentication and authorization, sessions and JWT, OAuth 2.0 and OIDC
- Tue: protecting an API: secrets, encryption in transit and at rest, least privilege, abuse
- Wed: multi-tenancy: shared tables with `tenant_id`, schema per tenant, database per tenant, row-level security
- Thu: location data: geohash and quadtree for "near me" features
- Fri lab: Postgres row-level security for a two-tenant API
- Sat drill: Uber

### Phase 6: Interview practice

These three weeks use a different day template: Monday attempt problem A (40 minutes, out loud, recorded), Tuesday compare with the reference and add cards, Wednesday attempt problem B, Thursday compare, Friday a 30-minute redo of an older drill, Saturday a mock interview, Sunday review.

- **W19 (Feb 8, Carnival on Monday and Tuesday):** ad click aggregator and LeetCode (code execution at scale), then mock 2
- **W20 (Feb 15):** Facebook post search and a distributed cache, then mock 3
- **W21 (Feb 22):** three mocks (Monday, Wednesday, Saturday) on problems picked at random, with at least one human interviewer; Tuesday and Thursday are for reviewing them

### Phase 7: AI systems

**W22 (Mar 1): LLM apps are distributed systems too**
- Mon: the model as a dependency: time to first token, tokens per second, cost per token, rate limits, non-determinism, streaming with SSE
- Tue: RAG end to end: ingestion, chunking, embeddings, vector index, hybrid search, reranking (this repo is your case study)
- Wed: evaluation: golden sets, recall@k, faithfulness, LLM-as-judge, online feedback (your `eval.ts`)
- Thu: context engineering and caching for LLM apps: prompt caching, semantic caching
- Fri lab: add a reranker or a semantic cache to this RAG, and measure it with `eval.ts` before and after
- Sat drill: document Q&A assistant over a company's help center (permissions, freshness, "I don't know" answers, cost)

**W23 (Mar 8): agents and tools**
- Mon: the agent loop, tool calling, MCP (you built an MCP server)
- Tue: workflows and agents, durable execution, humans in the loop, long tasks on queues
- Wed: guardrails and security: prompt injection, data leaks, PII, sandboxed tools
- Thu: observability for LLM apps: traces, token cost per request, quality per release
- Fri lab: a small agent loop in TypeScript with one tool, tracing and a cost counter
- Sat drill: multi-step agent workflow for customer support (tools, escalation to humans, evals)

**W24 (Mar 15): AI platform at scale**
- Mon: LLM gateway: routing between providers, fallbacks, per-tenant quotas and rate limits
- Tue: inference basics: batching, KV cache, GPUs, self-hosting against an API
- Wed: vector search at scale: sharding, filtered search, recall against latency, pgvector against a dedicated store
- Thu: async AI pipelines: batch embedding jobs, backfills, re-indexing, idempotency
- Fri lab: an LLM gateway sketch with a per-tenant token bucket, provider fallback and a retry budget
- Sat drill: an AI chat feature for 1M daily users, with a cost plan

**W25 (Mar 22, Easter weekend):** two AI system design mocks and one classic mock, same format as phase 6

**W26 (Mar 29):** buffer, final review against section 8, and the plan for the next 6 months (Python and deeper AI engineering)

## 6. Your books

- **System Design Interview (Alex Xu):** the worked examples. Read each "Design ..." chapter on its Saturday, after your own attempt from week 4 on. The chapters are short.
- **DDIA (first edition):** the depth for phases 1 to 3. The lessons cover it, so read the linked section only when a lesson leaves a question open.
- **Fundamentals of Software Architecture (2nd edition, EPUB):** weeks 14 and 15, for trade-off vocabulary, styles and ADRs, which is what senior conversations use.
- **Software Architecture: The Hard Parts (EPUB):** week 16, plus parts of weeks 11 and 12. Use the EPUB and ignore the PDF copy, because pandoc gives clean headings and no OCR is needed.
- **`Unconfirmed 197684.crdownload`:** a download that never finished. Download it again if it was a fifth book.
- **Free fillers:** Hello Interview's [core concepts](https://www.hellointerview.com/learn/system-design/in-a-hurry/core-concepts) and [key technologies](https://www.hellointerview.com/learn/system-design/in-a-hurry/key-technologies) pages, plus their problem breakdowns for the drills that are not in your books.
- **Buy before week 22:** AI Engineering by Chip Huyen.

## 7. Tooling, one block at a time

1. This repo: copy the four books into `data/raw`. This is block 1, ready in `plans/260930-1845-system-design-shelf/instructions.md`.
2. Convert: Marker for the two PDFs, the EPUB route for the two EPUBs.
3. Chunk and embed with the same scripts as before.
4. Split the search: add a second MCP tool, `search_system_design_knowledge`, that searches only the new books. The current tool's description tells Claude to use it for product questions, and the new books will add more than twice as many chunks as the product books have, so unfiltered product searches would get noisier. It is the multi-tenant index pattern from week 18, built for real.
5. Eval: add about 8 system design questions to `eval/questions.jsonl` and record recall@5 for both modes. DDIA has a long index at the back, so the known front and back matter noise may show up, and it gets fixed only if the number says so.
6. New repo `~/Documents/system-design-study`: `roadmap.md` (section 5), and a `/lesson` skill that reads the day's entry, pulls passages through the MCP tool, and writes `lessons/w03-d2-<slug>.html` and `cards/w03.tsv`. `lessons/` and `cards/` stay gitignored because they are derived from book text.
7. Anki: install it, turn on FSRS, keep desired retention at 90%, and import `cards/wNN.tsv` every Sunday.
8. Around week 10: a `/mock` skill where Claude plays the interviewer and scores you against a rubric.

The study system lives in its own repo because this repo is the engine, like a headless CMS, and the study repo is the app that uses it, like the Next.js site. It is the same split that `plan.md` made for skills on 2026-09-15.

## 8. Done means (Sunday 2027-04-04)

- You can design any problem from the Alex Xu book in 45 minutes, out loud: requirements, estimates, API, data model, high-level design, two deep dives, trade-offs.
- Anki's true retention on mature cards stays at 85% or higher.
- At least three mock interviews reach "hire" on the rubric, and at least one of them is with a human.
- About 20 labs are in your public labs repo.
- You can present this RAG repo as a system design case study: ingest pipeline, index, hybrid search, eval, MCP.

## 9. Open questions

1. Search split: a second MCP tool (recommended), or one tool with a shelf filter?
2. Study repo at `~/Documents/system-design-study`, or somewhere else?
3. Start on Monday Oct 5 with setup from Thursday to Sunday this week?

Lessons will be in English, since interviews are in English, unless you say otherwise.

## Sources

Numbers match the manifest index. Page types: [1] community collection on GitHub, [5] and [12] and [14] written by the organization or author itself, the rest third-party blogs.

1. https://github.com/alexeygrigorev/ai-engineering-field-guide/blob/main/interview/questions/04-ai-system-design.md, fetched 2026-09-30. AI system design as its own category, companies, RAG as the main pattern, senior level.
   Quote: "AI system design is emerging as a distinct interview category, separate from both traditional software system design and classic ML system design."
   Quote: "AI system design is primarily a senior-level round."
5. https://www.hellointerview.com/blog/how-id-prepare, fetched 2026-09-30. Prep order, the list of 10 problems, practice out loud, AI-enabled coding interview guides.
   Quote: "Once you've done the first 3-4 problems, then start to try them on your own before jumping to reading a solution."
   Quote: "Meta's AI-Enabled Coding Interview: How to Prepare"
7. https://jobsbyculture.com/blog/system-design-interview-questions-guide-2026, fetched 2026-09-30. Most frequent classic problems.
   Quote: "The most frequently asked: URL shortener, chat/messaging system, news feed, rate limiter, notification system, search autocomplete, and file storage system."
8. https://gitgood.dev/blog/top-30-system-design-interview-questions-2026, fetched 2026-09-30. Hybrid lexical and vector search.
   Quote: "2026 reality: pair the lexical inverted index with a vector index (HNSW/IVF over embeddings) for semantic search, and combine the two with hybrid ranking."
9. https://aishippinglabs.com/blog/what-is-an-ai-engineer-based-on-job-descriptions, fetched 2026-09-30. Skills in 889 AI engineer postings.
   Quote: "RAG appears in 35.9% of roles, exceeding both prompt engineering at 29.1% and general LLM knowledge at 25.4%."
   Quote: "Here, Python dominates: it appears in 82.5% of roles, effectively making it the structural foundation of the AI engineer skill set."
10. https://www.futureproofing.dev/resources/ai-talent-gap/ai-engineer-demand-2026, fetched 2026-09-30. Agentic tool fluency as a hiring filter.
   Quote: "Day-1 productivity with agentic tools such as Claude Code."
12. https://docs.ankiweb.net/deck-options.html, fetched 2026-09-30. FSRS desired retention.
   Quote: "The default is 90%, which offers a good balance of retention and workload."
14. https://martin.kleppmann.com/2026/03/24/designing-data-intensive-applications-2e.html, fetched 2026-09-30. DDIA second edition.
   Quote: "In this second edition, authors Martin Kleppmann and Chris Riccomini build on the foundation laid in"
   Quote: "Learn how major cloud services are designed for scalability, fault tolerance, and consistency"
16. https://www.threads.com/@bytebytego/post/DChSufwSKQU/big-announcement-our-new-book-generative-ai-system-design-interview-is-available, fetched 2026-09-30. What the GenAI interview book contains.
   Quote: "10 real-world GenAI system design questions with in-depth solutions."
17. https://prachub.com/resources/generative-ai-system-design-interview-book-review-2026-is-it-still-enough, fetched 2026-09-30. The book's examples include image and video systems.
   Quote: "Its examples span text, retrieval, image, and video systems rather than limiting the discussion to chatbots."

## Unverified claims

- [unverified] Dunlosky and colleagues (2013, Psychological Science in the Public Interest) rated practice testing and distributed practice as the two high-utility techniques out of ten, and rereading and highlighting as low utility. The PubMed page came back empty, and only search result summaries were seen today.
- [unverified] Chip Huyen's AI Engineering (O'Reilly, early 2025) covers evaluation, prompt engineering, RAG and agents, finetuning, inference optimization and AI architecture. Only search result summaries were seen today.
- [unverified] The chapter titles in section 5 come from the published tables of contents as I know them, not from your files. The FoSA titles are from the 2nd edition as I remember it, so trust the RAG's headings over mine.
