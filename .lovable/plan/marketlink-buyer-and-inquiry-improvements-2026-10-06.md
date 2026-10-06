# MarketLink buyer and inquiry improvements

## Scope
- Add AI-generated buyer intent summaries to inquiry conversations, based only on the buyer's messages and listing details.
- Add inquiry status tracking with a safe initial state, visible to both parties and changeable only by the farmer.
- Add relevant produce recommendations to browsing, using the buyer's saved location and prior inquiry categories where available, while keeping existing filters intact.
- Add password recovery: request a reset email, land on a recovery screen, and save a new password.

## Implementation
1. Add an inquiry status column with a default for existing and new inquiries; preserve participant-only access and restrict status changes to the farmer through database policy enforcement.
2. Add a participant-authenticated AI summary endpoint and an on-demand summary view in the inquiry thread.
3. Extend the existing browse experience with ranked recommendations based on profile location and inquiry history, falling back cleanly when profile/history data is absent.
4. Extend Supabase email/password auth with reset-email support and a recovery callback page for setting the new password.
5. Verify builds, public/auth route behavior, and inquiry/browse/recovery UI states where available; authenticated checks depend on the connected Supabase preview access.

## Technical details
- Keep all AI calls in Supabase Edge Functions, use the existing Responses helpers and assigned gateway model, and verify errors safely.
- Enforce status ownership in RLS/database rules; never rely on client-side role or identity claims for authorization.
- Use existing shadcn controls, routes, and semantic design tokens.
