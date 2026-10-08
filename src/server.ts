import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { searchHybrid } from "./search.ts";
import { SHELVES, type Shelf } from "./shelves.ts";

// One tool per shelf. The description decides when Claude calls a tool, and the shelf keeps
// product and system design books from competing for the same results.
const TOOLS: { name: string; shelf: Shelf; description: string }[] = [
  {
    name: "search_product_knowledge",
    shelf: "product",
    description:
      "Search a local library of product engineering books. Returns the most relevant passages with book, chapter path and, for audio sources, a timestamp. Use it whenever a question touches product discovery, prioritisation, shaping work, outcomes, metrics or product management practice.",
  },
  {
    name: "search_system_design_knowledge",
    shelf: "system-design",
    description:
      "Search a local library of system design and software architecture books. Returns the most relevant passages with book and chapter path. Use it whenever a question touches distributed systems, databases, replication, partitioning, transactions, caching, messaging, stream processing, architecture styles and trade-offs, or system design interview problems.",
  },
  {
    name: "search_grokking_knowledge",
    shelf: "grokking",
    description:
      "Search the Grokking the System Design Interview course: the interview framework, back-of-the-envelope estimation, short glossary lessons (load balancing, caching, partitioning, indexes, CAP, consistent hashing, bloom filters, quorum, heartbeat), 'A versus B' trade-off lessons, and step by step designs of TinyURL, Pastebin, Instagram, Dropbox, Messenger, Twitter, YouTube, typeahead, API rate limiter, web crawler, news feed, Yelp, Uber and Ticketmaster. Returns the most relevant passages with course section, lesson and heading path. Use it for system design interview questions and when asked how this course approaches a design problem.",
  },
];

serveStdio(() => {
  const server = new McpServer({ name: "product-books", version: "0.1.0" });

  for (const tool of TOOLS) {
    const books = SHELVES[tool.shelf];
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: z.object({
          query: z.string().min(2).describe("The question or topic, in natural language"),
          book: z.enum(books).optional().describe("Restrict to one book of this shelf"),
          limit: z.number().int().min(1).max(10).default(5),
        }),
      },
      async ({ query, book, limit }) => {
        const hits = await searchHybrid(query, limit, book ? [book] : books);
        if (!hits.length) return { content: [{ type: "text", text: "No passages found." }] };
        return {
          content: hits.map((hit) => {
            const where = [hit.book, ...hit.headings].join(" > ");
            const time = hit.timestamp ? ` @ ${hit.timestamp}` : "";
            return { type: "text" as const, text: `Source: ${where}${time}\n\n${hit.text}` };
          }),
        };
      },
    );
  }

  return server;
});
