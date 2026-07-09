# Electrical Planning Platform

A standalone electrical planning app with frontend and backend.

This project is a practical planning assistant for early electrical project discussions. It creates a first-pass circuit/material structure and should evolve toward professional unifilar and multifilar diagram exports.

## Features

- Project form
- Backend `/api/plan` route
- Circuit and material generation
- Project review checklist
- Safety disclaimer for professional review

## Demo Flow

1. User enters room count, area, and important loads.
2. Backend estimates circuit groups and materials.
3. Frontend shows planning output and review checklist.
4. The output becomes a starting point for a qualified electrician's review.

## API

```http
POST /api/plan
Content-Type: application/json

{
  "rooms": 5,
  "area": 90,
  "loads": "kitchen, EV charger, solar reserve"
}
```

## Run

```bash
npm start
```

Open `http://localhost:5104`.

## Important

This is a planning aid. Final sizing, protections, installation and compliance must be reviewed by a qualified electrician.

## Production Upgrade

Add printable PDF plans, proper unifilar/multifilar diagram exports, panel schedule builder, project history, and local regulation review notes.

## Portfolio Notes

Use this repo to connect Santiago's electrical background with software: planning tools, diagrams, materials, and client-ready documentation.
