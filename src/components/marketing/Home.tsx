import Image from "next/image";
import Link from "next/link";
import {
  MessageCircle,
  AudioLines,
  ChartNoAxesColumnIncreasing,
  FileText,
  ArrowRight,
} from "lucide-react";
import { AgentDemo } from "./interactive";
import { Button, Closing } from "./Site";
import { articles } from "./content";

const benefits = [
  {
    icon: MessageCircle,
    title: "Answer through chat",
    text: "Help visitors explore company information on your IR website.",
  },
  {
    icon: AudioLines,
    title: "Connect through voice",
    text: "Give investors a natural way to ask questions.",
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: "Understand every conversation",
    text: "Review conversations and discover what investors want to know.",
  },
];

const steps = [
  ["Connect your content", "Bring together your public reports, presentations and FAQs."],
  ["Launch your agents", "Make voice and chat part of your investor experience."],
  ["Review conversations", "See the questions investors are asking."],
];

function Sources() {
  return (
    <div className="m-sources">
      <div className="m-sources-head">
        <strong>Knowledge sources</strong>
        <span>Illustrative view</span>
      </div>
      {["Annual report", "Earnings presentation", "Investor FAQs"].map((t) => (
        <div className="m-document" key={t}>
          <FileText size={22} />
          {t}
          <span>PDF</span>
        </div>
      ))}
      <div className="m-connectors" />
      <div className="m-agent-pair">
        <div>
          <MessageCircle />
          <span>Chat agent</span>
        </div>
        <div>
          <AudioLines />
          <span>Voice agent</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <section className="m-hero">
        <Image
          className="m-hero-image"
          src="/images/marketing/architecture.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <div className="m-hero-veil" />
        <div className="m-container">
          <div className="m-hero-copy">
            <span className="m-eyebrow">BUILT FOR INVESTOR RELATIONS</span>
            <h1>
              Your investor relations.
              <br />
              Always available.
            </h1>
            <p>
              AI voice and chat agents that help investors explore
              <br className="m-desktop" /> your company’s public information.
            </p>
            <div className="m-actions">
              <Button />
              <Button href="#agent-demo" outline>
                Meet your IR agent
              </Button>
            </div>
          </div>
          <AgentDemo />
        </div>
      </section>
      <section className="m-benefits">
        <div className="m-container">
          <span className="m-eyebrow">MORE CONNECTION. LESS REPETITION.</span>
          <h2>
            More access for investors.
            <br />
            More focus for your team.
          </h2>
          <div className="m-card-grid">
            {benefits.map(({ icon: Icon, title, text }) => (
              <article className="m-benefit" key={title}>
                <Icon size={32} strokeWidth={1.4} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="m-how">
        <div className="m-container m-split">
          <div>
            <span className="m-eyebrow">HOW IT WORKS</span>
            <h2>
              From your content to
              <br />
              your next conversation.
            </h2>
            <div className="m-steps">
              {steps.map(([t, d], i) => (
                <div className="m-step" key={t}>
                  <span>0{i + 1}</span>
                  <div>
                    <h3>{t}</h3>
                    <p>{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Sources />
        </div>
      </section>
      <section className="m-content-section m-home-band m-home-pricing">
        <div className="m-container">
          <span className="m-eyebrow">PRICING</span>
          <h2>One plan. Both channels.</h2>
          <div className="m-price">
            $99<small> / month</small>
          </div>
          <p>
            14 days free to start. Card required at signup. Voice-provider usage is billed
            separately.
          </p>
          <div className="m-actions">
            <Button href="/auth/login?mode=signup">Start your free trial</Button>
            <Button href="/pricing" outline>
              See what’s included
            </Button>
          </div>
        </div>
      </section>
      <section className="m-content-section m-home-band m-section-sage">
        <div className="m-container">
          <span className="m-eyebrow">RESOURCES</span>
          <h2>Guidance for your rollout.</h2>
          <div className="m-card-grid">
            {articles.map((a) => (
              <article className="m-light-card" key={a.slug}>
                <span className="m-eyebrow">{a.category}</span>
                <h3>
                  <Link href={`/resources/${a.slug}`}>{a.title}</Link>
                </h3>
                <p>{a.description}</p>
                <Link className="m-text-link" href={`/resources/${a.slug}`}>
                  Read guide
                  <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <Closing />
    </>
  );
}
