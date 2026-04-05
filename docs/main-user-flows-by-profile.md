# Parcours Principaux par Profil — Equilog

> Analyse code avril 2026
> [H] = Hypothèse non confirmée · [C] = Confirmé dans le code

---

## PROFIL 1 — LOISIR

**Qui** : cavalier pratiquant pour le plaisir, sans objectif compétitif fort
**Priorité produit** : suivi santé + traçabilité travail + tranquillité d'esprit

### Parcours principal : suivi quotidien du cheval

```
Onboarding
  → profile_type = "loisir"
  → module_coach = optionnel (step 2)
  → Création cheval (nom, race, discipline, écurie)
  → Configuration Horse Index mode → IE (Équilibre)
  ↓
Usage récurrent
  → Dashboard → voir score Horse Index + alertes santé
  → /horses/[id]/health → logger soin (vaccin, ostéo, ferrage...)
  → /horses/[id]/training → logger séance (type, intensité, ressenti)
  → /horses/[id]/budget → suivre dépenses
  ↓
Usage occasionnel
  → /planning → voir semaine à venir
  → /classements → se situer par rapport aux autres
  → /share/[id] → partager le profil du cheval
```

### Pages utilisées principalement
- `/dashboard` · `/horses/[id]` · `/horses/[id]/health` · `/horses/[id]/training` · `/horses/[id]/budget`

### Dépendance abonnement
- ⚠️ Video Analysis bloquée si plan Starter [seule vraie restriction active]
- Tout le reste accessible (paywall non enforced)

### Blocages / limites
- Pas de CoachChat sans `module_coach=true`
- Navigation : health en premier (logique avec priorité loisir)

### Parcours secondaires
- `/horses/[id]/genealogie` — curiosité pedigree
- `/communaute` — partage activité
- `/horses/[id]/documents` — historique médical

---

## PROFIL 2 — COMPETITION

**Qui** : cavalier avec objectifs de performance, participe à des concours
**Priorité produit** : gestion concours + préparation + suivi performance

### Parcours principal : cycle concours

```
Onboarding
  → profile_type = "competition"
  → Horse Index mode → IC (Compétition)
  ↓
Préparation concours
  → /horses/[id]/competitions → créer concours à venir
  → AI checklist pré-concours générée automatiquement
  → /horses/[id]/training → planifier séances de prépa
  → /planning → vue hebdomadaire de la charge d'entraînement
  ↓
Suivi performance
  → /horses/[id] → Horse Index score (mode IC)
  → /classements → se situer vs discipline / région
  → /horses/[id]/competitions → saisir résultats post-concours
  ↓
Récupération
  → /horses/[id]/health → soins post-effort
  → /horses/[id]/training → logger séances légères
```

### Pages utilisées principalement
- `/horses/[id]/competitions` · `/horses/[id]/training` · `/planning` · `/classements` · `/horses/[id]/health`

### Dépendance abonnement
- Video Analysis (Pro+) utile pour analyse posture/foulée en prépa
- [H] Classements → accessible à tous (confirmé : pas de restriction plan)

### Blocages / limites
- Navigation : competitions en 2e position (logique)
- Pas de CoachChat sans `module_coach=true`

### Parcours secondaires
- `/horses/[id]/budget` — suivi coûts concours
- `/share/[id]` — profil public avec palmarès

---

## PROFIL 3 — PRO

**Qui** : professionnel (entraîneur, cavalier pro, préparateur physique)
**Priorité produit** : gestion intensive travail + vidéo + performance multi-chevaux

### Parcours principal : gestion intensive entraînement

```
Onboarding
  → profile_type = "pro"
  → module_coach probable (accès coaching élèves)
  → Plusieurs chevaux créés
  ↓
Usage quotidien intensif
  → Dashboard → vue multi-chevaux
  → /horses/[id]/training → logs détaillés (type, durée, intensité, coach_present, objectif)
  → Saisie vocale → structuration rapide des séances
  → /horses/[id]/video → analyse foulée (Pro+ requis)
  ↓
Suivi performance
  → Horse Index score en mode IC ou IE selon cheval
  → AI Insights → alertes + recommandations
  → /horses/[id]/training → historique + graphiques
```

### Pages utilisées principalement
- `/horses/[id]/training` · `/horses/[id]/video` · `/dashboard` · `/horses/[id]`

### Dépendance abonnement
- Video Analysis est la fonctionnalité centrale pour ce profil → Plan Pro nécessaire
- [H] Ce profil est le plus sensible au paywall video

### Blocages / limites
- Video Analysis bloquée en Starter (critique pour ce profil)
- Navigation : training en 2e position, video en 3e

### Parcours secondaires
- `/horses/[id]/competitions` · `/horses/[id]/health`
- Si `module_coach=true` : gestion élèves + CoachChat

---

## PROFIL 4 — GERANT

**Qui** : gestionnaire d'écurie, responsable d'une structure (pension, école d'équitation)
**Priorité produit** : supervision multi-chevaux + santé + budget structure

### Parcours principal : gestion de structure

```
Onboarding
  → profile_type = "gerant"
  → module_gerant = true (automatique [H])
  → Configuration écurie
  ↓
Usage quotidien
  → /mon-ecurie → vue consolidée de tous les chevaux sous gestion
  → /horses/[id]/health → soins de l'ensemble du cheptel
  → /horses/[id]/budget → dépenses par cheval
  ↓
Gestion administrative
  → Documents, historiques médicaux
  → Rappels automatiques vaccins/soins (cron daily)
  → Budget global
```

### Pages utilisées principalement
- `/mon-ecurie` · `/horses/[id]/health` · `/horses/[id]/budget` · `/dashboard`

### Dépendance abonnement
- Plan Écurie prévu pour cette cible [HYPOTHÈSE — non enforced]
- `/mon-ecurie` gated par profile_type=gerant OR module_gerant (pas par plan)

### Blocages / limites
- Navigation : health en premier, budget en 2e (logique gestion)
- Accès concours et training de moindre priorité dans l'ordre de navigation

### Parcours secondaires
- `/planning` → planifier interventions (ferrage, ostéo...)
- `/classements` → voir les chevaux de l'écurie dans les rankings

---

## PROFIL 5 — COACH (via module_coach)

**Qui** : entraîneur/coach qui suit des cavaliers-élèves
**Priorité produit** : suivi élèves + recommandations + CoachChat contextuel

> Ce profil est un overlay du profil de base (loisir/competition/pro) + `module_coach=true`
> Il n'existe PAS comme profil_type autonome dans le nouveau système.

### Parcours principal : coaching élèves

```
Activation
  → module_coach = true (step 2 onboarding ou settings)
  ↓
Usage récurrent
  → CoachChat (flottant sur toutes les pages /horses/[id]/*)
     → Contexte automatique : cheval, séances, santé, Horse Index
     → Réponses streaming Claude
  → Gestion élèves (GestionEleves component)
  → /horses/[id]/training → suivi progression élèves
  ↓
Suivi performance
  → AI Insights avancés
  → Horse Index breakdown pour analyse
```

### Dépendance abonnement
- `module_coach` n'est pas lié à un tier de prix dans le code [INCOHÉRENCE]
- [H] Devrait être Pro+ mais ce n'est pas enforced

---

## PROFIL 6 — ADMIN (is_admin)

**Qui** : équipe interne Equilog
**Priorité produit** : monitoring, support, audit

### Parcours principal : supervision plateforme

```
/admin → analytics overview
/admin/users → liste + suspension users
/admin/audit → log d'actions
/admin/comportement → analytics comportement
/admin/events → tracking événements
```

### Dépendance abonnement
- Aucune — is_admin bypasse toutes les restrictions

---

## ONBOARDING — PARCOURS COMMUN

```
/register → /onboarding

Step 1 : Choix profil (loisir / competition / pro / gerant)
Step 2 : Modules optionnels (module_coach, module_gerant)
Step 3 : Création premier cheval
Step 4 : Préférences modules
Step 5 : Trousseau (couvertures/vêtements)
Step 6 : Profil cavalier (niveau, disciplines, objectifs, santé)
Step 7 : Préférences notifications

→ Redirect vers /dashboard
```

> Points de friction onboarding :
> - 7 étapes = potentiellement long
> - Modules (step 2) présentés avant la création du cheval (step 3) → ordre contre-intuitif [H]
> - Pas de skip visible sur toutes les étapes [C : onboarding_step track en DB]

---

## PARCOURS CRITIQUES BUSINESS

| Priorité | Parcours | Profil cible | Raison |
|----------|----------|--------------|--------|
| 🔴 Critique | Register → Onboarding → Dashboard (1er cheval) | Tous | Activation utilisateur |
| 🔴 Critique | Voir Horse Index score → upgrade plan | Tous | Conversion vers Pro |
| 🔴 Critique | Voir "Video bloquée" → upgrade | Pro/Competition | Conversion critique |
| 🟡 Important | Logger séance quotidienne (< 30 secondes) | Tous | Rétention |
| 🟡 Important | Recevoir rappel soin → ouvrir app | Tous | Engagement (cron daily) |
| 🟡 Important | Créer concours → checklist IA | Competition | Valeur différenciante |
| 🟢 Secondaire | Partager profil public | Tous | Viralité / acquisition |
| 🟢 Secondaire | Voir classements | Competition/Pro | Engagement communauté |
