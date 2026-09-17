import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Header } from "./interactive";
import "./marketing.css";

/**
 * Marketing chrome. The (marketing) layout is the usual consumer; the global
 * not-found page renders it directly because it sits outside that route group.
 */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing">
      <a className="m-skip" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </div>
  );
}

export function Button({
  children = "Book a demo",
  href = "/book-a-demo",
  outline = false,
}: {
  children?: React.ReactNode;
  href?: string;
  outline?: boolean;
}) {
  return (
    <Link className={`m-button ${outline ? "m-outline" : ""}`} href={href}>
      {children}
      <ArrowUpRight size={16} />
    </Link>
  );
}

const footerGroups: [string, [string, string][]][] = [
  [
    "Product",
    [
      ["Platform", "/platform"],
      ["For IR teams", "/for-ir-teams"],
      ["Pricing", "/pricing"],
    ],
  ],
  [
    "Company",
    [
      ["About", "/about"],
      ["Resources", "/resources"],
      ["Book a demo", "/book-a-demo"],
    ],
  ],
  [
    "Legal",
    [
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
    ],
  ],
];

export function Footer() {
  return (
    <footer className="m-footer">
      <div className="m-container m-footer-top">
        <div className="m-footer-brand">
          <Link href="/" className="m-logo">
            Chat IR
            <span className="m-logo-dot" />
          </Link>
          <p>A better conversation with your investors.</p>
        </div>
        <div className="m-footer-groups">
          {footerGroups.map(([heading, links]) => (
            <nav key={heading} aria-label={heading}>
              <h2>{heading}</h2>
              <ul>
                {links.map(([label, url]) => (
                  <li key={url}>
                    <Link href={url}>{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="m-container m-footer-bottom">
        <span>© {new Date().getFullYear()} Chat IR</span>
        <Link href="/auth/login">Log in</Link>
      </div>
    </footer>
  );
}

export function Closing() {
  return (
    <section className="m-closing">
      <span className="m-eyebrow">YOUR NEXT CONVERSATION STARTS HERE</span>
      <h2>Let investors hear your story.</h2>
      <p>See what Chat IR could look like for your company.</p>
      <Button />
    </section>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="m-page-intro m-container">
      <span className="m-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}
