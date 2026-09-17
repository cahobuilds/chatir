import { Button } from "./Site";

const faqs = [
  [
    "How does the free trial work?",
    "Start with 14 days free. A payment card is required at signup. Your subscription becomes $99/month after the trial unless you cancel before it ends.",
  ],
  [
    "Are voice-provider costs included?",
    "The $99/month price covers the Chat IR platform subscription. Your connected voice-provider workspace has separate usage charges. Review those charges with your provider.",
  ],
  [
    "Does Chat IR support both voice and chat?",
    "Yes. The platform supports management of voice agents and embeddable chat agents.",
  ],
  [
    "How is voice usage handled?",
    "The platform connects to your organization’s voice-provider workspace. Confirm the applicable subscription and provider usage charges for your setup before subscribing.",
  ],
  [
    "Can we see the platform before choosing?",
    "Book a demo to explore the agent experience, knowledge sources and conversation analytics with your team.",
  ],
];

export default function Pricing() {
  return (
    <div className="m-container">
      <div className="m-price-grid">
        <section className="m-price-card">
          <span className="m-eyebrow">CHAT IR PLATFORM</span>
          <h2>Everything starts here.</h2>
          <div className="m-price">
            $99<small> / month</small>
          </div>
          <p>14 days free. Card required at signup.</p>
          <ul className="m-list">
            <li>Voice and chat agent management</li>
            <li>Connected knowledge sources</li>
            <li>Conversation history and analytics</li>
            <li>Organization users and roles</li>
          </ul>
          <Button href="/auth/login?mode=signup">Start your free trial</Button>
          <p className="m-price-note">
            After your trial, your subscription is $99/month. Voice-provider usage is billed
            separately.
          </p>
        </section>
        <section className="m-price-card m-price-card-alt">
          <span className="m-eyebrow">WHAT TO CONSIDER</span>
          <h3>A complete view of your setup.</h3>
          <ul className="m-list">
            <li>Your voice and chat channels</li>
            <li>Expected conversation volume</li>
            <li>Knowledge sources and onboarding</li>
            <li>Voice-provider usage and billing</li>
          </ul>
          <p>We’ll walk through these together during your demo.</p>
        </section>
      </div>
      <div className="m-faq">
        <h2>A few common questions.</h2>
        {faqs.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
