function readOrigin(raw: string | undefined) {
  const value = raw?.trim();
  if (!value) return undefined;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
  } catch {
    // Treated as unset below.
  }
  return undefined;
}

/**
 * Absolute origin used for canonical URLs, Open Graph tags, the sitemap and robots.txt.
 * This is the marketing origin, which is a different host from NEXT_PUBLIC_APP_URL once
 * the two Vercel projects are split; the app URL remains only as a fallback for a
 * single-project deployment. Falling back to localhost in a deployment would publish
 * unreachable URLs to crawlers, so a deployed build fails instead of guessing.
 */
export function getSiteUrl() {
  const configured =
    readOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    readOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    readOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (configured) return configured;

  if (process.env.VERCEL) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not set. Set it to the public marketing origin (for example https://chatir.com) so canonical URLs, Open Graph tags and the sitemap resolve correctly.",
    );
  }
  return "http://localhost:3000";
}

export function getDemoContact() {
  const booking = process.env.NEXT_PUBLIC_DEMO_BOOKING_URL?.trim();
  const email = process.env.NEXT_PUBLIC_SALES_EMAIL?.trim();
  return {
    bookingUrl: booking?.startsWith("https://") ? booking : undefined,
    salesEmail: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined,
  };
}

export const articles = [
  {
    slug: "prepare-your-ir-content",
    title: "Prepare your IR content for an AI agent",
    description: "A practical starting point for organizing the public information investors need.",
    category: "IMPLEMENTATION",
    sections: [
      [
        "Start with the questions",
        "List the recurring questions your investor relations team receives. Use these to identify the reports, presentations, FAQs and contact pages an agent will need.",
      ],
      [
        "Choose a clear source of truth",
        "Start with a small set of current, public materials. Identify the reporting period and publication date for each source. Remove duplicate or superseded files so the content is easier to maintain.",
      ],
      [
        "Give content an owner",
        "Decide who on your team will review source materials and update them after a release. Establish a review routine around your reporting calendar.",
      ],
      [
        "Test before you launch",
        "Try representative investor questions, including questions that the source materials cannot answer. Review answers and references, and make sure visitors can find the human IR team when needed.",
      ],
    ],
  },
  {
    slug: "design-a-helpful-investor-experience",
    title: "Design a more helpful investor experience",
    description:
      "Make it easier for visitors to move from a question to the right company information.",
    category: "INVESTOR EXPERIENCE",
    sections: [
      [
        "Make the starting point obvious",
        "Introduce your assistant with a short explanation of what it can help with. Offer examples such as finding earnings materials, exploring company information or contacting the IR team.",
      ],
      [
        "Keep the original materials close",
        "An assistant should complement the company’s IR website. Keep reports, presentations and contact information easy to find outside the conversation as well.",
      ],
      [
        "Offer a human next step",
        "Some conversations need a person. Make the IR contact route clear, especially for questions that require context beyond published materials.",
      ],
      [
        "Learn from the questions",
        "Review recurring topics to understand where visitors need more clarity. Use those observations to improve FAQs and the organization of your website.",
      ],
    ],
  },
  {
    slug: "voice-and-chat-for-ir",
    title: "Voice and chat: two ways to open the conversation",
    description: "Consider how different interaction formats fit your investor audience.",
    category: "PRODUCT GUIDE",
    sections: [
      [
        "Chat for browsing",
        "A chat interface gives website visitors a place to ask questions while reviewing documents and navigating the IR website. It also leaves the response visible for reference.",
      ],
      [
        "Voice for conversation",
        "Voice offers a spoken way to interact. Evaluate the experience with representative questions, different speaking styles and the environments in which your audience will use it.",
      ],
      [
        "A shared content foundation",
        "Prepare the same core public information for both formats. Review how written and spoken responses communicate that information, including when the answer is unavailable.",
      ],
      [
        "Evaluate each channel",
        "Review chat conversations and voice interactions separately. Look for recurring questions and points of confusion, then refine the content and experience.",
      ],
    ],
  },
];
