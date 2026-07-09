# Automation Ops Platform

A standalone workflow automation app with frontend and backend. It turns messy incoming requests into structured workflow runs, priority labels, and queued follow-up actions.

This project is designed as a client demo for businesses that want to automate emails, forms, WhatsApp messages, bookings, or internal operations without losing control of the process.

## Features

- Visual workflow runner
- Backend `/api/run` route
- Priority routing
- Task and notification records
- In-memory run history

## Demo Flow

1. A business submits a payload such as a customer request or internal task.
2. Backend detects urgency and routes the run.
3. Frontend shows the workflow steps and status.
4. Recent runs stay visible so the business can review what happened.

## API

```http
POST /api/run
Content-Type: application/json

{
  "payload": "Urgent: customer needs appointment today"
}
```

## Run

```bash
npm start
```

Open `http://localhost:5102`.

## Production Upgrade

Add persistent workflow templates, a database, user roles, email/SMS actions, Google Sheets, calendar integration, and webhook triggers.

## Portfolio Notes

Use this repo to demonstrate operations automation, lead routing, task queues, and business process dashboards.
