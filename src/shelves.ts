// Books grouped by subject. Each MCP tool searches one shelf, so product and system design
// books never compete for the same top results. The Grokking course has a shelf of its own, so
// its short, keyword-dense lesson chunks never enter the other shelves' results.
export const SHELVES = {
  product: ["shape-up", "inspired", "escaping-the-build-trap", "continuous-discovery-habits", "lean-analytics"],
  "system-design": [
    "system-design-interview",
    "designing-data-intensive-applications",
    "software-architecture-the-hard-parts",
    "fundamentals-of-software-architecture",
    "building-evolutionary-architectures",
  ],
  grokking: ["grokking-system-design-interview"],
} as const;

export type Shelf = keyof typeof SHELVES;

export function shelfOf(book: string): Shelf | undefined {
  return (Object.keys(SHELVES) as Shelf[]).find((shelf) => (SHELVES[shelf] as readonly string[]).includes(book));
}
