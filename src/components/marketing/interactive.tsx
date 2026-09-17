"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Menu,
  X,
  ArrowUpRight,
  ArrowRight,
  MessageCircle,
  AudioLines,
  Send,
  Sparkles,
  Play,
  Square,
} from "lucide-react";
export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // The home page hero is a dark image, so the header sits on top of it instead of above it.
  const overlay = pathname === "/";
  return (
    <header className={`m-header ${overlay ? "m-header-overlay" : ""}`}>
      <div className="m-container m-nav">
        <Link href="/" className="m-logo" aria-label="Chat IR home">
          Chat IR
          <span className="m-logo-dot" />
        </Link>
        <button
          className="m-menu"
          aria-expanded={open}
          aria-controls="marketing-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav id="marketing-nav" className={open ? "is-open" : ""} aria-label="Main navigation">
          {[
            ["Platform", "/platform"],
            ["For IR teams", "/for-ir-teams"],
            ["Pricing", "/pricing"],
            ["Resources", "/resources"],
          ].map(([t, h]) => (
            <Link
              key={h}
              href={h}
              aria-current={pathname === h ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {t}
            </Link>
          ))}
          <Link className="m-login" href="/auth/login" onClick={() => setOpen(false)}>
            Log in
          </Link>
          <Link className="m-button" href="/book-a-demo" onClick={() => setOpen(false)}>
            Book a demo
            <ArrowUpRight size={15} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
const answers = [
  {
    q: "Where can I find your latest results?",
    a: "You can explore our latest earnings release and investor presentation in the company’s results centre.",
  },
  {
    q: "What can I ask the agent?",
    a: "Ask about published company information, where to find investor materials, or how to contact the IR team.",
  },
  {
    q: "Can I speak to the IR team?",
    a: "Your company’s agent can point investors to the contact information in its knowledge sources when they need a human conversation.",
  },
];
export function AgentDemo() {
  const [tab, setTab] = useState("chat");
  const [answer, setAnswer] = useState(answers[0]);
  const [input, setInput] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const speech = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
    },
    [],
  );
  function play() {
    if (!("speechSynthesis" in window)) {
      setVoiceError("Audio preview is unavailable in this browser. Read the transcript below.");
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(
      "Welcome. I’m an illustrative investor relations assistant. I can help you explore published company information and find investor materials. What would you like to know?",
    );
    speech.current = u;
    u.onend = () => setSpeaking(false);
    u.onerror = () => {
      setSpeaking(false);
      setVoiceError("Audio preview could not play. The transcript is available below.");
    };
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }
  return (
    <div className="m-demo" id="agent-demo">
      <div className="m-demo-intro">
        <span className="m-eyebrow">EXPERIENCE CHAT IR</span>
        <h2>
          A conversation <br />
          with your company.
        </h2>
        <div className="m-tabs" role="tablist" aria-label="Agent demonstration">
          {["chat", "voice"].map((t) => (
            <button
              role="tab"
              aria-selected={tab === t}
              aria-controls="demo-panel"
              key={t}
              onClick={() => {
                setTab(t);
                window.speechSynthesis?.cancel();
                setSpeaking(false);
              }}
            >
              {t === "chat" ? <MessageCircle size={17} /> : <AudioLines size={17} />} {t}
            </button>
          ))}
        </div>
        <small>Illustrative demo · No live company data</small>
      </div>
      <div
        className="m-demo-body"
        id="demo-panel"
        role="tabpanel"
        aria-label={`${tab} agent preview`}
      >
        {tab === "chat" ? (
          <>
            <div className="m-question">{answer.q}</div>
            <div className="m-answer" aria-live="polite">
              <span className="m-spark">
                <Sparkles size={17} />
              </span>
              <p>{answer.a}</p>
            </div>
            <div className="m-demo-chips">
              {answers.slice(1).map((a) => (
                <button key={a.q} onClick={() => setAnswer(a)}>
                  {a.q}
                  <ArrowUpRight size={12} />
                </button>
              ))}
            </div>
            <form
              className="m-chat-input"
              onSubmit={(e) => {
                e.preventDefault();
                if (!input.trim()) return;
                setAnswer({
                  q: input.trim(),
                  a: "This is an illustrative preview. A configured Chat IR agent uses your company’s connected knowledge sources. Book a demo to explore a company-specific experience.",
                });
                setInput("");
              }}
            >
              <label className="m-sr" htmlFor="demo-question">
                Ask an investor question
              </label>
              <input
                id="demo-question"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask an investor question…"
                maxLength={500}
              />
              <button aria-label="Send question" disabled={!input.trim()}>
                <Send size={16} />
              </button>
            </form>
          </>
        ) : (
          <div className="m-voice">
            <AudioLines size={46} strokeWidth={1} />
            <h3>A natural way to connect.</h3>
            <p>
              “Welcome. I can help you explore published company information and find investor
              materials.”
            </p>
            <button className="m-button" onClick={play}>
              {speaking ? <Square size={16} /> : <Play size={16} />}{" "}
              {speaking ? "Stop preview" : "Play voice preview"}
            </button>
            <small>Browser-generated sample · Not a live agent</small>
            {voiceError && <p role="status">{voiceError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export function DemoBooking({
  bookingUrl,
  salesEmail,
}: {
  bookingUrl?: string;
  salesEmail?: string;
}) {
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("Platform walkthrough");

  const mailto = salesEmail
    ? `mailto:${salesEmail}?subject=${encodeURIComponent("Chat IR demo request")}&body=${encodeURIComponent(
        `Company: ${company || "[company name]"}\nName: ${name || "[your name]"}\nEmail: ${email || "[your email]"}\nWhat we'd like to see: ${topic}\n`,
      )}`
    : undefined;

  return (
    <section className="m-content-section m-section-sage">
      <div className="m-container m-split">
        <div>
          <span className="m-eyebrow">A WALKTHROUGH FOR YOUR TEAM</span>
          <h2>
            Bring your questions.
            <br />
            We’ll bring the platform.
          </h2>
          <ul className="m-list">
            <li>Explore the investor-facing agent experience</li>
            <li>See how knowledge sources are managed</li>
            <li>Review conversation history and analytics</li>
            <li>Discuss pricing and your rollout</li>
          </ul>
        </div>
        <div className="m-light-card">
          <span className="m-eyebrow">LET’S CONNECT</span>
          <h3>See Chat IR in action.</h3>
          {bookingUrl ? (
            <>
              <p>Choose a convenient time for your team.</p>
              <a className="m-button" href={bookingUrl}>
                Choose a time
                <ArrowRight size={16} />
              </a>
              {salesEmail && (
                <p className="m-price-note">
                  Or email <a href={`mailto:${salesEmail}`}>{salesEmail}</a>.
                </p>
              )}
            </>
          ) : salesEmail ? (
            <form
              className="m-demo-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!mailto) return;
                window.location.href = mailto;
              }}
            >
              <p>Tell us who you are and what you’d like to explore. We’ll follow up by email.</p>
              <label className="m-sr" htmlFor="demo-company">
                Company
              </label>
              <input
                id="demo-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company"
                required
              />
              <label className="m-sr" htmlFor="demo-name">
                Your name
              </label>
              <input
                id="demo-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
              <label className="m-sr" htmlFor="demo-email">
                Work email
              </label>
              <input
                id="demo-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Work email"
                required
              />
              <label className="m-sr" htmlFor="demo-topic">
                What you’d like to see
              </label>
              <select id="demo-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
                <option>Platform walkthrough</option>
                <option>Knowledge sources and setup</option>
                <option>Voice and chat agents</option>
                <option>Pricing and rollout</option>
              </select>
              <button className="m-button" type="submit">
                Request a demo
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <>
              <p>
                Demo scheduling will be available here once a calendar or sales email is configured.
              </p>
              <p style={{ marginTop: 18 }}>
                In the meantime, start a trial or try the illustrative preview.
              </p>
              <div className="m-contact-actions">
                <Link className="m-button" href="/auth/login?mode=signup">
                  Start your free trial
                  <ArrowUpRight size={16} />
                </Link>
                <Link className="m-text-link" href="/#agent-demo">
                  Try the preview
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
