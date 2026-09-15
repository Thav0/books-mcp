import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { searchHybrid } from "./search.ts";

const BOOKS_HINT = "slug of one book, e.g. shape-up, inspired, escaping-the-build-trap, continuous-discovery-habits, lean-analytics";

serveStdio(() => {
  const server = new McpServer({ name: "product-books", version: "0.1.0" });

  server.registerTool(
    "search_product_knowledge",
    {
      description:
        "Search a local library of product engineering books. Returns the most relevant passages with book, chapter path and, for audio sources, a timestamp. Use it whenever a question touches product discovery, prioritisation, shaping work, outcomes, metrics or product management practice.",
      inputSchema: z.object({
        query: z.string().min(2).describe("The question or topic, in natural language"),
        book: z.string().optional().describe(`Restrict to one book. ${BOOKS_HINT}`),
        limit: z.number().int().min(1).max(10).default(5),
      }),
    },
    async ({ query, book, limit }) => {
      const hits = await searchHybrid(query, limit, book);
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

  return server;
});
