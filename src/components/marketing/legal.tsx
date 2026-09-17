import Link from "next/link";

const UPDATED = "17 September 2026";

function LegalDoc({ children }: { children: React.ReactNode }) {
  return (
    <div className="m-prose">
      <p className="m-legal-updated">Last updated {UPDATED}</p>
      {children}
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalDoc>
      <p>
        This policy describes how Chat IR collects, uses, and shares information when you visit the
        Chat IR website or use the Chat IR service. It reflects how the product works today.
      </p>

      <h2>Who this applies to</h2>
      <p>
        Chat IR is a platform for investor relations teams at public companies. It is intended for
        business use. If you use Chat IR on behalf of a company, that company is the customer and is
        responsible for the information it uploads and the way its agents are offered to investors.
      </p>

      <h2>Information we collect</h2>
      <p>Depending on how you use Chat IR, we may process:</p>
      <ul>
        <li>Account details such as name, email address, password, and company name.</li>
        <li>
          Billing details needed to start and manage a subscription. Payment cards are handled by
          our payment processor; Chat IR does not store full card numbers.
        </li>
        <li>
          Workspace content you provide, including knowledge-source files, website material, agent
          instructions, and organization settings.
        </li>
        <li>
          Conversation records created when someone uses a configured chat or voice agent, such as
          messages, transcripts, and related operational metrics.
        </li>
        <li>
          Technical logs such as IP address, browser type, and timestamps that help us operate and
          secure the service.
        </li>
      </ul>
      <p>
        The homepage chat and voice preview is illustrative and runs in your browser. It does not
        send investor questions to a live company agent.
      </p>

      <h2>How we use information</h2>
      <p>We use this information to:</p>
      <ul>
        <li>Provide, maintain, and improve the Chat IR website and service.</li>
        <li>Create and manage accounts, workspaces, agents, and subscriptions.</li>
        <li>Process trial and paid billing.</li>
        <li>Respond to demo requests and support questions you send us.</li>
        <li>Protect the service, prevent abuse, and meet legal obligations.</li>
      </ul>
      <p>We do not sell personal information.</p>

      <h2>How we share information</h2>
      <p>
        We share information with service providers that help us operate Chat IR, including
        authentication and database hosting, payment processing, application hosting, and the voice
        communications provider connected to a customer workspace. Those providers process
        information on our instructions or the customer’s configuration.
      </p>
      <p>
        We may also disclose information if required by law, to protect Chat IR or others, or as
        part of a merger, acquisition, or similar transaction.
      </p>
      <p>
        Customer workspaces are separated so one company’s knowledge sources and conversations are
        not available to another customer. Platform staff may access a workspace only as needed to
        operate or support the service.
      </p>

      <h2>Retention</h2>
      <p>
        We keep account, workspace, and conversation information while a customer account is active
        and for a limited period afterward as needed for backups, billing, security, and legal
        requirements. Customers can ask us to delete a workspace. Some records may remain in
        encrypted backups for a short time until those backups rotate.
      </p>

      <h2>Your choices</h2>
      <p>
        Account holders can review and update profile and organization information in the product.
        You may ask us to access, correct, or delete personal information we hold, or to close an
        account, by contacting us through the details on the About page. We may need to verify the
        request and retain certain information where we are required to do so.
      </p>

      <h2>International processing</h2>
      <p>
        Chat IR may process information in the countries where we and our providers operate. If that
        includes a transfer of personal information, we use appropriate contractual and technical
        safeguards available for the service.
      </p>

      <h2>Children</h2>
      <p>Chat IR is not directed to children and is not intended for anyone under 16.</p>

      <h2>Changes</h2>
      <p>
        We will update this page when our practices change and revise the date above. If a change is
        material, we will provide additional notice where appropriate.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions can be sent through the contact options on the{" "}
        <Link href="/about">About</Link> page or by requesting a conversation on{" "}
        <Link href="/book-a-demo">Book a demo</Link>.
      </p>
    </LegalDoc>
  );
}

export function TermsOfService() {
  return (
    <LegalDoc>
      <p>
        These terms govern use of the Chat IR website and service. By creating an account or using
        the service, you agree to them. If you are using Chat IR for a company, you confirm that you
        have authority to bind that company.
      </p>

      <h2>The service</h2>
      <p>
        Chat IR lets customer teams create and manage AI chat and voice agents that help investors
        explore the public company information the customer connects. Chat IR does not provide
        investment, legal, tax, or accounting advice. Agent answers depend on the materials and
        instructions the customer supplies and are not a substitute for professional advice or
        original company filings.
      </p>

      <h2>Accounts</h2>
      <p>
        You must provide accurate account information and keep your login details confidential. You
        are responsible for activity under your account and for the people you invite to your
        workspace.
      </p>

      <h2>Subscription, trial, and billing</h2>
      <p>
        Chat IR is offered at $99 per month after a 14-day free trial. A payment card is required at
        signup. Unless you cancel before the trial ends, the subscription continues at $99/month.
        Voice-provider usage is billed separately by the connected provider and is not included in
        the Chat IR subscription. Taxes may apply.
      </p>
      <p>
        You can cancel through the billing settings in the product. Cancellation stops future
        subscription charges; it does not automatically refund the current period unless required by
        law.
      </p>

      <h2>Customer content</h2>
      <p>
        You retain your rights in the files, website material, and instructions you upload. You
        grant Chat IR a limited licence to host and process that content only to provide the
        service. You confirm that you have the right to use the content you connect, and that
        investor-facing agents are limited to information the company is authorized to share.
      </p>

      <h2>Acceptable use</h2>
      <p>You may not use Chat IR to:</p>
      <ul>
        <li>Break the law or infringe anyone else’s rights.</li>
        <li>Upload confidential or material non-public information for investor-facing use.</li>
        <li>Attempt to access another customer’s workspace or interfere with the service.</li>
        <li>
          Misrepresent agent output as guaranteed, complete, or as personalized investment advice.
        </li>
      </ul>

      <h2>Availability and changes</h2>
      <p>
        We aim to keep Chat IR available, but we do not guarantee uninterrupted service. We may
        update features, models, or providers as the product develops. We will not reduce the
        published $99/month platform price for an active monthly subscription without notice in the
        product or by email.
      </p>

      <h2>Disclaimers</h2>
      <p>
        The service is provided on an “as is” and “as available” basis. To the fullest extent
        permitted by law, Chat IR disclaims implied warranties of merchantability, fitness for a
        particular purpose, and non-infringement. We do not warrant that agent responses will be
        accurate, complete, or suitable for any investment decision.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Chat IR is not liable for indirect, incidental,
        special, consequential, or lost-profit damages, or for investment losses. Our total
        liability for any claim relating to the service is limited to the amount paid to Chat IR for
        the service in the 12 months before the claim.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using Chat IR at any time. We may suspend or close an account if these terms
        are breached, if charges are unpaid, or if we need to do so to protect the service. After
        termination, we may delete workspace content in line with the Privacy Policy.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms by posting a revised version on this page. Continued use after the
        updated date constitutes acceptance of the revised terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms can be sent through the contact options on the{" "}
        <Link href="/about">About</Link> page.
      </p>
    </LegalDoc>
  );
}
