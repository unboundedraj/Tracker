# Tracker

Tracker is a Next.js App Router project organized for modular growth from the start.

## Folder Tree

```text
my-app/
├── public/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── common/
│   │   │   └── project-initialized-banner.tsx
│   │   ├── layout/
│   │   │   └── app-shell.tsx
│   │   └── ui/
│   ├── hooks/
│   ├── lib/
│   │   └── project.ts
│   ├── services/
│   ├── types/
│   └── utils/
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
