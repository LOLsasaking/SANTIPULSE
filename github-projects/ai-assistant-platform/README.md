# AI Assistant Platform

A standalone frontend and backend demo for a business assistant that answers questions, classifies intent, scores leads, and prepares a human handoff.

This project is meant to show how a small business can turn website visitors into organized leads without needing a full CRM on day one. It works locally with a deterministic backend, and it can later be upgraded with a real LLM, database, email, or WhatsApp integration.

## Features

- Live chat interface
- Backend `/api/message` route
- Intent detection
- Lead scoring
- Handoff fields for CRM/contact follow-up
- In-memory run history

## Demo Flow

1. Visitor asks a question about price, booking, documents, or service details.
2. Backend classifies the message into an intent.
3. Backend calculates a lead score.
4. Frontend shows the reply, intent, score, and recent run history.
5. The business can use the collected context for follow-up.

## API

```http
POST /api/message
Content-Type: application/json

{
  "business": "Client Business",
  "message": "Can I get a quote for a new website?",
  "knowledge": "Business services, contact details, FAQ, and booking rules."
}
```

## Run

```bash
npm start
```

Open `http://localhost:5101`.

## Production Upgrade

Add a database, admin knowledge-base editor, auth, email notifications, and a real LLM provider through the backend route.

## Portfolio Notes

Use this repo to prove AI assistant work for businesses: customer support, lead capture, appointment requests, and sales qualification.
