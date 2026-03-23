export type UserPlan = "starter" | "pro" | "ecurie";
export type HorseIndexMode = "IC" | "IE" | "IP" | "IR" | "IS" | "ICr";
export type UserType = "loisir" | "competition" | "pro" | "gerant_cavalier" | "coach" | "gerant_ecurie";
export type ProfileType = "loisir" | "competition" | "pro" | "gerant";
export type HealthType = "vaccin" | "vermifuge" | "dentiste" | "osteo" | "ferrage" | "veterinaire" | "masseuse" | "autre";
export type TrainingType = "dressage" | "plat" | "stretching" | "barres_sol" | "cavalettis" | "meca_obstacles" | "obstacles_enchainement" | "cross_entrainement" | "longe" | "longues_renes" | "travail_a_pied" | "balade" | "trotting" | "galop" | "marcheur" | "paddock" | "concours" | "autre";
export type TrainingRider = "owner" | "owner_with_coach" | "coach" | "longe" | "travail_a_pied";
export type WearableSource = "equisense" | "seaver" | "garmin" | "equilab" | "autre";
export type BudgetCategory = "pension" | "soins" | "concours" | "equipement" | "maréchalerie" | "alimentation" | "transport" | "autre";
export type Discipline = "CSO" | "Dressage" | "CCE" | "Endurance" | "Attelage" | "Voltige" | "TREC" | "Hunter" | "Equitation_Western" | "Autre";

export interface User {
  id: string;
  email: string;
  name: string;
  plan: UserPlan;
  user_type: UserType | null;
  profile_type: ProfileType | null;
  profile_display_name: string | null;
  module_coach: boolean;
  module_gerant: boolean;
  onboarding_step: number;
  onboarding_completed: boolean;
  notify_health_reminders: boolean;
  notify_weekly_summary: boolean;
  created_at: string;
  is_admin?: boolean;
  status?: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  rider_niveau: 'debutant' | 'amateur' | 'confirme' | 'pro' | null;
  rider_disciplines: string[] | null;
  rider_frequence: number | null;
  rider_objectif: 'competition' | 'progression' | 'loisir' | 'remise_en_forme' | null;
  rider_zones_douloureuses: string[] | null;
  rider_asymetrie: 'droite' | 'gauche' | 'symetrique' | 'ne_sais_pas' | null;
  rider_pathologies: string | null;
  rider_suivi_corps: Record<string, { actif: boolean; frequence?: string }> | null;
  rider_activite_types: string[] | null;
  rider_activite_frequence: string | null;
  rider_objectifs_cavalier: string[] | null;
  user_modules: Record<string, boolean> | null;
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
  taille: "moins_148" | "148_160" | "160_170" | "plus_170" | null;
  // Profil météo (migration 019)
  tonte: "non_tondu" | "partielle" | "complete" | null;
  morphologie_meteo: "sang_chaud" | "pur_sang" | "rustique" | null;
  etat_corporel: "normal" | "maigre" | null;
  trousseau: { label: string; grammage: number; impermeable: boolean }[] | null;
  // Horse Index mode (migration 020)
  horse_index_mode: HorseIndexMode | null;
  horse_index_status: "actif" | "incomplet" | "calibrage" | null;
  horse_index_mode_changed_at: string | null;
  // migration 031
  is_confie: boolean | null;
  owner_name: string | null;
  // migration 033
  owner_email: string | null;
  // Historique & Carnet de vie (migration tâche 03)
  lieu_naissance: string | null;
  conditions_acquisition: 'achat' | 'don' | 'pret' | 'elevage_personnel' | null;
  historique_avant_acquisition: string | null;
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
  media_urls: string[] | null;
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
  rider: TrainingRider | null;
  equipement_recuperation: string | null;
  wearable_source: WearableSource | null;
  media_urls: string[] | null;
  complement: string[] | null;
  linked_competition_id: string | null;
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
  status: "a_venir" | "passe" | null;
  score_dressage: number | null;
  penalites_cso: number | null;
  penalites_cross: number | null;
  created_at: string;
}

export type RecurrenceFrequency = "weekly" | "monthly" | "yearly";

export interface BudgetEntry {
  id: string;
  horse_id: string;
  date: string;
  category: BudgetCategory;
  amount: number;
  description: string | null;
  is_recurring: boolean | null;
  recurrence_frequency: RecurrenceFrequency | null;
  recurring_template_id: string | null;
  media_urls: string[] | null;
  created_at: string;
}

export type TodoFrequency = "quotidien" | "hebdo" | "mensuel" | "ponctuel";
export type TodoStatus = "a_faire" | "en_cours" | "fait";

export interface EcurieTodo {
  id: string;
  user_id: string;
  title: string;
  frequency: TodoFrequency;
  status: TodoStatus;
  assigned_to_name: string | null;
  last_done_at: string | null;
  created_at: string;
}

export type AlertUrgency = "normal" | "urgent" | "critique";

export interface HorseAlert {
  id: string;
  horse_id: string;
  reporter_id: string;
  description: string;
  urgency: AlertUrgency;
  resolved: boolean;
  created_at: string;
}

export interface CoachStudent {
  id: string;
  coach_id: string;
  student_name: string;
  student_email: string | null;
  horse_name: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}

export interface CoachPlannedSession {
  id: string;
  coach_id: string;
  student_id: string;
  date: string;
  time_slot: string | null;
  duration_min: number | null;
  notes: string | null;
  completed: boolean;
  created_at: string;
}

export interface TrainingPlannedSession {
  id: string;
  horse_id: string;
  date: string;
  type: TrainingType;
  duration_min_target: number | null;
  intensity_target: 1 | 2 | 3 | 4 | 5 | null;
  complement: string[] | null;
  qui_monte: TrainingRider | null;
  notes: string | null;
  status: "planned" | "skipped";
  linked_session_id: string | null;
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
  // v2 pillar-based fields (new format)
  version?: 2;
  mode?: HorseIndexMode;
  sante_score?: number | null;    // 0-100, null = no data
  bienetre?: number | null;       // 0-100, null = no data
  activite?: number | null;       // 0-100, null = no data
  suivi_proprio?: number | null;  // 0-100
  // v1 legacy fields (kept for reading old DB records)
  regularite?: number;
  progression?: number;
  sante?: number;
  recuperation?: number;
  wearables?: number;
  // common
  total: number;
  has_wearables: boolean;
}

export type HorseDailyLogEtat = "excellent" | "bien" | "normal" | "tendu" | "fatigue" | "douloureux";
export type HorseDailyLogAppetit = "mange_bien" | "mange_peu" | "na_pas_mange";

export type HistoryCategory = "boiterie" | "ulcere" | "colique" | "operation" | "vaccination" | "bilan_sanguin" | "soins_dentaires" | "osteo" | "radio" | "physio" | "traitement_long_terme" | "autre";
export type DatePrecision = "exact" | "mois" | "annee" | "inconnue";

export interface HorseDailyLog {
  id: string;
  horse_id: string;
  date: string;
  etat_general: HorseDailyLogEtat | null;
  appetit: HorseDailyLogAppetit | null;
  observations: string[] | null;
  notes: string | null;
  created_at: string;
}

export interface HorseHistoryEvent {
  id: string;
  horse_id: string;
  category: HistoryCategory;
  title: string | null;
  description: string | null;
  date_precision: DatePrecision;
  event_date: string | null;
  event_month: number | null;
  event_year: number | null;
  vet_name: string | null;
  clinic: string | null;
  outcome: "gueri" | "chronique" | "suivi" | "inconnu" | null;
  severity: "leger" | "modere" | "severe" | null;
  document_url: string | null;
  media_urls: string[] | null;
  extracted_by_ai: boolean;
  ai_confidence: Record<string, number> | null;
  notes: string | null;
  created_at: string;
}

export interface HorsePedigree {
  id: string;
  horse_id: string;
  pere_name: string | null;
  pere_sire: string | null;
  pere_breed: string | null;
  mere_name: string | null;
  mere_sire: string | null;
  mere_breed: string | null;
  gp_pat_pere_name: string | null;
  gp_pat_pere_sire: string | null;
  gp_pat_mere_name: string | null;
  gp_pat_mere_sire: string | null;
  gp_mat_pere_name: string | null;
  gp_mat_pere_sire: string | null;
  gp_mat_mere_name: string | null;
  gp_mat_mere_sire: string | null;
  agp_pp_pere_name: string | null;
  agp_pp_mere_name: string | null;
  agp_pm_pere_name: string | null;
  agp_pm_mere_name: string | null;
  agp_mp_pere_name: string | null;
  agp_mp_mere_name: string | null;
  agp_mm_pere_name: string | null;
  agp_mm_mere_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ListingCategory = "cheval" | "materiel" | "service";
export type ListingCondition = "neuf" | "bon_etat" | "usage";
export type ListingStatus = "active" | "sold" | "expired";

export interface Listing {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_negotiable: boolean;
  category: ListingCategory;
  subcategory: string | null;
  condition: ListingCondition | null;
  image_url: string | null;
  images: string[];
  location: string | null;
  contact_phone: string | null;
  status: ListingStatus;
  breed: string | null;
  birth_year: number | null;
  sexe: "hongre" | "jument" | "etalon" | null;
  created_at: string;
  users?: { name: string };
}

export interface AIInsight {
  id: string;
  horse_id: string;
  content: string;
  generated_at: string;
  type: "weekly" | "alert" | "milestone" | "training_plan";
  created_at: string;
}

export interface RehabPhase {
  index: number;
  name: string;
  duration_weeks: number;
  sessions_per_week: number;
  max_duration_min: number;
  max_intensity: 1 | 2 | 3;
  allowed_types: TrainingType[];
  description: string;
  progression_criteria: string;
}

export interface RehabProtocol {
  id: string;
  horse_id: string;
  user_id: string;
  injury_description: string;
  phases: RehabPhase[];
  current_phase_index: number;
  status: "active" | "completed" | "paused" | "abandoned";
  vet_validated: boolean;
  notes: string | null;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export interface RiderLog {
  id: string;
  user_id: string;
  date: string;
  forme: 'fatigue' | 'normal' | 'en_forme' | null;
  fatigue?: string | null;
  mental?: string | null;
  douleurs: string[] | null;
  douleur_intensite: 'legere' | 'importante' | null;
  notes: string | null;
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
      listings: T<Listing>;
      horse_daily_logs: T<HorseDailyLog>;
      horse_history_events: T<HorseHistoryEvent>;
      horse_pedigree: T<HorsePedigree>;
      ecurie_todos: T<EcurieTodo>;
      horse_alerts: T<HorseAlert>;
      coach_students: T<CoachStudent>;
      coach_planned_sessions: T<CoachPlannedSession>;
      training_planned_sessions: T<TrainingPlannedSession>;
      rehab_protocols: T<RehabProtocol>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
