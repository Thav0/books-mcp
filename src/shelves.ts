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
  // Node.js and frontend books share one shelf: the owner treats JavaScript and TypeScript work as one group.
  typescript: [
    "nodejs-design-patterns",
    "the-conscious-node",
    "frontend-architecture-for-design-systems",
    "advanced-react",
    "web-performance-fundamentals",
    "building-large-scale-web-apps",
    "building-micro-frontends",
    "frontend-system-design-essentials",
    "frontend-system-design-essentials-videos",
  ],
  ai: ["the-ai-playbook", "ai-engineering"],
  "inventory-pricing": ["inventory-optimization", "pricing-and-revenue-optimization"],
} as const;

export type Shelf = keyof typeof SHELVES;
type Slug = (typeof SHELVES)[Shelf][number];

// Human names for the MCP server instructions, so a client knows which books exist before it calls
// a tool. The Record type makes typecheck fail when a shelf gains a slug without a title here.
export const BOOKS: Record<Slug, string> = {
  "shape-up": "Shape Up, Ryan Singer",
  inspired: "Inspired, Marty Cagan",
  "escaping-the-build-trap": "Escaping the Build Trap, Melissa Perri",
  "continuous-discovery-habits": "Continuous Discovery Habits, Teresa Torres",
  "lean-analytics": "Lean Analytics, Alistair Croll and Benjamin Yoskovitz (audiobook transcript)",
  "system-design-interview": "System Design Interview, Alex Xu",
  "designing-data-intensive-applications": "Designing Data-Intensive Applications, Martin Kleppmann",
  "software-architecture-the-hard-parts": "Software Architecture: The Hard Parts, Neal Ford, Mark Richards, Pramod Sadalage, Zhamak Dehghani",
  "fundamentals-of-software-architecture": "Fundamentals of Software Architecture, Mark Richards and Neal Ford",
  "building-evolutionary-architectures": "Building Evolutionary Architectures, Neal Ford, Rebecca Parsons, Patrick Kua",
  "grokking-system-design-interview": "Grokking the System Design Interview, DesignGurus course (65 lessons)",
  "nodejs-design-patterns": "Node.js Design Patterns, 3rd edition, Mario Casciaro and Luciano Mammino (2020)",
  "the-conscious-node": "The Conscious Node (2026), production Node.js practices",
  "frontend-architecture-for-design-systems":
    "Frontend Architecture for Design Systems, Micah Godbolt (a third-party chapter summary with quizzes, not the full book)",
  "the-ai-playbook": "The AI Playbook: Mastering the Rare Art of Machine Learning Deployment, Eric Siegel (2024)",
  "ai-engineering": "AI Engineering: Building Applications with Foundation Models, Chip Huyen (2025)",
  "inventory-optimization": "Inventory Optimization: Models and Simulations, Nicolas Vandeput (2020)",
  "pricing-and-revenue-optimization": "Pricing and Revenue Optimization, 2nd edition, Robert L. Phillips (2021)",
  "advanced-react": "Advanced React: Deep Dives, Investigations, Performance Patterns and Techniques, Nadia Makarevich (2023)",
  "web-performance-fundamentals":
    "Web Performance Fundamentals: A Frontend Developer's Guide to Profile and Optimize React Web Apps, Nadia Makarevich (2025)",
  "building-large-scale-web-apps": "Building Large Scale Web Apps: A React Field Guide, Addy Osmani and Hassan Djirdeh (2024)",
  "building-micro-frontends":
    "Building Micro-Frontends: Distributed Systems for the Frontend, 2nd edition, Luca Mezzalira (2025)",
  "frontend-system-design-essentials": "Frontend System Design Essentials, Juntao Qiu, the course book (22 chapters and 2 case studies)",
  "frontend-system-design-essentials-videos":
    "Frontend System Design Essentials, Juntao Qiu, the course videos (transcripts of 47 lessons)",
};

export function shelfOf(book: string): Shelf | undefined {
  return (Object.keys(SHELVES) as Shelf[]).find((shelf) => (SHELVES[shelf] as readonly string[]).includes(book));
}
