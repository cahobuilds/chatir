import type { Metadata } from "next";
import { PageIntro } from "./Site";

export const pages = {
  platform: {
    navTitle: "Platform",
    title: "Your company’s knowledge. An investor-ready conversation.",
    description:
      "Create and manage AI voice and chat agents around your public company information. Connect knowledge sources, shape the agent’s instructions, and review conversations from one workspace built for your IR team.",
  },
  "for-ir-teams": {
    navTitle: "For IR Teams",
    title: "Built around the questions your team hears every day.",
    description:
      "Help investors find their way through your public information, while your team focuses on the conversations that need a human touch.",
  },
  pricing: {
    navTitle: "Pricing",
    title: "A simple start to better conversations.",
    description:
      "One platform for your voice and chat agents. Start with a 14-day free trial, then $99 per month.",
  },
  resources: {
    navTitle: "Resources",
    title: "A little perspective. A better conversation.",
    description:
      "Practical guidance for bringing AI voice and chat into your investor relations experience.",
  },
  about: {
    navTitle: "About",
    title: "Make company information more approachable.",
    description:
      "Chat IR brings a conversational layer to investor relations, helping people explore the information public companies share.",
  },
  "book-a-demo": {
    navTitle: "Book a Demo",
    title: "Meet your next IR assistant.",
    description:
      "Explore voice and chat agents, see how company knowledge comes together, and discuss the right setup for your team.",
  },
  privacy: {
    navTitle: "Privacy Policy",
    title: "Privacy Policy",
    description:
      "How Chat IR collects, uses, and shares information for the marketing website and the service.",
  },
  terms: {
    navTitle: "Terms of Service",
    title: "Terms of Service",
    description: "The terms that apply when you use the Chat IR website and service.",
  },
};

export type MarketingSlug = keyof typeof pages;

export function marketingMetadata(page: MarketingSlug): Metadata {
  const p = pages[page];
  return {
    title: p.navTitle,
    description: p.description,
    alternates: { canonical: `/${page}` },
  };
}

/** Renders the shared page heading. Each route supplies its own body as children. */
export function MarketingPage({
  page,
  children,
}: {
  page: MarketingSlug;
  children: React.ReactNode;
}) {
  const p = pages[page];
  return (
    <>
      <PageIntro
        eyebrow={page.replaceAll("-", " ").toUpperCase()}
        title={p.title}
        description={p.description}
      />
      {children}
    </>
  );
}
