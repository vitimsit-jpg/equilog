# Matrice Profils × Abonnements × Fonctionnalités — Equilog

> Analyse code avril 2026
> Les restrictions indiquées sont celles **effectivement en place dans le code**.
> Les restrictions "intentions produit" (non enforced) sont signalées séparément.

---

## LÉGENDE

| Symbole | Signification |
|---------|---------------|
| ✅ | Accès complet — confirmé dans le code |
| 🔶 | Accès partiel ou conditionnel |
| ❌ | Bloqué — confirmé dans le code |
| ⚠️ | Intention produit non enforced (devrait être limité mais ne l'est pas) |
| ❓ | Ambiguïté — règle non clairement définie dans le code |
| [H] | Hypothèse — non confirmée dans le code |

---

## MATRICE 1 — FONCTIONNALITÉS CORE PAR PROFIL

> L'abonnement n'a actuellement que peu d'impact sur cette matrice (voir Matrice 2).
> Ce qui différencie les profils, c'est principalement l'**ordre de navigation** et les **modules additionnels**.

| Fonctionnalité | loisir | competition | pro | gerant | module_coach | module_gerant | is_admin |
|----------------|--------|-------------|-----|--------|--------------|---------------|----------|
| Dashboard (vue d'ensemble) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Carnet de santé | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Journal de travail | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Concours | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Budget | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Horse Index (score) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Classements | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Planning hebdomadaire | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Communauté (feed) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Documents cheval | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Généalogie | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Historique vie | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bibliothèque exercices | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Profil public (/share) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export PDF bilan | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Saisie vocale | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI Insights (basique) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Nutrition module | 🔶 | 🔶 | 🔶 | 🔶 | 🔶 | 🔶 | ✅ |
| Navigation réordonnée | ✅ | ✅ | ✅ | ✅ | ❓ | ❓ | ❓ |
| **CoachChat (streaming IA)** | ❌ | ❌ | ❌ | ❌ | **✅** | ❌ | ✅ |
| Gestion élèves | ❌ | ❌ | ❌ | ❌ | **✅** | ❌ | ✅ |
| **Mon Écurie (/mon-ecurie)** | ❌ | ❌ | ❌ | **✅** | ❌ | **✅** | ✅ |
| **Back-office (/admin)** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |

> **Note Nutrition** : gated par `horse.module_nutrition=true` (flag par cheval, pas par user).
> Aucune restriction profil — c'est un toggle opérationnel, pas une permission.

---

## MATRICE 2 — FONCTIONNALITÉS PAR ABONNEMENT (ÉTAT RÉEL DU CODE)

> ⚠️ AVERTISSEMENT : la grande majorité des restrictions d'abonnement sont des **intentions produit non enforced**.
> Le seul vrai gate actif est Video Analysis.

| Fonctionnalité | Starter | Pro | Écurie | Statut enforcement |
|----------------|---------|-----|--------|-------------------|
| Tous les modules core | ✅ | ✅ | ✅ | Enforced (pas de restriction) |
| Horse Index | ✅ | ✅ | ✅ | Enforced (pas de restriction) |
| AI Insights | ✅ | ✅ | ✅ | Enforced (pas de restriction) |
| Export PDF | ✅ | ✅ | ✅ | Enforced (pas de restriction) |
| Classements | ✅ | ✅ | ✅ | Enforced (pas de restriction) |
| Communauté | ✅ | ✅ | ✅ | Enforced (pas de restriction) |
| Chevaux illimités | ⚠️ (1 prévu) | ✅ | ✅ | **NON enforced** — PLAN_LIMITS = Infinity |
| **Video Analysis** | **❌** | **✅** | **✅** | **✅ Enforced** — seule vraie restriction |
| CoachChat | ⚠️ Pro prévu | ✅ | ✅ | **NON enforced** — gated par module_coach seulement |
| Dashboard gérant | ⚠️ Écurie prévu | ⚠️ Pro ? | ✅ | **NON enforced** — gated par profil/module seulement |
| Multi-cavaliers | ⚠️ Écurie prévu | ❓ | ✅ | **NON enforced** |

---

## MATRICE 3 — CROISEMENT PROFIL × ABONNEMENT (RÉALITÉ EFFECTIVE)

> Puisque le paywall n'est pas enforced, le vrai différenciateur est le profil + les modules.

| | Starter | Pro | Écurie |
|--|---------|-----|--------|
| **loisir** | Core + Index ⚠️(pas Video) | Core + Index + Video | Core + Index + Video |
| **competition** | Core + Index ⚠️(pas Video) | Core + Index + Video | Core + Index + Video |
| **pro** | Core + Index ⚠️(pas Video) | Core + Index + Video | Core + Index + Video |
| **gerant** | Core + Index + Mon Écurie ⚠️(pas Video) | Core + Index + Mon Écurie + Video | Core + Index + Mon Écurie + Video |
| **+ module_coach** | + CoachChat (indép. du plan) | + CoachChat | + CoachChat |
| **+ module_gerant** | + Mon Écurie (indép. du plan) | + Mon Écurie | + Mon Écurie |

---

## AMBIGUÏTÉS ET RÈGLES IMPLICITES DÉTECTÉES

| # | Observation | Type | Impact |
|---|-------------|------|--------|
| 1 | `module_coach` et `module_gerant` ne sont pas liés à un tier de prix dans le code | Incohérence modèle | Moyen |
| 2 | Tous nouveaux users → plan "ecurie" par défaut (migration 054) | Décision temporaire ou permanente ? | Fort |
| 3 | PLAN_LIMITS.starter.maxHorses = Infinity | Limite non implémentée | Fort |
| 4 | Video Analysis est la seule feature gated par plan — toutes les autres sont libres | Paywall quasi inexistant | Critique |
| 5 | Navigation réordonnée par profil mais accès identiques | UX de personnalisation ≠ access control | Faible |
| 6 | `horse_user_roles` (owner/guardian/caretaker) sans UI de gestion | Feature zombie | Moyen |
| 7 | legacy `user_type` toujours dans la sidebar (6 valeurs) alors que `profile_type` en a 4 | Double système | Moyen |
| 8 | Module Nutrition = toggle par cheval, pas par user ou plan | Logique opérationnelle, pas business | Faible |
| 9 | `rider_*` fields (niveau, disciplines, objectifs) existent mais impact produit non visible | Donnée collectée, non exploitée | Moyen |
| 10 | Profil public `/share` conditionnel à `share_horse_index=true` mais pas au plan | [HYPOTHÈSE] Devrait être Pro+ ? | À clarifier |
