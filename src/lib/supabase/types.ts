export type UserPlan = "starter" | "pro" | "ecurie";
export type UserType = "loisir" | "competition" | "pro" | "gerant_cavalier" | "coach" | "gerant_ecurie";
export type HealthType = "vaccin" | "vermifuge" | "dentiste" | "osteo" | "ferrage" | "veterinaire" | "masseuse" | "autre";
export type TrainingType = "dressage" | "saut" | "endurance" | "cso" | "cross" | "travail_a_pied" | "longe" | "galop" | "plat" | "marcheur" | "autre";
export type WearableSource = "equisense" | "seaver" | "garmin" | "equilab" | "autre";
export type BudgetCategory = "pension" | "soins" | "concours" | "equipement" | "maréchalerie" | "alimentation" | "transport" | "autre";
export type Discipline = "CSO" | "Dressage" | "CCE" | "Endurance" | "Attelage" | "Voltige" | "TREC" | "Hunter" | "Equitation_Western" | "Autre";

export interface User {
  id: string;
  email: string;
  name: string;
  plan: UserPlan;
  user_type: UserType | null;
  created_at: string;
}

export interface Horse {
  id: string;
  user_id: string;
  name: string;
  breed: string | null;
  birth_year: number | null;
  discipline: Discipline | null;
  photo_url: string | null;
  avatar_url: string | null;
  share_horse_index: boolean;
  region: string | null;
  ecurie: string | null;
  sexe: "hongre" | "jument" | "etalon" | null;
  conditions_vie: "box" | "paddock" | "pre" | "box_paddock" | null;
  objectif_saison: string | null;
  niveau: string | null;
  maladies_chroniques: string | null;
  assurance: string | null;
  sire_number: string | null;
  fei_number: string | null;
  created_at: string;
}

export interface HealthRecord {
  id: string;
  horse_id: string;
  type: HealthType;
  date: string;
  next_date: string | null;
  notes: string | null;
  vet_name: string | null;
  cost: number | null;
  practitioner_phone: string | null;
  practitioner_email: string | null;
  product_name: string | null;
  urgency: "normal" | "urgent" | "critique" | null;
  created_at: string;
}

export interface TrainingSession {
  id: string;
  horse_id: string;
  date: string;
  type: TrainingType;
  duration_min: number;
  intensity: 1 | 2 | 3 | 4 | 5;
  feeling: 1 | 2 | 3 | 4 | 5;
  notes: string | null;
  objectif: string | null;
  lieu: string | null;
  coach_present: boolean | null;
  equipement_recuperation: string | null;
  wearable_source: WearableSource | null;
  media_urls: string[] | null;
  created_at: string;
}

export interface Competition {
  id: string;
  horse_id: string;
  date: string;
  event_name: string;
  discipline: Discipline;
  level: string;
  result_rank: number | null;
  total_riders: number | null;
  score: number | null;
  notes: string | null;
  location: string | null;
  media_urls: string[] | null;
  created_at: string;
}

export interface BudgetEntry {
  id: string;
  horse_id: string;
  date: string;
  category: BudgetCategory;
  amount: number;
  description: string | null;
  created_at: string;
}

export interface WearableData {
  id: string;
  horse_id: string;
  source: WearableSource;
  date: string;
  raw_json: Record<string, unknown> | null;
  hr_avg: number | null;
  hr_recovery: number | null;
  symmetry_score: number | null;
  gait_analysis: Record<string, unknown> | null;
  created_at: string;
}

export interface HorseScore {
  id: string;
  horse_id: string;
  score: number;
  score_breakdown: ScoreBreakdown;
  computed_at: string;
  percentile_region: number | null;
  percentile_category: number | null;
  region: string | null;
}

export interface ScoreBreakdown {
  regularite: number;
  progression: number;
  sante: number;
  recuperation: number;
  wearables: number;
  total: number;
  has_wearables: boolean;
}

export interface AIInsight {
  id: string;
  horse_id: string;
  content: string;
  generated_at: string;
  type: "weekly" | "alert" | "milestone" | "training_plan";
  created_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type T<R = any> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: never[];
};

export interface Database {
  public: {
    Tables: {
      users: T<User>;
      horses: T<Horse>;
      health_records: T<HealthRecord>;
      training_sessions: T<TrainingSession>;
      competitions: T<Competition>;
      budget_entries: T<BudgetEntry>;
      wearable_data: T<WearableData>;
      horse_scores: T<HorseScore>;
      ai_insights: T<AIInsight>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
