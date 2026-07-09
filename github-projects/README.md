# Santiago Portfolio Projects

Standalone portfolio projects for Santiago Alexander. Each folder is designed to become its own GitHub repository with a frontend, backend route, local demo data, and a clear upgrade path.

These are not tiny static widgets. They are product demos that prove the kind of systems Santiago can build for clients:

- `ai-assistant-platform` - business chatbot, intent detection, lead scoring, and handoff.
- `automation-ops-platform` - workflow intake, priority routing, run history, and notification queue.
- `brand-identity-ai-studio` - logo upload, no-key brand generation, optional OpenAI image generation, palette and kit exports.
- `electrical-planning-platform` - electrical planning intake, circuits, materials, and review checklist.

## Run A Project

```bash
cd ai-assistant-platform
npm install
npm start
```

Then open the local URL printed by the server.

## Repo Standard

Every project should stay useful without paid APIs, then unlock stronger AI features when environment variables are added. Before publishing each project:

- Add screenshots to the project README.
- Keep API keys server-side only.
- Include a sample request and response.
- Add a live demo link.
- Save the final GitHub and Vercel links in Obsidian.
