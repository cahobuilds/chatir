import Link from "next/link";
import { MessageCircle, AudioLines, FileText, ArrowRight } from "lucide-react";
import { articles } from "./content";

const icons = [FileText, MessageCircle, AudioLines];

export default function Resources() {
  return (
    <div className="m-container m-article-grid">
      {articles.map((a, i) => {
        const Icon = icons[i % icons.length];
        return (
          <article className="m-article-card" key={a.slug}>
            <div className="m-article-art">
              <Icon />
            </div>
            <div>
              <span className="m-eyebrow">{a.category}</span>
              <h2>
                <Link href={`/resources/${a.slug}`}>{a.title}</Link>
              </h2>
              <p>{a.description}</p>
              <Link className="m-text-link" href={`/resources/${a.slug}`}>
                Read guide
                <ArrowRight size={16} />
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
