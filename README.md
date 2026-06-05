# Tracker

Tracker is a Next.js App Router project organized for modular growth from the start.

## Folder Tree

```text
.
├── public/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── verify/
│   │   │   └── habits/
│   │   │       └── [monthKey]/
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
│   │   ├── mongodb.ts
│   │   └── project.ts
│   ├── services/
│   │   └── habit-month-api.ts
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
6. Added MongoDB Atlas-backed monthly habit storage with local fallback sync.
7. Improved MongoDB reliability: retry after failed connects/index builds and show actionable sync/load error messages.
8. Redesigned miscellaneous todos into priority lanes with draggable, persisted ordering and a solid modal surface.
9. Added Shopping List with a draggable active/completed list, strike-off capability, and MongoDB persistence.
10. Added Random Thoughts with a draggable active/archived list, strike-off capability, and MongoDB persistence.
11. Moved habit month seeding to the server so new months inherit the latest real habit names instead of showing placeholder defaults first.
12. Preloaded the current month habit document into the page render path to remove the client-side flash of "Habit 1 / Habit 2" on load and after saves.
13. Rethemed the Random Thoughts modal to match the app-wide neutral light/dark design language, removing purple-specific styling.
14. Added Today's Agenda with MongoDB-backed task curation and automatic task expiry 24 hours after creation.
15. Added completion tracking and a Chart.js circular progress chart in Today's Agenda to visualize percent of active tasks done.

## Evolution

Tracker began as a lightweight personal habit tracker—a focused tool for building daily streaks and monitoring progress month-by-month. Over time, it is evolving into a broader **personalized assistant platform** that organizes multiple dimensions of your personal life:

- **Habits**: Track daily routines and long-term behavior patterns
- **Focus Mode**: Dedicated distraction-free environment for deep work
- **Miscellaneous Todos**: Priority-based task management with visual lanes
- **Shopping List**: Organized, draggable inventory management

Future expansions will continue layering additional personal productivity tools, all unified under a single authenticated interface with offline support and MongoDB persistence.
