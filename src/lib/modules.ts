export const MODULES_OPTIONNELS = [
  {
    key: "journal_seances",
    label: "Journal de séances",
    emoji: "🏇",
    description: "Enregistrez vos séances et suivez la progression de votre cheval",
    defaultActive: true,
  },
  {
    key: "communaute",
    label: "Communauté",
    emoji: "👥",
    description: "Échangez avec d'autres cavaliers et suivez l'activité de votre écurie",
    defaultActive: true,
  },
  {
    key: "budget",
    label: "Budget",
    emoji: "💰",
    description: "Suivez les dépenses liées à votre cheval et gérez votre budget",
    defaultActive: false,
  },
  {
    key: "documents",
    label: "Documents",
    emoji: "📄",
    description: "Gérez passeports, contrats, ordonnances et fichiers importants",
    defaultActive: false,
  },
  {
    key: "planning",
    label: "Planning & Programme",
    emoji: "📅",
    description: "Planifiez vos séances et suivez votre programme d'entraînement",
    defaultActive: false,
  },
  {
    key: "analyse_ia",
    label: "Analyse IA",
    emoji: "🤖",
    description: "Analysez vos vidéos et obtenez des insights personnalisés par l'IA",
    defaultActive: false,
  },
] as const;

export type ModuleKey = (typeof MODULES_OPTIONNELS)[number]["key"];

export const DEFAULT_MODULES: Record<ModuleKey, boolean> = {
  journal_seances: true,
  communaute: true,
  budget: false,
  documents: false,
  planning: false,
  analyse_ia: false,
};

export function getModules(userModules: Record<string, boolean> | null | undefined): Record<ModuleKey, boolean> {
  return {
    ...DEFAULT_MODULES,
    ...(userModules ?? {}),
  } as Record<ModuleKey, boolean>;
}
