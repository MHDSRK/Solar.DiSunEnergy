# DiSun Energy International — Solar Website

Production Next.js application for the DiSun Energy International solar customer journey, including solar calculation, KSEB transformer feasibility, document eligibility, site-visit booking, and the admin/WhatsApp workflow.

## Stack

- Next.js 16.3.8
- React 19
- TypeScript
- Tailwind CSS
- Neon Postgres
- WhatsApp Cloud API
- Google Sheets synchronization
- Vercel

## Local development

```bash
pnpm install
pnpm dev
```

## Database

Schema changes are managed outside request handling.

Run the migration explicitly before starting production traffic:

```bash
pnpm db:migrate
```

The application expects the database schema to already exist; API requests do not create or alter tables.

## Quality checks

```bash
pnpm typecheck
pnpm test
pnpm build
```

GitHub Actions runs these checks automatically for pushes to `Main` and `Fixed`, and for pull requests targeting `Main`.

## Deployment

Vercel handles the Next.js deployment. Follow-up reminders are scheduled through the repository's `vercel.json` Cron configuration and require `CRON_SECRET` plus the relevant WhatsApp environment variables.

Do not commit production secrets or service-account credentials to the repository.
