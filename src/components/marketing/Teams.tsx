import { Closing } from "./Site";

const reasons = [
  [
    "01",
    "Make published information easier to find",
    "Guide visitors toward your earnings materials, presentations and frequently requested company information.",
  ],
  [
    "02",
    "Give recurring questions a place to go",
    "Offer a conversational starting point for investors who want help navigating the information you already publish.",
  ],
  [
    "03",
    "Understand what matters to visitors",
    "Review questions and conversation history to identify topics that deserve clearer explanations.",
  ],
];

export default function Teams() {
  return (
    <>
      <section className="m-content-section m-section-sage">
        <div className="m-container">
          <div className="m-card-grid">
            {reasons.map(([n, t, d]) => (
              <article className="m-light-card" key={n}>
                <span className="m-eyebrow">{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="m-content-section">
        <div className="m-container m-split">
          <div>
            <span className="m-eyebrow">A THOUGHTFUL ROLLOUT</span>
            <h2>Your team shapes the experience.</h2>
            <p>
              Choose the source material, test the questions that matter, and review conversations
              as your investor audience begins using the agents.
            </p>
          </div>
          <ul className="m-list">
            <li>Start with current, public company materials</li>
            <li>Assign an owner for source updates</li>
            <li>Test representative investor questions</li>
            <li>Keep a clear route to your human IR team</li>
          </ul>
        </div>
      </section>
      <Closing />
    </>
  );
}
