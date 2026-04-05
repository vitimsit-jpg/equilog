# Arbre de Décision Produit Global — Equilog

> Dernière mise à jour : analyse code avril 2026
> Statut : confirmé sur base code · hypothèses explicitement marquées [HYPOTHÈSE]

---

## NIVEAU 1 — QUI EST L'UTILISATEUR ?

```
Utilisateur Equilog
├── Non authentifié
│   ├── Accès : landing, /pricing, /login, /register
│   ├── Accès : /share/[horseId] (profil public si owner a activé le partage)
│   ├── Accès : /classements (leaderboard public)
│   ├── Accès : /ecurie/[name] (page publique écurie)
│   └── Accès : /flights (outil annexe)
│
└── Authentifié
    └── → NIVEAU 2 : Quel profil ?
```

---

## NIVEAU 2 — QUEL EST SON PROFIL ?

> ⚠️ COMPLEXITÉ : deux systèmes de profils coexistent dans le code.

### Système actuel (ProfileType, migration 021)
```
profile_type
├── "loisir"       — cavalier de loisir
├── "competition"  — cavalier en compétition
├── "pro"          — professionnel / semi-pro
└── "gerant"       — gestionnaire de structure
```

### Système legacy (UserType — encore actif dans la sidebar)
```
user_type (legacy)
├── "loisir"
├── "competition"
├── "pro"
├── "gerant_cavalier"   → mappé vers ProfileType "gerant" + rides_horse=true
├── "gerant_ecurie"     → mappé vers ProfileType "gerant" + module_gerant=true
└── "coach"             → mappé vers ProfileType "pro" + module_coach=true
```

### Modules additionnels (transverses, indépendants du profil)
```
module_coach: boolean   → accès CoachChat + gestion élèves
module_gerant: boolean  → accès /mon-ecurie (dashboard gérant)
is_admin: boolean       → accès /admin/* (back-office interne)
```

### Au niveau cheval (horse_user_roles)
```
HorseUserRole
├── "owner"      — propriétaire
├── "guardian"   — tuteur / responsable légal
└── "caretaker"  — soigneur / palefrenier
```
> rides_horse: boolean — distingue cavaliers (accès training) vs personnel terrain

---

## NIVEAU 3 — QUEL EST SON ABONNEMENT ?

```
Plan
├── "starter"   — gratuit
│   ├── 1 cheval [HYPOTHÈSE — limite non enforced dans le code]
│   ├── Modules core : health, training, competitions, budget
│   └── ❌ Video Analysis bloquée (seule restriction réellement active)
│
├── "pro"       — 9,90€/mois
│   ├── Chevaux illimités [non limité actuellement]
│   ├── Tous les modules
│   ├── Horse Index + classements
│   ├── AI illimité (Coach + Insights)
│   └── Export PDF bilan annuel
│
└── "ecurie"    — 29€/mois
    ├── Tout le plan Pro
    ├── Multi-cavaliers
    └── Dashboard gérant (/mon-ecurie)
```

> ⚠️ ÉTAT RÉEL : migration 054 assigne "ecurie" à tous les nouveaux users par défaut.
> Le paywall n'est pas enforced côté code sauf pour Video Analysis.
> L'abonnement Stripe existe (checkout, portal, webhook) mais sans enforcement applicatif.

---

## NIVEAU 4 — QU'A-T-IL LE DROIT DE VOIR ET FAIRE ?

### Navigation principale (toujours visible si authentifié)
```
/dashboard          — vue d'ensemble des chevaux
/planning           — tableau hebdomadaire
/communaute         — feed activité + réactions
/classements        — leaderboard Horse Index (public)
/exercises          — bibliothèque d'exercices
/profil             — paramètres compte + abonnement
```

### Navigation conditionnelle
```
/mon-ecurie         — visible si : profile_type="gerant" OR module_gerant=true
                      + legacy : user_type IN ("gerant_ecurie", "gerant_cavalier")
```

### Navigation par cheval (/horses/[id]/*)
```
Tous profils        — /horses/[id] (fiche)
                    — /horses/[id]/health
                    — /horses/[id]/training
                    — /horses/[id]/competitions
                    — /horses/[id]/budget
                    — /horses/[id]/documents
                    — /horses/[id]/historique
                    — /horses/[id]/genealogie

Conditionnel plan   — /horses/[id]/video         ← plan !== "starter" uniquement
Conditionnel cheval — /horses/[id]/nutrition      ← horse.module_nutrition=true uniquement
```

### Ordre de navigation dans la sidebar (varie par profil)
```
loisir      : health → training → video → budget → competitions
competition : health → competitions → training → video → budget
pro         : health → training → video → competitions → budget
gerant      : health → budget → training → competitions
```
> Note : seul l'ordre change, pas les accès (sauf video gated par plan)

---

## NIVEAU 5 — FONCTIONNALITÉS AVANCÉES

### Horse Index
```
Disponible pour tous les profils et abonnements
6 modes : IE | IC | ICr | IR | IS | IP
├── IE  — Équilibre (loisir/pratique régulière)
├── IC  — Compétition (préparation concours)
├── ICr — Croissance (poulain/jeune cheval) → calibrage 180j
├── IR  — Convalescence (repos médical)
├── IS  — Retraite (faible activité)
└── IP  — Rééducation (progression rehab)

Statuts : incomplet | calibrage | actif
Calibrage : 30j standard, 180j pour ICr
Breakdown : sante_score, bienetre, activite, suivi_proprio
Classements : percentile région + percentile discipline
```

### AI & Coach
```
module_coach=true
├── CoachChat (streaming Claude, contextualisé par cheval)
├── AI Insights (weekly/alert/milestone)
├── Voice transcription → structuration séance
├── Training plan generation
└── Gestion élèves (GestionEleves component)

Toujours disponible (sans module_coach)
├── AI Insights basiques
└── Checklist IA pré-concours
```

### Profil public
```
share_horse_index=true (champ horse)
└── /share/[horseId] → Horse Index, activité, palmarès visibles publiquement
```

---

## DIAGRAMME MERMAID — LOGIQUE D'ACCÈS MACRO

```mermaid
flowchart TD
    A[Utilisateur] --> B{Authentifié ?}
    B -- Non --> C[Pages publiques\n/ · /pricing · /login · /register\n/share · /classements · /ecurie]
    B -- Oui --> D{Profil ?}

    D --> E[loisir]
    D --> F[competition]
    D --> G[pro]
    D --> H[gerant]

    E & F & G & H --> I[Dashboard + Core Modules\nHealth · Training · Competitions · Budget\nHorse Index · Planning · Communauté]

    I --> J{module_coach ?}
    J -- Oui --> K[CoachChat\nAI Insights avancés\nGestion élèves]
    J -- Non --> L[AI Insights basiques]

    I --> M{module_gerant\nOR gerant ?}
    M -- Oui --> N[/mon-ecurie\nDashboard multi-chevaux]

    I --> O{Plan ?}
    O -- starter --> P[❌ Video Analysis bloquée]
    O -- pro/ecurie --> Q[✅ Video Analysis]

    I --> R{horse.module_nutrition ?}
    R -- Oui --> S[Module Nutrition]

    I --> T{is_admin ?}
    T -- Oui --> U[/admin/*\nBack-office]
```

---

## PARCOURS CRITIQUES PAR PROFIL

| Profil | Parcours principal | Modules prioritaires |
|--------|--------------------|----------------------|
| loisir | Santé → Travail → Index | health, training, horse-index |
| competition | Concours → Santé → Index | competitions, health, horse-index, training |
| pro | Travail → Santé → Video | training, health, video, horse-index |
| gerant | Santé → Budget → Écurie | health, budget, mon-ecurie |
| coach (via module) | Coaching → Travail élèves | coach-chat, training, horse-index |

---

## POINTS DE DÉCISION AMBIGUS

| # | Ambiguïté | Impact |
|---|-----------|--------|
| 1 | Paywall non enforced → tous les users ont accès complet | Business critique |
| 2 | UserType legacy + ProfileType coexistent dans la sidebar | Confusion code + UX |
| 3 | module_coach ≠ abonnement → pas lié à un tier de prix | Modèle monétisation flou |
| 4 | horse_user_roles existe en DB, aucune UI de gestion | Feature zombie |
| 5 | Starter = 1 cheval → non enforced dans PLAN_LIMITS | Limite non réelle |
