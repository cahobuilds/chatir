import { PageIntro, Button } from "./Site";

export default function NotFoundContent() {
  return (
    <>
      <PageIntro
        eyebrow="PAGE NOT FOUND"
        title="We couldn’t find that page."
        description="The link may be out of date, or the page may have moved. Start from the platform tour, or get in touch and we’ll point you in the right direction."
      />
      <div className="m-container m-notfound-actions">
        <Button href="/platform">Explore the platform</Button>
        <Button href="/" outline>
          Back to home
        </Button>
      </div>
    </>
  );
}
