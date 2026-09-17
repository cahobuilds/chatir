import { getDemoContact } from "./content";
import { Button, Closing } from "./Site";

export default function About() {
  const { bookingUrl, salesEmail } = getDemoContact();
  return (
    <>
      <div className="m-prose">
        <h2>A more accessible starting point.</h2>
        <p>
          Company reports and investor presentations hold important information. Finding the
          relevant part should be straightforward. Chat IR helps teams create voice and chat agents
          that give visitors another way to explore those materials.
        </p>
        <h2>Built around the IR team.</h2>
        <p>
          The platform brings agent management, knowledge sources and conversation analytics into
          one workspace. Your team can manage the content behind the experience and review the
          questions investors ask.
        </p>
        <h2>Contact</h2>
        <p>
          Chat IR is built for investor relations teams at public companies. The fastest way to talk
          with us is to book a walkthrough. If you already use the product, sign in to your
          workspace instead.
        </p>
        <div className="m-contact-actions">
          {salesEmail && (
            <p>
              Email <a href={`mailto:${salesEmail}`}>{salesEmail}</a>
            </p>
          )}
          <Button href={bookingUrl || "/book-a-demo"}>
            {bookingUrl ? "Choose a time" : "Get in touch"}
          </Button>
        </div>
      </div>
      <Closing />
    </>
  );
}
