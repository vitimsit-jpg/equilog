# Carnet de santé

Vue d'ensemble par catégorie + onglet historique (migration 003).

## Types de soins
vaccin, vermifuge, dentiste, osteo, ferrage (affiché "Parage"), veterinaire, masseuse, autre

## Champs spécifiques
- `practitioner_phone` — téléphone praticien
- `product_name` — nom du produit
- `urgency` — niveau d'urgence

## Composants
- `HealthOverview` — banner résumé (overdue/soon/à planifier) + grille de cards
- `HealthCategoryCard` — card par type avec badge statut, dates, lien tel
- `HealthEventModal` — modal ajout/édition unifié
- `HealthTimeline` — timeline 30j avec badges urgence

## Règles métier
- Intervalle parage = **35 jours**
- Badge statut global : vert / orange / rouge
- Mémorisation praticien via `localStorage`

## Liens
- [[horse-index]]
- [[../architecture/structure-app|Structure app]]
