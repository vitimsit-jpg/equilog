# Complexités, Lacunes et Risques Produit — Equilog

> Analyse code avril 2026
> Objectif : identifier ce qui rend le produit difficile à faire évoluer, risqué à monétiser, ou ambigu à développer

---

## 1. COMPLEXITÉS INUTILES

### 1.1 Double système de profils en parallèle

**Ce qui existe :**
- `ProfileType` (nouveau, migration 021) : 4 valeurs → `loisir | competition | pro | gerant`
- `UserType` (legacy) : 6 valeurs → `loisir | competition | pro | gerant_cavalier | coach | gerant_ecurie`

**Le problème :**
La sidebar utilise encore les 6 valeurs legacy comme fallback. Le code contient des `if (userType === "gerant_ecurie" || userType === "gerant_cavalier")` mélangés avec des `if (profile_type === "gerant")`. Deux sources de vérité pour la même information.

**Risque :** Tout développeur qui touche à la navigation ou aux permissions doit gérer les deux systèmes simultanément. Chaque nouveau prompt de développement doit préciser lequel des deux systèmes cibler.

---

### 1.2 `module_coach` et `module_gerant` : modules transverses sans ancrage pricing

**Ce qui existe :**
Deux boolean flags sur le user, activables à l'onboarding (step 2) ou en settings, indépendamment de l'abonnement.

**Le problème :**
Ces modules débloquent des fonctionnalités qui correspondent normalement à des tiers payants (Pro pour Coach, Écurie pour Gérant). Mais dans le code, le check est uniquement `module_coach === true`, pas `plan === "pro" && module_coach === true`.

**Risque :** Un user en Starter peut activer `module_coach` et accéder au CoachChat sans payer. Les gates existent socialement (onboarding) mais pas économiquement.

---

### 1.3 Navigation par profil = réordonnancement, pas restriction d'accès

**Ce qui existe :**
`HORSE_NAV_BY_PROFILE` dans la sidebar réordonne les items selon le profil (`health` en premier pour `loisir`, `competitions` en premier pour `competition`...).

**Le problème :**
L'utilisateur peut accéder à n'importe quelle page en changeant l'URL, quelle que soit la position dans la sidebar. La navigation customisée donne une illusion de personnalisation sans réelle segmentation.

**Risque :** Si on veut un jour vraiment restreindre des pages à certains profils, il faut retravailler toute la logique d'accès, pas juste l'ordre.

---

### 1.4 `horse_user_roles` : table en DB sans UI

**Ce qui existe :**
Table `horse_user_roles` avec `role = owner | guardian | caretaker` et `rides_horse: boolean`. Plusieurs hooks s'appuient dessus (`useRidesHorse`).

**Le problème :**
Aucune interface de gestion de ces rôles n'est visible dans l'application. La table existe, les hooks existent, mais on ne sait pas comment un owner assigne un rôle à un autre user.

**Risque :** Feature à moitié implémentée. Si un développeur veut l'utiliser, il part d'une base incomplète et doit d'abord comprendre ce qui manque.

---

### 1.5 7 étapes d'onboarding

**Ce qui existe :**
Onboarding en 7 steps (profil → modules → cheval → préférences → trousseau → rider profile → notifications).

**Le problème :**
Les steps 5 (trousseau) et 6 (rider profile) collectent des données détaillées (asymétrie, pathologies, zones douloureuses...) dont l'impact produit n'est pas visible dans l'application. La donnée est stockée mais pas exploitée de manière visible.

**Risque :** Friction à l'activation sans valeur perçue. Drop potentiel sur ces steps.

---

## 2. INCOHÉRENCES DE LOGIQUE

### 2.1 Paywall inexistant — tous les users ont accès complet

**Constat :**
- Migration 054 : tous les nouveaux users → plan "ecurie" par défaut
- `PLAN_LIMITS` : `maxHorses: Infinity` pour tous les plans
- Seule restriction effective : Video Analysis bloquée pour `plan === "starter"`

**Implication :**
La page `/pricing` vend 3 abonnements distincts, mais le produit en délivre un seul (le plus premium) à tout le monde gratuitement.

**Risque :**
- Aucune incitation à payer (pas de mur, pas de friction)
- Si le paywall est activé un jour, les users existants vivront une régression
- La roadmap monétisation est bloquée tant que cette situation n'est pas résolue

---

### 2.2 Les restrictions "Starter" communiquées ≠ restrictions codées

**Communication produit (page /pricing) :**
- Starter = 1 cheval, sans Horse Index, sans classements, sans AI

**Réalité du code :**
- Starter = tout accessible sauf Video Analysis
- Horse Index disponible en Starter
- Classements disponibles en Starter
- AI Insights disponibles en Starter

**Risque :** Si un user Starter va sur `/pricing`, il croit être limité alors qu'il ne l'est pas. Confusion et perte de crédibilité.

---

### 2.3 Plan Écurie ≠ nécessairement lié au profil gerant

**Communication produit :**
Plan Écurie = pour les structures, dashboard gérant, multi-cavaliers

**Réalité du code :**
L'accès `/mon-ecurie` est conditionné par `profile_type="gerant" OR module_gerant=true`, pas par `plan="ecurie"`. Un user `pro` avec `module_gerant=true` accède au dashboard gérant sans plan Écurie.

---

### 2.4 ICr (mode poulain) — traitement différencié mais partiel

**Ce qui est fait :**
- Calibrage 180j (vs 30j) — maintenant corrigé dans le code
- Onglets spécifiques dans TrainingTabs (ICr traité comme IC)

**Ce qui manque :**
- Les milestones de croissance (sevrage, débourrage...) sont dans le code mais leur date est-elle dynamique par rapport à birth_year ?
- Aucune différenciation visible dans les classements pour les jeunes chevaux [H]

---

## 3. DOUBLONS POTENTIELS

| Doublon | Description |
|---------|-------------|
| `/settings` et `/profil` | `/settings` redirige vers `/profil` — deux routes pour une seule page |
| `UserType` et `ProfileType` | Deux systèmes de profils pour la même information |
| `module_gerant` et `profile_type="gerant"` | Deux gates pour la même feature (`/mon-ecurie`) |
| AI Insights + CoachChat | Deux systèmes IA avec des périmètres qui se chevauchent |
| `Training → VueSemaine` et `/planning → TableauHebdomadaire` | Deux vues semaine sur des pages différentes |

---

## 4. PERMISSIONS PEU LISIBLES

### 4.1 Gate `/mon-ecurie` — 4 conditions en OR
```typescript
if (
  profile_type === "gerant" ||
  module_gerant === true ||
  user_type === "gerant_ecurie" ||   // legacy
  user_type === "gerant_cavalier"    // legacy
)
```
4 conditions en OR pour la même feature = toute modification future doit penser à toutes les combinaisons.

### 4.2 Horse Index — statuts implicites
Le statut Horse Index (`incomplet | calibrage | actif`) est calculé dans l'API route à chaque appel, pas stocké de façon fiable en base. Si la logique change, les statuts historiques sont perdus.

### 4.3 `rides_horse` — comportement par défaut ambigu
```typescript
// useRidesHorse hook
return ridesHorse ?? true  // true par défaut si pas d'entrée
```
Par défaut, tout user est considéré comme "cavalier" même sans entrée en base. Logique silencieuse qui peut créer des bugs si on restreint l'accès au training par ce flag.

---

## 5. RISQUES UX / PRODUIT / CONVERSION

| # | Risque | Sévérité | Type |
|---|--------|----------|------|
| R1 | Paywall non enforced → zéro conversion payante | 🔴 Critique | Business |
| R2 | Page pricing promet des features non livrées (en Starter on a tout) | 🔴 Critique | Trust |
| R3 | 7 étapes onboarding → drop rate élevé avant activation | 🟡 Important | Activation |
| R4 | Double système profils → maintenance et bugs futurs | 🟡 Important | Technique |
| R5 | `horse_user_roles` zombie → confusion si activé plus tard | 🟡 Important | Technique |
| R6 | Données rider profile collectées mais non exploitées → friction sans valeur | 🟡 Important | UX |
| R7 | Navigation réordonnée ≠ restriction réelle → illusion de personnalisation | 🟢 Faible | UX |
| R8 | CoachChat accessible sans lien au plan → impossible à monétiser | 🟡 Important | Business |
| R9 | Classements publics sans restriction → valeur différenciante diluée | 🟢 Faible | Business |
| R10 | Video Analysis = seule vraie raison de passer Pro → très fragile | 🔴 Critique | Business |

---

## 6. POINTS À CLARIFIER AVANT D'ÉCRIRE DES PROMPTS DE DEV PRÉCIS

### Décisions stratégiques en suspens

**A — Quelle est la stratégie paywall réelle ?**
- Les restrictions de la page `/pricing` doivent-elles être implémentées dans le code ?
- Quand ? Avec quelle migration users existants ?
- Starter = vraiment 1 cheval ? Horse Index bloqué ? AI bloquée ?

**B — Les 6 profils ou les 4 profils ?**
- Garder les 6 UserType legacy ou migrer complètement vers les 4 ProfileType ?
- Cette décision impacte toute la logique de navigation et de permissions

**C — `module_coach` : module payant ou feature gratuite ?**
- Si payant : à quel tier ? Comment enforcer ?
- Si gratuit : à quoi sert le tier Pro ?

**D — `horse_user_roles` : quel est le plan pour cette feature ?**
- Implémenter l'UI de gestion des rôles ?
- Ou supprimer la table si non prioritaire ?

**E — Données rider profile : quel usage prévu ?**
- Personnalisation des recommendations IA ?
- Coaching personnalisé ?
- Ou collecte de données sans usage défini ?

**F — Les classements doivent-ils rester publics pour tous ?**
- Ou restreindre l'accès aux classements complets au plan Pro ?

**G — ICr (poulain) : milestones dynamiques ?**
- Les dates de sevrage/débourrage sont-elles calculées par rapport à birth_year ?
- Ou saisies manuellement ?

**H — Mon Écurie : lié au plan Écurie ou au profil ?**
- Actuellement : profil ou module → décision à aligner avec la page pricing
