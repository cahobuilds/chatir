# Investor Relations Voice Agent: Inbound Call Setup

This documents how the Investor Relations **voice** agent (created via the "Create
Investor Relations Agent" template, see `docs/RETELL_IR_AGENT_TEMPLATE.md`) gets bound to
a phone number so investors can call in and talk to it, and confirms this flow against
Retell's current phone-number API (there was a real breaking change here worth calling
out -- see "What changed" below).

## What changed

Retell **removed single-agent binding fields from the phone number API** on 03/31/2026
(deprecation notice:
[phone_number_agent_fields](https://docs.retellai.com/deprecation-notice/2026/03-31_phone_number_agent_fields.md)).
`agent_id` no longer exists on `create-phone-number` / `update-phone-number`. Phone
numbers now bind agents via **weighted lists** so a number can split traffic across
multiple agents (e.g. for A/B testing):

```typescript
// Old (no longer works -- silently ignored by the current API):
await client.phoneNumber.create({ area_code: 415, agent_id: 'agent_xxx' });

// Current:
await client.phoneNumber.create({
  area_code: 415,
  inbound_agents: [{ agent_id: 'agent_xxx', weight: 1 }],
});
```

A single agent handling 100% of inbound calls is expressed as **one entry with
`weight: 1`**. This codebase's phone-number routes have been updated to use this shape
(`src/app/api/retell/phone-numbers/route.ts`, and the new
`src/app/api/retell/phone-numbers/[id]/route.ts` for rebinding an existing number).

## Setup flow

1. **Create the Investor Relations agent pair** using the "Create Investor Relations
   Agent" button (or `POST /api/agents/create-ir-template` directly), with
   `include_voice: true` and a chosen `voice_id`. This creates a Retell voice agent with
   the IR prompt/guardrails already configured.
2. **Publish the voice agent** (`POST /api/retell/agents/[id]/publish`) once you've
   reviewed its prompt and attached its knowledge base(s) -- an unpublished agent's draft
   changes won't be live for real calls.
3. **Purchase a phone number and bind it in one step**:
   ```
   POST /api/retell/phone-numbers
   { "tenant_id": "...", "area_code": "415", "agent_id": "<local agent id>" }
   ```
   This purchases a Retell-managed number and binds the agent as the sole inbound
   handler (`inbound_agents: [{ agent_id, weight: 1 }]`).

   **Or**, if a number was already purchased earlier and needs to be pointed at the new
   IR agent instead:
   ```
   PATCH /api/retell/phone-numbers/{phone_number}
   { "tenant_id": "...", "agent_id": "<local agent id>" }
   ```
4. **Test the inbound flow**: call the number and verify the agent answers with the IR
   greeting, stays in scope, and declines out-of-scope/advice-seeking questions (see
   section 5, "Guardrail verification," and section 7, "Voice-specific checks," in
   `docs/RETELL_IR_AGENT_TEST_PLAN.md`).

## Recommended IR-specific voice settings

Beyond the shared guardrail/handbook/kb_config defaults in the IR template, consider for
the voice channel specifically:

- **`end_call_after_silence_ms`** -- set a reasonable timeout so abandoned/silent calls
  don't hang open indefinitely.
- **`data_storage_setting: 'everything_except_pii'`** or stricter, plus a **`pii_config`**
  scrubbing common categories (`person_name`, `phone_number`, `email`) from recordings
  and transcripts -- investor callers may give their name/contact info, and this is a
  reasonable default for a financial-services-adjacent product even though the agent
  itself never asks for sensitive personal data.
- **`webhook_events`** including `call_ended` and `call_analyzed` if the IR team wants a
  transcript/summary pipeline for calls (this repo already has webhook handling
  infrastructure -- see `docs/RETELL_AI_INTEGRATION.md`).

## Verifying isolation still holds for voice

Since each client company has its own Retell workspace (see
`docs/RETELL_WORKSPACE_ISOLATION.md`), purchased phone numbers, voice agents, and their
call recordings/transcripts are automatically isolated per company the same way chat
agents and knowledge bases are -- there is nothing additional to configure for voice
specifically. Confirm this by checking that the phone number list
(`GET /api/retell/phone-numbers?tenant_id=...`) for a newly onboarded company returns
only numbers purchased under its own dedicated API key.
