# Coach IA

Chat flottant IA contextualisé par cheval, avec streaming Claude.

## Architecture
- API : `/api/coach-chat/` — streaming via Anthropic SDK
- Composant : `CoachChat` — portal sur `document.body`
- Présent sur toutes les pages cheval via `horses/[id]/layout.tsx`

## Fonctionnalités
- Streaming des réponses
- Contexte du cheval injecté automatiquement
- Historique de conversation en session

## Saisie vocale
- `VoiceButton` — Web Speech API → Claude structure le texte
- Compatible Chrome/Safari uniquement (Firefox : message "non disponible")
- API : `/api/voice-transcribe/`

## Liens
- [[horse-index]]
- [[../architecture/stack-technique|Stack technique]]
