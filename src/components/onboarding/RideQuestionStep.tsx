"use client";

/**
 * TRAV-19 — Étape "Montez-vous ce cheval ?"
 * Composant contrôlé réutilisable dans l'onboarding et partout où
 * on doit collecter le rôle cavalier/gardien de l'utilisateur.
 */

interface Props {
  value: boolean;
  onChange: (rides: boolean) => void;
}

export default function RideQuestionStep({ value, onChange }: Props) {
  return (
    <div>
      <label className="label">
        Vous montez ce cheval ?{" "}
        <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
      </label>
      <div className="grid grid-cols-2 gap-2 mt-1">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`p-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
            value
              ? "border-black bg-black text-white"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          🐴 Oui, je monte
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`p-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
            !value
              ? "border-black bg-black text-white"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          🌿 Non, je m&apos;en occupe
        </button>
      </div>
      {!value && (
        <p className="text-2xs text-gray-400 mt-1">
          Mode gardien — l&apos;interface sera adaptée en conséquence.
        </p>
      )}
    </div>
  );
}
