# SantiPulse Pulse System Hub

This vault is for planning, handoff notes, and verification only. The actual website source stays in the project folders outside this vault.

## Source of Truth

- Correct project: `F:\Santi Pulse\Brain Website`
- Production site identity: the three-panel `santipulse.com` homepage
- Active API shape: one Vercel catch-all function at `api/[...route].js`
- Archived legacy demos: `backend-archive/`

## Pulse Packages

- Recepcionista IA
- Insights de Redes
- Gestor de Ads

## 1% Edge Features

- Boveda de Conocimiento: PDFs, menus and notes stored in Supabase, summarized in Spanish, and injected into Recepcionista IA / Insights context.
- ROI Pulse: live spend, revenue, ROAS and profit ticker from synced ad campaigns, with Revealbot as an optional future engine.
- Human SOS: manual dashboard panic button that records and notifies a real-person escalation.

## Important Notes

- Do not use `F:\Brain Website` for this project.
- Do not restore Price Monitor or Lead Scraper into active API routes.
- Keep Package 2 native SantiPulse for now; do not iframe GoHighLevel in this pass.
- Revealbot is env-gated and must not show green unless a real status URL responds.
- Use `npm run build` and `npm run verify:pulse` before committing.
