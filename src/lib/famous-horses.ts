export interface FamousHorse {
  name: string;
  sire?: string;
  breed: string;
  known_for: string;
  emoji: string;
}

// Étalons et chevaux célèbres dont les noms apparaissent souvent dans les pedigrees
export const FAMOUS_HORSES: FamousHorse[] = [
  // Pur-sang
  { name: "Sadler's Wells", breed: "Pur-sang", known_for: "Étalon reproducteur légendaire (Northern Dancer)", emoji: "🏆" },
  { name: "Galileo", breed: "Pur-sang", known_for: "Champion Irlande/Angleterre 2001, fils de Sadler's Wells", emoji: "🌟" },
  { name: "Frankel", breed: "Pur-sang", known_for: "Invaincu en 14 courses, noté 147 par Timeform", emoji: "⭐" },
  { name: "Sea the Stars", breed: "Pur-sang", known_for: "Triple lauréat Guinées, Derby, Arc de Triomphe 2009", emoji: "🏅" },
  { name: "Enable", breed: "Pur-sang", known_for: "Double gagnante Arc de Triomphe 2017/2018", emoji: "🥇" },
  { name: "Northern Dancer", breed: "Pur-sang", known_for: "L'étalon le plus influent du 20e siècle", emoji: "👑" },
  { name: "Selle Français (SF)", breed: "Selle Français", known_for: "Race française de sport équestre par excellence", emoji: "🇫🇷" },
  // SF classiques
  { name: "Contender", breed: "Selle Français", known_for: "Étalon SF très influent CSO", emoji: "🏇" },
  { name: "Kannan", breed: "Selle Français", known_for: "Champion CSO, étalon SF de référence", emoji: "🏆" },
  { name: "Almé Z", sire: "Almé", breed: "KWPN/SF", known_for: "Ligne Almé, nombreux champions CSO", emoji: "🌟" },
  { name: "Furioso", breed: "Selle Français", known_for: "Étalon fondateur, présent dans de nombreux pedigrees SF", emoji: "⭐" },
  { name: "Ibrahim", breed: "Selle Français", known_for: "Étalon SF classique dressage/CSO", emoji: "🎖️" },
  // KWPN
  { name: "KWPN", breed: "KWPN", known_for: "Warmblood Hollandais", emoji: "🇳🇱" },
  { name: "Hanovrien", breed: "Hanovrien", known_for: "Warmblood Allemand", emoji: "🇩🇪" },
  // Lipizzan
  { name: "Pluto", breed: "Lipizzan", known_for: "Ligne fondatrice Lipizzan, dressage classique", emoji: "🎠" },
  // Arabe
  { name: "Arabe", breed: "Pur-sang Arabe", known_for: "Race fondatrice, endurance", emoji: "🐎" },
  // Famous individual horses
  { name: "Baloubet du Rouet", breed: "Selle Français", known_for: "Triple champion monde CSO Rodrigo Pessoa", emoji: "🥇" },
  { name: "Quidam de Revel", breed: "Selle Français", known_for: "Médaille olympique CSO 1992", emoji: "🥈" },
  { name: "Jappeloup", breed: "Demi-sang", known_for: "Champion olympique CSO Séoul 1988", emoji: "🏅" },
  { name: "Totilas", breed: "KWPN", known_for: "Record du monde dressage, 92.3% en grand prix", emoji: "💎" },
  { name: "Valegro", breed: "KWPN", known_for: "Champion olympique dressage, record du monde", emoji: "👑" },
  { name: "Unforgettable", breed: "KWPN", known_for: "Dressage international", emoji: "🌟" },
  { name: "Chacco-Blue", breed: "Oldenbourg", known_for: "Étalon CSO très recherché", emoji: "🔵" },
  { name: "Stallone", breed: "Selle Français", known_for: "Étalon SF performant", emoji: "⭐" },
];

/**
 * Finds famous horse connections based on pedigree names
 */
export function findFamousConnections(names: (string | null | undefined)[]): FamousHorse[] {
  const found: FamousHorse[] = [];
  const seen = new Set<string>();

  for (const name of names) {
    if (!name) continue;
    const normalized = name.trim().toLowerCase();

    for (const famous of FAMOUS_HORSES) {
      if (seen.has(famous.name)) continue;
      const famousNorm = famous.name.toLowerCase();
      // Check if the name contains or is contained by the famous horse name
      if (normalized.includes(famousNorm) || famousNorm.includes(normalized)) {
        if (normalized.length >= 4 && famousNorm.length >= 4) { // Avoid false positives on short strings
          found.push(famous);
          seen.add(famous.name);
        }
      }
    }
  }

  return found;
}
