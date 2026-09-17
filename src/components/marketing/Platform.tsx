import { Button } from "./Site";
import ProductScreenshot from "./ProductScreenshot";

export default function Platform() {
  return (
    <>
      <div className="m-platform-actions m-container">
        <Button href="/auth/login?mode=signup">Start your free trial</Button>
        <a className="m-text-link" href="#ir-setup">
          Explore the workflow ↓
        </a>
        <p>$99/month after your 14-day trial. Card required. Provider usage is separate.</p>
      </div>
      <nav className="m-platform-jump" aria-label="Platform workflow">
        {[
          ["IR setup", "ir-setup"],
          ["Knowledge sources", "ir-sources"],
          ["Agent controls", "ir-controls"],
          ["Instructions", "ir-instructions"],
          ["Channels", "ir-channels"],
          ["Conversation review", "ir-review"],
        ].map(([label, id]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>
      <section className="m-platform-section m-platform-sage" id="ir-setup">
        <div className="m-container m-platform-split">
          <div>
            <span className="m-eyebrow">01 / START WITH YOUR COMPANY</span>
            <h2>
              Investor relations.
              <br />
              From the first setting.
            </h2>
            <p>
              Start with your company name, ticker and exchange. Choose chat, voice or both, connect
              a knowledge base, and provide a human IR contact for questions that need your team.
            </p>
            <p>
              The IR template gives you a starting set of instructions for public-information
              questions, so you can focus on shaping the experience around your company.
            </p>
          </div>
          <ProductScreenshot
            name="ir-agent-setup"
            alt="IR agent setup form with company, ticker, exchange, human contact, knowledge base and channel controls"
            caption="Company context, source selection and channels in one setup flow. The form is shown before a company is entered, with placeholder values."
          />
        </div>
      </section>
      <section className="m-platform-section" id="ir-sources">
        <div className="m-container m-platform-split m-platform-reverse">
          <ProductScreenshot
            name="knowledge-sources"
            alt="Knowledge library showing four Northvale source documents and the connected investor-relations agent"
            caption="A knowledge base with investor FAQs, an annual disclosure excerpt, a press release and a company profile, connected to an IR chat agent. The workspace header shows the customer’s organization branding."
          />
          <div>
            <span className="m-eyebrow">02 / CONNECT YOUR PUBLIC INFORMATION</span>
            <h2>
              The materials you publish.
              <br />A new way to explore them.
            </h2>
            <p>
              Bring website pages, uploaded files and written content into knowledge bases. Keep
              your company information organized and see which agents are connected to it.
            </p>
            <ul className="m-list">
              <li>Build from public reports, presentations, FAQs and company information.</li>
              <li>Review source documents together in the knowledge workspace.</li>
              <li>Connect the relevant knowledge base to each agent.</li>
            </ul>
          </div>
        </div>
      </section>
      <section className="m-platform-section m-platform-dark" id="ir-controls">
        <div className="m-container m-platform-split">
          <div>
            <span className="m-eyebrow">03 / DEFINE THE KNOWLEDGE CONNECTION</span>
            <h2>
              Choose what each
              <br />
              agent can draw from.
            </h2>
            <p>
              Assign knowledge bases to an agent and configure its retrieval settings. The workspace
              exposes controls for source relevance and the amount of information retrieved for a
              response.
            </p>
            <p>
              For an IR team, that creates a concrete review point: which company materials are
              connected, and how should the agent handle weak or missing matches?
            </p>
            <p className="m-platform-note">
              These controls guide retrieval. They do not guarantee that every response is accurate;
              representative question testing remains important.
            </p>
          </div>
          <ProductScreenshot
            name="northvale-knowledge-settings"
            alt="Northvale agent Knowledge Base tab with its attached source, relevance threshold and retrieval settings"
            caption="Review the sources and retrieval settings connected to an individual agent."
          />
        </div>
      </section>
      <section className="m-platform-section m-platform-sage" id="ir-instructions">
        <div className="m-container m-platform-split m-platform-reverse">
          <ProductScreenshot
            name="agent-instructions"
            alt="Northvale agent Prompt tab showing the opening of its investor-relations system instructions"
            caption="The opening of the IR template instructions: audience, public-information scope, and when to hand a question to the human team. The full prompt continues in the editor."
          />
          <div>
            <span className="m-eyebrow">04 / SHAPE THE CONVERSATION</span>
            <h2>
              A clear role.
              <br />A considered response.
            </h2>
            <p>
              Review the agent’s instructions alongside its model and knowledge settings. Define its
              audience, tone and response boundaries before investors begin using it.
            </p>
            <p>
              The IR template instructs the assistant to use connected public information,
              acknowledge what it does not know, avoid investment recommendations, and direct
              questions needing a person to your IR team.
            </p>
            <p>
              Test those instructions with the questions your investors actually ask, including
              requests the published materials cannot answer.
            </p>
          </div>
        </div>
      </section>
      <section className="m-platform-section" id="ir-channels">
        <div className="m-container">
          <span className="m-eyebrow">05 / CHOOSE THE CHANNEL</span>
          <h2>
            Two ways to ask.
            <br />
            One place to manage.
          </h2>
          <p className="m-platform-lead">
            Give website visitors a written conversation and offer a spoken experience through voice
            agents. Manage their settings and knowledge connections in the same platform.
          </p>
          <div className="m-platform-columns">
            <article>
              <h3>Chat on your IR website</h3>
              <p>
                Configure a chat agent, access its test interface, and get the embed code for your
                website. Keep the original reports and investor materials easy to find alongside the
                conversation.
              </p>
            </article>
            <article>
              <h3>Voice for a spoken experience</h3>
              <p>
                Create a voice agent from the same IR setup flow and choose an available voice.
                Review its instructions and settings before making the experience available to
                investors.
              </p>
            </article>
          </div>
        </div>
      </section>
      <section className="m-platform-section m-platform-sage" id="ir-review">
        <div className="m-container">
          <span className="m-eyebrow">06 / REVIEW AND LEARN</span>
          <h2>
            Keep the conversation
            <br />
            in view.
          </h2>
          <div className="m-platform-columns">
            <article>
              <h3>Review individual interactions</h3>
              <p>
                Use conversation history to explore chats and calls. Where records are available,
                review transcripts and call details to understand what was asked and how the agent
                responded.
              </p>
            </article>
            <article>
              <h3>Monitor activity over time</h3>
              <p>
                Review interaction totals, channel activity, answer rate and handling time. Pair
                operational metrics with conversation review when deciding what to improve.
              </p>
            </article>
          </div>
        </div>
      </section>
      <section className="m-closing">
        <span className="m-eyebrow">YOUR NEXT CONVERSATION STARTS HERE</span>
        <h2>
          Bring your company’s story
          <br />
          into the conversation.
        </h2>
        <p>
          Explore Chat IR with a 14-day free trial.
          <br />
          $99/month after the trial. Card required. Provider usage is separate.
        </p>
        <Button href="/auth/login?mode=signup">Start your free trial</Button>
      </section>
    </>
  );
}
