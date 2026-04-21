# Stack technique

## Frontend
- **Next.js 14** — App Router, server components
- **Tailwind CSS** — classes custom (`bg-orange`, `card`, `btn-primary`, etc.)
- **Radix UI** — composants accessibles
- **Recharts** — graphiques (Horse Index, training)
- **Lucide React** — icônes

## Backend
- **Supabase** — auth + PostgreSQL + RLS + storage (buckets)
- **Anthropic Claude SDK** — AI insights, coach chat, transcription vocale
- **Resend** — emails transactionnels (rappels santé, résumé hebdo)

## Déploiement
- **Vercel** — auto-deploy sur push `main`
- **Cron jobs** — `/api/cron/daily` (8h) + `/api/cron/weekly` (lundi 8h)

## Liens
- [[structure-app]]
- [[../features/horse-index|Horse Index]]
- [[../features/coach-ia|Coach IA]]
