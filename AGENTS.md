# AGENTS.md

Project decisions (one line each; keep rules true even when values change).

- AI edge functions call models through `_shared/responses.ts` (`createResponsesCall`, AI SDK `streamText` on /v1/responses, model `openai/gpt-6-astra`); pass `output: Output.object({ schema })` for structured output — the schema must be strict-compatible (single object root, all properties required, nullable instead of optional, no patterns/bounds).
- Client-side never writes `subscriptions`, `transactions`, or `payouts`; only service-role edge functions write those tables (RLS keeps them read-only to their owner).
- Paystack webhooks are dispatched from a single deployed function `paystack-webhook`, which routes by payment metadata (`purpose === 'order_payment'` or `metadata.order_id` → order, else subscription).
- Platform commission is a 5% Paystack subaccount split on order payments; subscriptions are ₦5,000/year and edge functions activate them for one year from success.
- Realtime tables (`messages`, `inquiry_messages`, `notifications`) need REPLICA IDENTITY FULL and membership in the `supabase_realtime` publication.
