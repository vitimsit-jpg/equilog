# Structure de l'application

## Routes principales

### Auth (`/app/(auth)/`)
- `/login` — connexion
- `/register` — inscription

### Dashboard (`/app/(dashboard)/`)
- `/dashboard` — vue d'ensemble des chevaux
- `/horses/new` — création cheval
- `/horses/[id]/` — fiche cheval (Horse Index, score breakdown)
- `/horses/[id]/health` — carnet de santé
- `/horses/[id]/training` — journal de travail
- `/horses/[id]/competitions` — concours
- `/horses/[id]/budget` — budget
- `/settings` — paramètres utilisateur

### Social & public
- `/communaute` — feed activité avec réactions
- `/classements` — leaderboard Horse Index
- `/share/[horseId]` — profil public du cheval
- `/ecurie/[name]` — page publique écurie
- `/mon-ecurie` — dashboard gérant

### API
- `/api/ai-insights/` — génération insights Claude
- `/api/horse-index/` — calcul Horse Index
- `/api/voice-transcribe/` — transcription vocale
- `/api/coach-chat/` — streaming Coach IA
- `/api/reactions/` — toggle like
- `/api/cron/daily` + `/api/cron/weekly` — emails

## Middleware
- Routes publiques : `/share/`, `/flights`, `/login`, `/register`
- Tout le reste → redirect `/login` si non connecté

## Liens
- [[stack-technique]]
- [[../features/carnet-sante|Carnet de santé]]
