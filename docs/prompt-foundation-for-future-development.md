# Base de Prompting pour le Développement Futur — Equilog

> Document de référence · Mise à jour : analyse code avril 2026
> À copier-coller ou référencer dans les futurs prompts de développement.
> Chaque section est autonome et réutilisable.

---

## SECTION 1 — CONTEXTE APPLICATIF

```
Equilog est une application web de gestion de chevaux.
Stack : Next.js 14 (App Router) · Supabase (auth + DB) · Tailwind CSS · Radix UI
AI : Anthropic Claude SDK (@anthropic-ai/sdk)
Déploiement : Vercel · DB : Supabase PostgreSQL · Paiement : Stripe

L'application est en production sur Vercel.
Repo GitHub : vitimsit-jpg/equilog
URL prod : equilog-i3nr-vitimsit-jpgs-projects.vercel.app
```

---

## SECTION 2 — PROFILS UTILISATEURS

> ⚠️ Deux systèmes coexistent. Toujours utiliser les deux dans les prompts qui touchent à la navigation ou aux permissions.

### Système actuel (à privilégier)
```
ProfileType = "loisir" | "competition" | "pro" | "gerant"
Champ DB : users.profile_type
```

### Système legacy (encore actif dans la sidebar)
```
UserType = "loisir" | "competition" | "pro" | "gerant_cavalier" | "coach" | "gerant_ecurie"
Champ DB : users.user_type
```

### Modules additionnels (booléens sur users)
```
users.module_coach: boolean   → débloque CoachChat + gestion élèves
users.module_gerant: boolean  → débloque /mon-ecurie
users.is_admin: boolean       → accès /admin/*
```

### Rôles par cheval (horse_user_roles table)
```
role = "owner" | "guardian" | "caretaker"
rides_horse: boolean
→ Attention : rides_horse retourne true par défaut si aucune entrée en base (useRidesHorse hook)
```

### Ordre navigation sidebar par profil (HORSE_NAV_BY_PROFILE)
```
loisir      : health → training → video → budget → competitions
competition : health → competitions → training → video → budget
pro         : health → training → video → competitions → budget
gerant      : health → budget → training → competitions
```

---

## SECTION 3 — ABONNEMENTS

```
Plan = "starter" | "pro" | "ecurie"
Champ DB : users.plan (ou subscription_status via Stripe)
Paiement : Stripe (checkout, portal, webhook)
```

### Ce qui est effectivement enforced dans le code
```
plan === "starter" → Video Analysis bloquée (/horses/[id]/video)
Tout le reste → accessible à tous les plans (paywall non enforced)
```

### État actuel (migration 054)
```
Tous les nouveaux users reçoivent plan = "ecurie" par défaut.
```

### Intentions produit (page /pricing) — NON enforced actuellement
```
Starter  : 1 cheval, sans Horse Index avancé, sans classements, sans AI
Pro      : chevaux illimités, tout inclus, 9,90€/mois
Écurie   : tout Pro + multi-cavaliers + dashboard gérant, 29€/mois
```

> ⚠️ Pour tout prompt touchant aux gates d'abonnement :
> préciser si on veut implémenter une restriction réelle ou modifier l'UI seulement.

---

## SECTION 4 — MODULES ET FONCTIONNALITÉS

### Modules core (toujours disponibles)
```
- Dashboard (/dashboard)
- Carnet de santé (/horses/[id]/health)
- Journal de travail (/horses/[id]/training)
- Concours (/horses/[id]/competitions)
- Budget (/horses/[id]/budget)
- Horse Index (/horses/[id] + /api/horse-index)
- Planning hebdomadaire (/planning)
- Communauté (/communaute)
- Classements (/classements)
- Documents (/horses/[id]/documents)
- Généalogie (/horses/[id]/genealogie)
- Historique (/horses/[id]/historique)
- Bibliothèque exercices (/exercises)
- Export PDF (/api/pdf/[horseId])
- Profil public (/share/[horseId])
- Saisie vocale (/api/voice-transcribe) — Chrome/Safari uniquement
- AI Insights basiques (/api/ai-insights)
```

### Modules conditionnels
```
Video Analysis  → gate : plan !== "starter"           → /horses/[id]/video
Nutrition       → gate : horse.module_nutrition=true  → /horses/[id]/nutrition
CoachChat       → gate : user.module_coach=true       → présent sur toutes les pages /horses/[id]/*
Mon Écurie      → gate : profile_type="gerant" OR module_gerant=true → /mon-ecurie
Admin           → gate : is_admin=true                → /admin/*
```

### Horse Index — modes disponibles
```
HorseIndexMode = "IE" | "IC" | "ICr" | "IR" | "IS" | "IP"

IE  = Équilibre       → loisir/pratique régulière, calibrage 30j
IC  = Compétition     → préparation concours, calibrage 30j
ICr = Croissance      → poulain/jeune cheval, calibrage 180j
IR  = Convalescence   → repos médical forcé, calibrage 30j
IS  = Retraite        → faible activité, calibrage 30j
IP  = Rééducation     → rehab progressive, calibrage 30j

Statuts : "incomplet" | "calibrage" | "actif"
ScoreBreakdown v2 : sante_score · bienetre · activite · suivi_proprio
```

---

## SECTION 5 — RÈGLES MÉTIER

```
1. Un cheval ne peut avoir qu'un seul mode Horse Index actif à la fois.
   Changement de mode → log dans horse_mode_history + reset horse_index_mode_changed_at.

2. Calibrage :
   - 30j pour tous les modes sauf ICr
   - 180j pour ICr (poulain)
   - Pendant calibrage : score affiché mais badgé "Calibrage en cours"

3. Fenêtre de travail :
   - Santé : soins à venir dans 45j (upcoming), dépassés depuis 7j (overdue)
   - Ferrage/Parage : intervalle recommandé = 35j
   - Score Horse Index : recalculé à chaque appel /api/horse-index

4. Profil public /share/[horseId] :
   - Visible seulement si horse.share_horse_index = true
   - Contient : Horse Index, activité récente, palmarès

5. CoachChat :
   - Contextualisé par le cheval actif (nom, mode, score, séances récentes, santé)
   - Streaming (Server-Sent Events via /api/coach-chat)
   - Portal sur document.body (z-index élevé)
   - Présent sur TOUTES les pages /horses/[id]/* via le layout

6. Saisie vocale :
   - Web Speech API (navigateur natif) → Claude pour structuration
   - Bloquée sur Firefox (message explicite "non disponible")
   - Chrome/Safari uniquement

7. Cron jobs :
   - /api/cron/daily (0 8 * * *) → rappels soins J-7, alertes score
   - /api/cron/weekly (0 8 * * 1) → résumé hebdomadaire
   - Protégés par CRON_SECRET env var
```

---

## SECTION 6 — RESTRICTIONS ET PERMISSIONS

### Gates de pages (vérifiés dans les layouts/pages)
```typescript
// Admin
if (!user.is_admin) redirect("/dashboard")

// Mon Écurie
if (profile_type !== "gerant" && !module_gerant) redirect("/dashboard")
// + legacy check : user_type IN ("gerant_ecurie", "gerant_cavalier")

// Video Analysis
if (plan === "starter") → afficher upgrade prompt (page bloquée)

// Nutrition
if (!horse.module_nutrition) → afficher activation prompt
```

### Routes publiques (middleware.ts — pas de redirect vers /login)
```
/ · /login · /register · /pricing · /success
/share/* · /flights · /classements · /ecurie/*
```

### APIs protégées
```
/api/admin/*           → is_admin requis
/api/coach-chat        → authentifié requis
/api/ai-insights       → authentifié + horse ownership
/api/stripe/*          → authentifié requis
/api/cron/*            → CRON_SECRET requis
```

---

## SECTION 7 — PRIORITÉS UX PAR PROFIL

```
loisir      → simplicité, friction minimale, santé en avant
competition → performance, données concours, Horse Index visible
pro         → efficacité saisie, video, multi-chevaux
gerant      → vue globale structure, budget, santé cheptel
coach       → contexte élève, recommandations IA, suivi progression
```

---

## SECTION 8 — CONVENTIONS CODE

```
Couleurs Tailwind custom : bg-orange · bg-beige · text-danger · text-success · text-warning · bg-orange-light
Classes CSS custom : card · card-hover · btn-primary · btn-ghost · btn-secondary · nav-item · nav-item-active · stat-card · label · section-title
text-2xs : classe Tailwind custom définie dans le projet

Composants UI notables :
- HorseIndexGauge : jauge SVG demi-cercle ("use client")
- CalibrationBadge : badge calibrage avec tooltip, prop window (30 ou 180)
- CoachChat : chat flottant, portal sur body
- VoiceButton : gère Firefox (message "non disponible")
- ShareButton : copie /share/[id] dans presse-papier

Imports courants :
- date-fns (format, differenceInDays, parseISO, startOfDay...)
- lucide-react (icônes)
- react-hot-toast (toasts)
- @/lib/supabase/client ou server
- @/lib/utils (TRAINING_TYPE_LABELS, TRAINING_EMOJIS, formatDate)
```

---

## SECTION 9 — MIGRATIONS DB (RÉFÉRENCE RAPIDE)

```
003 : carnet santé (practitioner_phone, product_name, urgency)
004 : horse-avatars bucket + avatar_url
005 : training (objectif, lieu, marcheur)
006 : horse (sexe, conditions_vie, objectif_saison, niveau)
007 : training (coach_present)
008 : horse (maladies_chroniques)
009 : horse (assurance) + training (equipement_recuperation)
016 : Stripe (stripe_customer_id, stripe_subscription_id, subscription_status)
019 : horse profil météo (tonte, morphologie_meteo, etat_corporel, trousseau)
020 : horse_index_mode + horse_index_status + horse_index_mode_changed_at
021 : users profile_type + module_coach + module_gerant
022 : onboarding_step + onboarding_completed
023 : horse_mode_history
040 : horse_nutrition (fibres, granules, compléments)
042 : marechal_profile (profil maréchal par cheval)
043 : training_sessions (mode_entree, est_complement, duree_planifiee, duree_reelle)
047 : horse_user_roles (owner/guardian/caretaker + rides_horse)
054 : default plan = "ecurie" pour nouveaux users
056 : déduplication horse_mode_history (unique index)
```

---

## SECTION 10 — ZONES À NE PAS TOUCHER SANS CLARIFICATION PRÉALABLE

```
1. Logique paywall / restrictions plan
   → Décision produit non finalisée. Ne pas implémenter de restrictions
     sans validation explicite du modèle cible.

2. Système de profils legacy (UserType)
   → Ne pas supprimer les checks legacy sans migration complète des users.

3. module_coach et module_gerant
   → Leur lien avec les plans n'est pas défini. Toute modification du gate
     doit aligner profil + abonnement + module.

4. horse_user_roles
   → Feature incomplète (pas d'UI). Ne pas construire dessus sans d'abord
     implémenter la gestion des rôles.

5. Calcul Horse Index
   → Logique dans /api/horse-index/route.ts. Toute modification impacte
     les scores de tous les chevaux en base.
```

---

## TEMPLATE DE PROMPT RÉUTILISABLE

```
Contexte : application Equilog (Next.js 14, Supabase, Tailwind).
Profils concernés : [loisir | competition | pro | gerant | tous]
Plan concerné : [starter | pro | ecurie | tous — préciser si gate actif ou non]
Module concerné : [module_coach | module_gerant | none]

Objectif : [description de la feature]

Contraintes :
- Ne pas modifier le système de paywall existant (sauf si explicitement demandé)
- Utiliser les deux systèmes profile_type ET user_type legacy pour les gates navigation
- Respecter les conventions Tailwind custom du projet (card, btn-primary, text-2xs...)
- Les nouvelles colonnes DB → créer une migration numérotée dans /supabase/migrations/

Livrable attendu : [composant | page | API route | migration | tous]
```
