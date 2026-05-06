# Tracker

Tracker is a Next.js App Router project organized for modular growth from the start.

## Folder Tree

```text
my-app/
├── public/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── verify/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── common/
│   │   │   ├── auth-gate.tsx
│   │   │   ├── habits/
│   │   │   │   └── habit-tracker.tsx
│   │   │   └── project-initialized-banner.tsx
│   │   ├── layout/
│   │   │   └── app-shell.tsx
│   │   └── ui/
│   │       ├── circular-progress.tsx
│   │       └── linear-progress.tsx
│   ├── hooks/
│   │   └── use-habit-month.ts
│   ├── lib/
│   │   ├── auth.ts
│   │   └── project.ts
│   ├── services/
│   ├── types/
│   │   └── habits.ts
│   └── utils/
│       ├── bitstring.ts
│       └── date.ts
├── .env.example
└── README.md
```

## Feature Checklist

- [x] App Router scaffold moved to `src/app`
- [x] Temporary landing page added to avoid 404s
- [x] Strict TypeScript setup retained
- [x] Modular folder structure created for future features
- [x] Root boilerplate content removed
- [x] Responsive shell and initialization card styles added
- [x] Password-based auth gate added at the app root
- [x] Habit tracker single-page UI scaffold (weeks/days grid, progress indicators, local persistence)

## Setup Guide

1. Install dependencies.

```bash
npm install
```

2. Start the development server.

```bash
npm run dev
```

3. Open `http://localhost:3000` in your browser.

4. Validate the project.

```bash
npm run build
npm run lint
```

## Feature Log

1. Initialized the Tracker App Router structure under `src/app`.
2. Added a temporary initialized landing page to prevent 404s.
3. Added project documentation and environment placeholders.
4. Added a root password gate backed by a server-side env variable and auth cookie.
5. Added the habit tracker UI scaffold with weekly and per-habit progress.
