# FMS Client (React + Vite)

Run this frontend as-is; it will gracefully show placeholders if no backend is available.

## Prerequisites
- Node.js 18+

## Setup and run
- npm i
- cp .env.example .env
- Edit .env and set VITE_API_BASE to a live backend implementing /docs/openapi.yaml
- npm run dev

Dev server: http://localhost:5173/

## Troubleshooting
- If charts show "No data", verify VITE_API_BASE points to a live API that returns data.
- CORS errors mean the backend must allow origin http://localhost:5173.
- Pagination params: limit (default 10), offset (default 0).
- Date filters must be ISO YYYY-MM-DD.

## Separation of concerns
- This repo includes only frontend, OpenAPI spec, Postman collection, and SQL migrations/seeds.
- Later, add any backend (Express, Nest, Spring, etc.), implement the OpenAPI spec, deploy it, and set VITE_API_BASE to your backend’s base URL.
- No frontend code needs changes when the backend is added.
