# Frontend Guide

The frontend is built with Next.js using the App Router.

## Directory Structure
- `app/`: Next.js pages, layouts, and routing.
- `components/`: Reusable React components (UI, finance, shared).
- `lib/`: Utility functions, API clients, and configuration.
- `hooks/`: Custom React hooks (e.g., `use-toast`).

## Styling
- Tailwind CSS is used globally.
- Radix UI primitives provide accessible components.

## Routing
- Uses Next.js App Router conventions.
- Protected routes use Next.js middleware and/or high-order components.
