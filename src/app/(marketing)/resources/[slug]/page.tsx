import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { articles } from "@/components/marketing/content";
import { PageIntro, Button, Closing } from "@/components/marketing/Site";

export const dynamicParams = false;

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = articles.find((a) => a.slug === slug);
  if (!a) return { title: "Article not found" };
  return {
    title: a.title,
    description: a.description,
    alternates: { canonical: `/resources/${a.slug}` },
  };
}

export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = articles.find((a) => a.slug === slug);
  if (!a) notFound();
  return (
    <>
      <PageIntro eyebrow={a.category} title={a.title} description={a.description} />
      <article className="m-prose">
        {a.sections.map(([h, p]) => (
          <section key={h}>
            <h2>{h}</h2>
            <p>{p}</p>
          </section>
        ))}
        <Button href="/resources">All resources</Button>
      </article>
      <Closing />
    </>
  );
}
