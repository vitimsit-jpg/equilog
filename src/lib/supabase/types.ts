export type UserPlan = "starter" | "pro" | "ecurie";
export type HorseIndexMode = "IC" | "IE" | "IP" | "IR" | "IS" | "ICr";
export type UserType = "loisir" | "competition" | "pro" | "gerant_cavalier" | "coach" | "gerant_ecurie";
export type ProfileType = "loisir" | "competition" | "pro" | "gerant";
export type HealthType =
  // Soins standards
  | "vaccin" | "vermifuge" | "dentiste" | "osteo" | "ferrage" | "veterinaire" | "masseuse" | "autre"
  // Soins thérapeutiques IS (retraite / bien-être)
  | "acupuncture" | "physio_laser" | "physio_ultrasons" | "physio_tens" | "pemf"
  | "infrarouge" | "cryotherapie" | "thermotherapie" | "pressotherapie" | "ems"
  | "bandes_repos" | "etirements_passifs" | "infiltrations" | "mesotherapie"
  // Soins thérapeutiques IR (convalescence) supplémentaires
  | "balneotherapie" | "water_treadmill" | "tapis_marcheur" | "ondes_choc";
export type TrainingType = "dressage" | "plat" | "stretching" | "barres_sol" | "cavalettis" | "meca_obstacles" | "obstacles_enchainement" | "cross_entrainement" | "longe" | "longues_renes" | "travail_a_pied" | "balade" | "trotting" | "galop" | "marcheur" | "paddock" | "concours" | "autre";
export type TrainingRider = "owner" | "owner_with_coach" | "coach" | "longe" | "travail_a_pied";
export type WearableSource = "equisense" | "seaver" | "garmin" | "equilab" | "autre";
export type BudgetCategory = "pension" | "soins" | "concours" | "equipement" | "maréchalerie" | "alimentation" | "transport" | "autre";
export type Discipline = "CSO" | "Dressage" | "CCE" | "Endurance" | "Attelage" | "Voltige" | "TREC" | "Hunter" | "Equitation_Western" | "Autre";

export type User = {
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
  // RGPD (migration 044)
  opt_out_analytics: boolean;
  // RGPD V2 (migration 045)
  accepted_terms_at: string | null;
  accepted_terms_version: string | null;
  anonymous_stats_enabled: boolean;
  feed_visibility: 'all' | 'activity' | 'private';
  gps_enabled: boolean;
  deleted_at: string | null;
}

export type Horse = {
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
  conditions_vie: "boxe_paddock_individuel" | "boxe_pre_collectif" | "paddock_individuel" | "pre_collectif" | null;
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
  // Module Nutrition (migration 040)
  module_nutrition: boolean;
  // Visibilité RGPD (migration 045)
  visibility: 'national' | 'stable' | 'private' | null;
  // TRAV-18 (migration 046)
  horse_mode_since: string | null;
  horse_mode_reason: string | null;
  date_retraite: string | null;
  carriere_archive: Record<string, unknown> | null;
  mere_horse_id: string | null;
  poulain_horse_id: string | null;
  created_at: string;
}

// ── Nutrition types ────────────────────────────────────────────────────────────
export type NutritionFibre = {
  id: string;
  type: "foin" | "luzerne" | "melange";
  mode: "fixe" | "volonte";
  quantite_kg?: number | null;
  distributions_par_jour?: "1" | "2" | "3" | null;
}

export type NutritionHerbe = {
  actif: boolean;
  heures: "2" | "4" | "6" | "journee" | null;
}

export type NutritionRepas = {
  horaire: "matin" | "midi" | "soir" | "apresmidi";
  quantite_l: number;
}

export type NutritionGranule = {
  id: string;
  nom: string;
  type: "standard" | "floconnes" | "extrudes" | "mash" | "autre";
  repas: NutritionRepas[];
}

export type NutritionComplement = {
  id: string;
  nom: string;
  forme: "poudre" | "liquide" | "granules" | "seringue" | "autre";
  quantite: number | null;
  unite: "ml" | "g" | "dose" | "mesure";
  frequence: "quotidien" | "matin_soir" | "hebdomadaire" | "cure";
  moment_prise?: "avant_repas" | "pendant_repas" | "apres_repas" | "independant" | null;
  cure_semaines: number | null;
  cure_debut: string | null;
}

export type NutritionRation = {
  fibres: NutritionFibre[];
  herbe: NutritionHerbe;
  granules: NutritionGranule[];
  complements: NutritionComplement[];
}

export type HorseNutrition = {
  id: string;
  horse_id: string;
  user_id: string;
  fibres: NutritionFibre[];
  herbe: NutritionHerbe;
  granules: NutritionGranule[];
  complements: NutritionComplement[];
  created_at: string;
  updated_at: string;
}

export type NutritionHistoryEntry = {
  id: string;
  horse_id: string;
  element: string;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  snapshot: NutritionRation | null;
  created_at: string;
}

export type HealthRecord = {
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
  // Champs maréchal (migration 042)
  type_intervention: string | null;
  sous_type_urgence: string | null;
  repartition_fers: string | null;
  matiere_fer: string | null;
  options_avancees: Record<string, boolean | string> | null;
  recurrence_semaines: number | null;
  created_at: string;
}

export type InterventionType = "parage" | "ferrure" | "ferrure_ortho" | "urgence" | "deferrage" | "autre";

export type MarechalProfile = {
  id: string;
  horse_id: string;
  user_id: string;
  type_intervention: InterventionType | null;
  repartition_fers: "anterieurs" | "posterieurs" | "4_fers" | null;
  matiere_fer: "acier" | "aluminium" | "duplo" | "colle" | "autre" | null;
  options_avancees: Record<string, boolean | string> | null;
  nom_marechal: string | null;
  tel_marechal: string | null;
  cout_habituel: number | null;
  recurrence_semaines: number | null;
  notes_profil: string | null;
  created_at: string;
  updated_at: string;
}

export type TrainingSession = {
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
  // TRAV-17 new fields (migration 043)
  mode_entree: "planifie" | "logge" | null;
  est_complement: boolean | null;
  duree_planifiee: number | null;
  duree_reelle: number | null;
  note_vocale_brute: string | null;
  // TRAV-20 ICr foal session fields (migration 051)
  session_type: "manipulation" | "toilettage" | "longe_douce" | "debourrage" | "premiere_monte" | "autre" | null;
  foal_reaction: "calme" | "attentif" | "nerveux" | "agite" | "difficile" | null;
  // 061 — Balade GPS
  has_gps_track: boolean;
  // 063 — TRAV-26 Amendé soft-delete
  deleted_at: string | null;
  created_at: string;
}

export type BaladeTrack = {
  id: string;
  training_session_id: string;
  horse_id: string;
  user_id: string;
  coordinates: { lat: number; lng: number; alt?: number; ts: number }[];
  distance_km: number | null;
  elevation_gain_m: number | null;
  avg_speed_kmh: number | null;
  max_speed_kmh: number | null;
  started_at: string;
  finished_at: string;
  created_at: string;
}

export type NotificationType =
  | "health_reminder"
  | "training_reminder"
  | "rehab_complete"
  | "weekly_summary"
  | "score_alert"
  | "coach_modification"
  | "horse_share"
  | "other";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  url: string | null;
  read: boolean;
  created_at: string;
}

export type StatutParticipation = "classe" | "abandonne" | "elimine" | "hors_concours";
export type MotifElimination = "refus_repetes" | "chute" | "hors_temps" | "autre";

export type Competition = {
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
  // TRAV-28-03 — Statut de participation (null pour données pré-migration)
  statut_participation: StatutParticipation | null;
  motif_elimination: MotifElimination | null;
  // TRAV-28-04 — CSO détail
  cso_barres: number | null;
  cso_refus: number | null;
  // TRAV-28-05 — CCE CSO détail
  cce_cso_barres: number | null;
  cce_cso_refus: number | null;
  // TRAV-28-06 — Dressage détail
  dressage_reprise: string | null;
  dressage_note_pct: number | null;
  // Legacy
  score_dressage: number | null;
  penalites_cso: number | null;
  penalites_cross: number | null;
  created_at: string;
}

export type RecurrenceFrequency = "weekly" | "monthly" | "yearly";

export type BudgetEntry = {
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

export type EcurieTodo = {
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

export type HorseAlert = {
  id: string;
  horse_id: string;
  reporter_id: string;
  description: string;
  urgency: AlertUrgency;
  resolved: boolean;
  created_at: string;
}

export type CoachStudent = {
  id: string;
  coach_id: string;
  student_name: string;
  student_email: string | null;
  horse_name: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}

export type CoachPlannedSession = {
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

// TRAV-26 Amendé — statut_planification enum
export type StatutPlanification = "planifiee" | "realisee" | "remplacee" | "annulee";

export type TrainingPlannedSession = {
  id: string;
  horse_id: string;
  date: string;
  type: TrainingType;
  duration_min_target: number | null;
  intensity_target: 1 | 2 | 3 | 4 | 5 | null;
  complement: string[] | null;
  qui_sen_occupe: TrainingRider | null;
  notes: string | null;
  status: "planned" | "skipped";
  linked_session_id: string | null;
  // TRAV-26 Amendé — nouvelles colonnes
  statut_planification: StatutPlanification;
  replaced_by_session_id: string | null;
  deleted_at: string | null;
  annulee_auto_at: string | null;
  notif_j_minus_1_sent_at: string | null;
  created_at: string;
}

export type TrainingWeekTemplate = {
  id: string;
  user_id: string;
  name: string;
  horse_id: string | null;
  sessions: {
    day_offset: number;
    type: string;
    duration_min: number;
    intensity: number;
    qui_sen_occupe: string | null;
    notes: string | null;
  }[];
  created_at: string;
}

export type WearableData = {
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

export type ShareRole = "gerant" | "coach";
export type ShareStatus = "pending" | "active" | "revoked";

export type HorseShare = {
  id: string;
  horse_id: string;
  shared_with_email: string;
  shared_with_user_id: string | null;
  role: ShareRole;
  can_see_training: boolean;
  can_see_health: boolean;
  can_see_competitions: boolean;
  can_see_planning: boolean;
  status: ShareStatus;
  invited_by: string;
  created_at: string;
  updated_at: string;
}

export type HorseScore = {
  id: string;
  horse_id: string;
  score: number;
  score_breakdown: ScoreBreakdown;
  computed_at: string;
  percentile_region: number | null;
  percentile_category: number | null;
  region: string | null;
}

export type ScoreBreakdown = {
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

export type HorseDailyLog = {
  id: string;
  horse_id: string;
  date: string;
  etat_general: HorseDailyLogEtat | null;
  appetit: HorseDailyLogAppetit | null;
  observations: string[] | null;
  notes: string | null;
  paddock_checked: boolean | null;
  created_at: string;
}

export type HorseHistoryEvent = {
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

export type HorsePedigree = {
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

export type Listing = {
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

export type AIInsight = {
  id: string;
  horse_id: string;
  content: string;
  generated_at: string;
  type: "weekly" | "alert" | "milestone" | "training_plan";
  created_at: string;
}

export type RehabPhase = {
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

export type RehabProtocol = {
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

// ── TRAV-18 : champs ajoutés sur horses ──────────────────────────────────────
// (horse_mode_since, horse_mode_reason, date_retraite, carriere_archive,
//  mere_horse_id, poulain_horse_id sont dans Horse via migration 046)

// ── TRAV-19 : Gardien non-cavalier ───────────────────────────────────────────
export type HorseUserRole = "owner" | "guardian" | "caretaker";

export type HorseUserRoleEntry = {
  id: string;
  horse_id: string;
  user_id: string;
  role: HorseUserRole;
  rides_horse: boolean;
  created_at: string;
}

// ── TRAV-20 : Croissance / Éducation poulain ─────────────────────────────────
export type GrowthMilestoneType =
  | "sevrage"
  | "debut_debourrage"
  | "premiere_monte"
  | "premier_concours"
  | "vaccination_complete"
  | "vermifugation"
  | "identification"
  | "autre";

export type HorseGrowthMilestone = {
  id: string;
  horse_id: string;
  user_id: string;
  milestone_type: GrowthMilestoneType;
  label: string | null;
  date: string;
  notes: string | null;
  created_at: string;
}

export type HorseGrowthMeasure = {
  id: string;
  horse_id: string;
  user_id: string;
  date: string;
  taille_cm: number | null;
  poids_kg: number | null;
  tour_poitrine_cm: number | null;
  notes: string | null;
  created_at: string;
}

// ── TRAV-21 : Retraite / Médicaments / Mouvement ─────────────────────────────
export type MedicationForme = "oral" | "injectable" | "topique" | "autre";
export type MedicationFrequence = "quotidien" | "matin_soir" | "hebdomadaire" | "si_besoin" | "cure";

export type HorseMedication = {
  id: string;
  horse_id: string;
  user_id: string;
  nom: string;
  forme: MedicationForme | null;
  dose: string | null;
  frequence: MedicationFrequence | null;
  date_debut: string | null;
  date_fin: string | null;
  vet_prescripteur: string | null;
  notes: string | null;
  actif: boolean;
  created_at: string;
}

export type HorseBcsLog = {
  id: string;
  horse_id: string;
  user_id: string;
  date: string;
  score: number;
  notes: string | null;
  created_at: string;
}

export type MovementLogType =
  | "paddock_libre"
  | "pre_libre"
  | "balade_main"
  | "longe_douce"
  | "monte_douce"
  | "autre";

export type HorseMovementLog = {
  id: string;
  horse_id: string;
  user_id: string;
  date: string;
  type: MovementLogType;
  duration_min: number | null;
  observation: string | null;
  created_at: string;
}

// ── TRAV-22 : Praticiens / Examens médicaux ──────────────────────────────────
export type PractitionerType = "vet" | "osteo" | "physio" | "kine" | "marechal" | "dentiste" | "autre";

export type HorsePractitioner = {
  id: string;
  horse_id: string;
  user_id: string;
  type: PractitionerType;
  nom: string;
  telephone: string | null;
  email: string | null;
  notes: string | null;
  principal: boolean;
  created_at: string;
}

export type MedicalExamType = "radio" | "echo" | "endoscopie" | "bilan_sanguin" | "scintigraphie" | "irm" | "autre";

export type HorseMedicalExam = {
  id: string;
  horse_id: string;
  user_id: string;
  date: string;
  type: MedicalExamType;
  description: string | null;
  vet_name: string | null;
  results: string | null;
  media_urls: string[];
  created_at: string;
}

// ── TRAV-23 : Historique des transitions de mode ─────────────────────────────
export type HorseModeHistory = {
  id: string;
  horse_id: string;
  user_id: string;
  mode_from: HorseIndexMode | null;
  mode_to: HorseIndexMode;
  reason: string | null;
  changed_at: string;
}

// TRAV P1 — Journal d'évolution IR
export type HorseRecoveryEntry = {
  id: string;
  horse_id: string;
  user_id: string;
  date: string;
  observation: string | null;
  pain_level: number | null;       // 1 = aucune, 5 = intense
  mobility_level: number | null;   // 1 = très limitée, 5 = normale
  vet_validated: boolean;
  notes: string | null;
  created_at: string;
}

export type ExerciseCategory = "plat" | "obstacle" | "cross" | "longe" | "travail_a_pied";
export type ExerciseDifficulty = "debutant" | "intermediaire" | "avance";

export type Exercise = {
  id: string;
  title: string;
  description: string | null;
  objectifs: string[] | null;
  category: ExerciseCategory;
  tags: string[] | null;
  schema_url: string | null;
  video_url: string | null;
  training_type: TrainingType;
  difficulty: ExerciseDifficulty;
  duration_min: number | null;
  created_at: string;
}

export type UserExerciseFavorite = {
  user_id: string;
  exercise_id: string;
  created_at: string;
}

export type RiderLog = {
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

export type HorseStreak = {
  id: string;
  horse_id: string;
  current_streak: number;
  best_streak: number;
  last_session_date: string | null;
  updated_at: string;
}

export type Challenge = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  objective_value: number;
  discipline_type: string | null;
  start_date: string;
  end_date: string;
  scope: string;
  is_national: boolean;
  created_at: string;
}

export type ChallengeParticipant = {
  id: string;
  challenge_id: string;
  user_id: string;
  horse_id: string | null;
  status: string;
  joined_at: string;
}

export type VideoAnalysis = {
  id: string;
  horse_id: string;
  user_id: string;
  allure: string | null;
  score: number | null;
  posture_cheval: string | null;
  position_cavalier: string | null;
  points_forts: string[] | null;
  axes_amelioration: string[] | null;
  conseil_principal: string | null;
  video_url: string | null;
  title: string | null;
  notes: string | null;
  share_token: string | null;
  created_at: string;
}

export type FeatureInterest = {
  id: string;
  user_id: string;
  feature_key: string;
  created_at: string;
}

type T<R> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: never[];
};

export type Database = {
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
      training_week_templates: T<TrainingWeekTemplate>;
      balade_tracks: T<BaladeTrack>;
      rehab_protocols: T<RehabProtocol>;
      horse_user_roles: T<HorseUserRoleEntry>;
      horse_growth_milestones: T<HorseGrowthMilestone>;
      horse_growth_measures: T<HorseGrowthMeasure>;
      horse_medications: T<HorseMedication>;
      horse_bcs_logs: T<HorseBcsLog>;
      horse_movement_logs: T<HorseMovementLog>;
      horse_practitioners: T<HorsePractitioner>;
      horse_medical_exams: T<HorseMedicalExam>;
      horse_mode_history: T<HorseModeHistory>;
      horse_recovery_journal: T<HorseRecoveryEntry>;
      exercises: T<Exercise>;
      user_exercise_favorites: T<UserExerciseFavorite>;
      horse_shares: T<HorseShare>;
      horse_nutrition: T<HorseNutrition>;
      nutrition_history: T<NutritionHistoryEntry>;
      horse_marechal_profile: T<MarechalProfile>;
      video_analyses: T<VideoAnalysis>;
      feature_interest: T<FeatureInterest>;
      // Tables sans interface TypeScript définie — Record<string, unknown> force
      // un cast explicite plutôt que de retourner never (qui casse tout)
      feed_reactions: T<Record<string, unknown>>;
      feed_comments: T<Record<string, unknown>>;
      challenges: T<Challenge>;
      challenge_participants: T<ChallengeParticipant>;
      horse_streaks: T<HorseStreak>;
      user_follows: T<Record<string, unknown>>;
      push_subscriptions: T<Record<string, unknown>>;
      event_logs: T<Record<string, unknown>>;
      rider_logs: T<RiderLog>;
      nutrition_plans: T<Record<string, unknown>>;
      horse_videos: T<Record<string, unknown>>;
      feature_interests: T<Record<string, unknown>>;
      notifications: T<Notification>;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
  };
}
