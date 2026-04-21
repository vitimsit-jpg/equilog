# ADR-001 : Système de profils utilisateur

**Date** : avril 2026
**Statut** : accepté

## Contexte
Besoin de personnaliser l'expérience selon le type d'utilisateur.

## Décision
4 profils via `profile_type` (migration 021) :
- `loisir` — cavalier loisir
- `competition` — cavalier compétiteur
- `pro` — professionnel
- `gerant` — gérant d'écurie

Modules optionnels : `module_coach`, `module_gerant`

## Conséquences
- Dashboard adapté par profil
- Accès `/mon-ecurie` restreint aux gérants
- Badge profil visible sur le feed
