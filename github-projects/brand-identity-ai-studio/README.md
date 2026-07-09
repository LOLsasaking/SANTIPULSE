# Brand Identity AI Studio

A standalone brand identity app with frontend, backend and optional OpenAI image generation.

This project is designed for businesses that need a practical brand refresh workflow: upload or describe a logo, generate directions, pick a palette, and export a simple brand kit. It works without an API key using a local SVG concept engine, then becomes stronger when AI image generation is enabled on the backend.

## Features

- Upload/describe a logo
- Backend `/api/generate-brand` route
- Optional OpenAI image edit/generation through `OPENAI_API_KEY`
- Fallback SVG identity generator when no API key is present
- Export-ready brand kit

## Demo Flow

1. User adds a company name, sector, direction, color, and optional logo upload.
2. Backend tries OpenAI image edit or generation if an API key exists.
3. If no key exists, backend returns local generated SVG concepts.
4. Frontend displays concepts, palette, and export file names.
5. Brand kit can be used as the start of a logo/design project.

## API

```http
POST /api/generate-brand
Content-Type: application/json

{
  "name": "Santi Pulse",
  "sector": "digital services",
  "direction": "premium, technical, trustworthy",
  "color": "#0b3d91"
}
```

## Run

```bash
npm start
```

Open `http://localhost:5103`.

## Enable AI Image Generation

Create `.env` or set environment variables:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_IMAGE_MODEL=gpt-image-1.5
```

Never expose the API key in frontend code.

## Portfolio Notes

Use this repo to show brand identity work, logo redesign tooling, and no-code/AI-enhanced creative workflows.
