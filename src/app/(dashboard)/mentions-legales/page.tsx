export default function MentionsLegalesPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-black text-black">Mentions légales</h1>
        <p className="text-sm text-gray-400 mt-0.5">Dernière mise à jour : mars 2026</p>
      </div>

      {/* 1. Éditeur */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-black border-b border-gray-100 pb-2">1. Éditeur du site</h2>
        <div className="space-y-1 text-sm text-gray-600">
          <p><span className="font-semibold text-black">Nom de l&apos;application :</span> Equistra</p>
          <p><span className="font-semibold text-black">Directeur de la publication :</span> Vincent Timsit</p>
          <p><span className="font-semibold text-black">Contact :</span>{" "}
            <a href="mailto:contact@equistra.app" className="text-orange hover:underline">contact@equistra.app</a>
          </p>
          <p><span className="font-semibold text-black">URL de l&apos;application :</span>{" "}
            <a href="https://equilog-i3nr-vitimsit-jpgs-projects.vercel.app" className="text-orange hover:underline" target="_blank" rel="noopener noreferrer">
              equilog-i3nr-vitimsit-jpgs-projects.vercel.app
            </a>
          </p>
        </div>
      </section>

      {/* 2. Hébergement */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-black border-b border-gray-100 pb-2">2. Hébergement</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div>
            <p className="font-semibold text-black">Hébergement de l&apos;application</p>
            <p>Vercel Inc. — 340 Pine Street, Suite 701, San Francisco, CA 94104, États-Unis</p>
            <p><a href="https://vercel.com" className="text-orange hover:underline" target="_blank" rel="noopener noreferrer">vercel.com</a></p>
          </div>
          <div className="mt-3">
            <p className="font-semibold text-black">Base de données et authentification</p>
            <p>Supabase Inc. — 970 Toa Payoh North, Singapour (infrastructure hébergée sur AWS eu-west-2, région Europe)</p>
            <p><a href="https://supabase.com" className="text-orange hover:underline" target="_blank" rel="noopener noreferrer">supabase.com</a></p>
          </div>
          <div className="mt-3">
            <p className="font-semibold text-black">Code source</p>
            <p>Dépôt GitHub — GitHub Inc., 88 Colin P Kelly Jr Street, San Francisco, CA 94107, États-Unis</p>
          </div>
        </div>
      </section>

      {/* 3. Propriété intellectuelle */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-black border-b border-gray-100 pb-2">3. Propriété intellectuelle</h2>
        <p className="text-sm text-gray-600">
          L&apos;ensemble des contenus présents sur Equistra (textes, graphismes, logotypes, icônes, images, données) est la propriété exclusive de Vincent Timsit ou fait l&apos;objet d&apos;une autorisation d&apos;utilisation. Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sans autorisation écrite préalable.
        </p>
        <p className="text-sm text-gray-600">
          Les données saisies par les utilisateurs (informations sur les chevaux, séances d&apos;entraînement, soins, résultats de concours) restent la propriété exclusive de l&apos;utilisateur. Equistra ne revendique aucun droit de propriété sur les données personnelles saisies.
        </p>
      </section>

      {/* 4. Données personnelles */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-black border-b border-gray-100 pb-2">4. Données personnelles et RGPD</h2>
        <p className="text-sm text-gray-600">
          Equistra collecte et traite des données personnelles dans le cadre de la fourniture de ses services. Conformément au Règlement Général sur la Protection des Données (RGPD — UE 2016/679), vous disposez des droits suivants :
        </p>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside ml-2">
          <li>Droit d&apos;accès à vos données personnelles</li>
          <li>Droit de rectification des données inexactes</li>
          <li>Droit à l&apos;effacement (&laquo;&nbsp;droit à l&apos;oubli&nbsp;&raquo;)</li>
          <li>Droit à la portabilité de vos données</li>
          <li>Droit d&apos;opposition au traitement</li>
          <li>Droit à la limitation du traitement</li>
        </ul>
        <p className="text-sm text-gray-600">
          Pour exercer ces droits, contactez-nous à :{" "}
          <a href="mailto:contact@equistra.app" className="text-orange hover:underline">contact@equistra.app</a>
        </p>

        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-black">Données collectées</p>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            {[
              { cat: "Compte", data: "Adresse email, nom, type de profil utilisateur" },
              { cat: "Chevaux", data: "Nom, race, discipline, année de naissance, sexe, écurie, photo" },
              { cat: "Santé", data: "Dates et types de soins vétérinaires, coordonnées du praticien (optionnel)" },
              { cat: "Entraînement", data: "Dates, types, intensité et notes de séances d'entraînement" },
              { cat: "Concours", data: "Résultats et participations aux compétitions équestres" },
              { cat: "Budget", data: "Dépenses et revenus liés aux équidés (stockés localement)" },
              { cat: "Technique", data: "Logs d'événements anonymisés (navigation, actions produit), agent navigateur, session ID" },
            ].map((row) => (
              <div key={row.cat} className="flex gap-3 text-sm">
                <span className="font-semibold text-black w-28 flex-shrink-0">{row.cat}</span>
                <span className="text-gray-600">{row.data}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-black">Durée de conservation</p>
          <p className="text-sm text-gray-600">
            Les données sont conservées pendant toute la durée d&apos;activité du compte, puis supprimées dans un délai de 30 jours suivant la demande de suppression. Les logs techniques sont conservés 90 jours maximum.
          </p>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-black">Sous-traitants</p>
          <div className="text-sm text-gray-600 space-y-1">
            <p><span className="font-medium text-black">Supabase</span> — Stockage des données (infrastructure AWS, région Europe)</p>
            <p><span className="font-medium text-black">Resend</span> — Envoi d&apos;emails transactionnels</p>
            <p><span className="font-medium text-black">Anthropic (Claude API)</span> — Génération d&apos;analyses et recommandations par IA</p>
            <p><span className="font-medium text-black">Stripe</span> — Traitement des paiements (données bancaires non stockées par Equistra)</p>
            <p><span className="font-medium text-black">PostHog</span> — Analytics comportemental anonymisé (serveurs UE, IP non stockée)</p>
          </div>
        </div>
      </section>

      {/* 5. Cookies */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-black border-b border-gray-100 pb-2">5. Cookies et traceurs</h2>
        <p className="text-sm text-gray-600">
          Equistra utilise des cookies strictement nécessaires au fonctionnement de l&apos;application (authentification, session). Aucun cookie publicitaire ou de tracking tiers n&apos;est utilisé sans votre consentement.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          {[
            { name: "sb-auth-token", purpose: "Authentification Supabase — nécessaire au maintien de la session", essential: true },
            { name: "eq_sid", purpose: "Identifiant de session anonyme pour l'analytics produit interne (sessionStorage)", essential: true },
          ].map((cookie) => (
            <div key={cookie.name} className="flex gap-3 text-sm items-start">
              <code className="font-mono text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-700 flex-shrink-0 mt-0.5">{cookie.name}</code>
              <span className="text-gray-600">{cookie.purpose}</span>
              {cookie.essential && <span className="ml-auto text-2xs font-bold text-green-600 flex-shrink-0 mt-0.5">Essentiel</span>}
            </div>
          ))}
        </div>
      </section>

      {/* 6. Sécurité */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-black border-b border-gray-100 pb-2">6. Sécurité</h2>
        <p className="text-sm text-gray-600">
          Equistra met en œuvre les mesures techniques appropriées pour protéger vos données : chiffrement des communications (HTTPS/TLS), authentification sécurisée via Supabase Auth, contrôle d&apos;accès par Row-Level Security (RLS) en base de données, et tokens d&apos;accès à durée limitée.
        </p>
        <p className="text-sm text-gray-600">
          En cas de violation de données personnelles, les utilisateurs concernés seront notifiés dans les 72 heures conformément à l&apos;article 33 du RGPD.
        </p>
      </section>

      {/* 7. Responsabilité */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-black border-b border-gray-100 pb-2">7. Limitation de responsabilité</h2>
        <p className="text-sm text-gray-600">
          Les informations et recommandations fournies par Equistra, notamment les suggestions générées par intelligence artificielle (Coach IA, insights hebdomadaires), sont fournies à titre indicatif uniquement. Elles ne remplacent en aucun cas l&apos;avis d&apos;un vétérinaire, d&apos;un maréchal-ferrant, d&apos;un ostéopathe ou de tout autre professionnel de la santé animale.
        </p>
        <p className="text-sm text-gray-600">
          Equistra ne saurait être tenu responsable de décisions prises sur la base des informations ou recommandations affichées dans l&apos;application.
        </p>
      </section>

      {/* 8. Droit applicable */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-black border-b border-gray-100 pb-2">8. Droit applicable et juridiction</h2>
        <p className="text-sm text-gray-600">
          Les présentes mentions légales sont soumises au droit français. En cas de litige, les tribunaux français seront seuls compétents.
        </p>
        <p className="text-sm text-gray-600">
          Pour toute réclamation relative à la protection des données personnelles, vous pouvez également saisir la <strong>CNIL</strong> (Commission Nationale de l&apos;Informatique et des Libertés) : <a href="https://www.cnil.fr" className="text-orange hover:underline" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
        </p>
      </section>

      {/* 9. Contact */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-black border-b border-gray-100 pb-2">9. Contact</h2>
        <p className="text-sm text-gray-600">
          Pour toute question relative aux présentes mentions légales ou à la protection de vos données personnelles :
        </p>
        <p className="text-sm">
          <a href="mailto:contact@equistra.app" className="text-orange font-semibold hover:underline">contact@equistra.app</a>
        </p>
      </section>
    </div>
  );
}
