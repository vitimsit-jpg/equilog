-- Migration 037: Training types v2 (17 types replacing 11 old types)
-- Maps old type values to new ones for existing rows

-- CSO → obstacles_enchainement
UPDATE training_sessions SET type = 'obstacles_enchainement' WHERE type = 'cso';
UPDATE training_planned_sessions SET type = 'obstacles_enchainement' WHERE type = 'cso';

-- cross → cross_entrainement
UPDATE training_sessions SET type = 'cross_entrainement' WHERE type = 'cross';
UPDATE training_planned_sessions SET type = 'cross_entrainement' WHERE type = 'cross';

-- endurance → galop
UPDATE training_sessions SET type = 'galop' WHERE type = 'endurance';
UPDATE training_planned_sessions SET type = 'galop' WHERE type = 'endurance';

-- saut → meca_obstacles
UPDATE training_sessions SET type = 'meca_obstacles' WHERE type = 'saut';
UPDATE training_planned_sessions SET type = 'meca_obstacles' WHERE type = 'saut';

-- plat, longe, travail_a_pied, marcheur, autre, galop, dressage — unchanged (valid in new schema)

-- Update the type CHECK constraint if one exists (adjust table name as needed)
-- No enum change needed since TrainingType is a TypeScript type, not a DB enum
