# Horse Index

Score global /100 pour chaque cheval, calculé via `/api/horse-index/`.

## Modes d'index (migration 020)
| Code | Nom |
|------|-----|
| IC | Index Compétition |
| IE | Index Élevage |
| IP | Index Performance |
| IR | Index Retraite |
| IS | Index Santé |
| ICr | Index Croissance |

## Score Breakdown v2
- `version: 2`
- `sante_score` — santé globale
- `bienetre` — bien-être
- `activite` — activité / entraînement
- `suivi_proprio` — régularité du suivi

## Composants
- `HorseIndexGauge` — jauge SVG demi-cercle
- Historique 90 jours + percentiles région/catégorie

## Liens
- [[../architecture/structure-app|Structure app]]
- [[carnet-sante]]
- [[journal-travail]]
