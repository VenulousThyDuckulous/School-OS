# SchoolOS

All-in-one multi-school platform: dashboard, timetable, assignments + feedback, quizzes (incl. live join-code games), behaviour + rewards + detentions, attendance, messaging (school-safe), files, school + platform announcements, branding/themes, parent portal, platform-owner admin.

Runs fully client-side for the demo. Data persists in `localStorage` (`schoolos-v1`); storage layer (`src/storage.ts`) is abstracted so IndexedDB/Firebase/Supabase can replace it later. **All demo content is fictional.**

## Run

```bash
npm install
npm run dev
npm run build
```

## Demo logins (password: `demo`)

| Role | Email |
|---|---|
| Platform Owner | `owner@schoolos.local` |
| School Admin (Example Academy) | `admin@example.local` |
| Teacher | `smith@example.local` |
| Student | `alex@example.local` |
| Parent | `parent@example.local` |
| School Admin (Riverside High) | `admin@riverside.local` |

Switch school on the login page to see full data isolation.

## GitHub Pages

`vite.config.ts` uses `base: './'`. Push to `main`; workflow deploys `dist/` via GitHub Actions. In repo Settings → Pages → Source: **GitHub Actions**.
