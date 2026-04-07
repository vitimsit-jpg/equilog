export default function ConfidentialitePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-black text-black">Politique de confidentialité</h1>
        <p className="text-sm text-gray-400 mt-0.5">Dernière mise à jour : Mars 2026</p>
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 leading-relaxed">
          Ce document décrit précisément quelles données Equistra collecte, pourquoi, et quels sont vos droits.
          Il doit être relu par un avocat spécialisé RGPD avant le lancement officiel.
        </div>
      </div>

      {/* 1. Qui sommes-nous */}
      <Section title="1. Qui sommes-nous ?">
        <p>
          Equistra est une application de suivi équestre permettant aux cavaliers, propriétaires de chevaux,
          coachs et gérants d&apos;écurie de centraliser toutes les informations liées à leurs chevaux.
        </p>
        <p className="mt-2">Le responsable du traitement de vos données personnelles est :</p>
        <table className="mt-3 w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
          <tbody>
            {[
              { label: "Société", value: "Equistra SAS" },
              { label: "Adresse", value: "[ADRESSE À COMPLÉTER]" },
              { label: "Contact", value: "privacy@equistra.com" },
            ].map((r) => (
              <tr key={r.label} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2.5 font-semibold text-black bg-gray-50 w-28">{r.label}</td>
                <td className="px-4 py-2.5 text-gray-600">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* 2. Quelles données */}
      <Section title="2. Quelles données collectons-nous ?">
        <p>Nous collectons uniquement les données nécessaires au bon fonctionnement de l&apos;application.</p>

        <SubSection title="2.1 Données de votre compte">
          <p>
            Lors de votre inscription, nous collectons votre prénom, nom et adresse e-mail. Votre mot de passe
            est chiffré et jamais lisible par nos équipes.
          </p>
          <p className="mt-1">
            Nous enregistrons également votre type de profil (Cavalier loisir, Compétiteur amateur, Professionnel ou
            Gérant d&apos;écurie) et les modules que vous activez.
          </p>
        </SubSection>

        <SubSection title="2.2 Données de votre cheval">
          <p>
            Pour chaque cheval que vous créez, nous collectons les informations que vous saisissez : nom, race,
            âge, sexe, discipline, niveau, région, numéro SIRE, numéro FEI et photo. Ces données sont
            nécessaires pour personnaliser votre expérience et les recommandations de l&apos;application.
          </p>
        </SubSection>

        <SubSection title="2.3 Données de suivi (modules activés par vous)">
          <p>
            Les modules suivants sont optionnels. Vous choisissez de les activer ou non. Nous collectons les
            données correspondantes uniquement si vous activez le module :
          </p>
          <ul className="mt-2 space-y-1 list-disc list-inside ml-2">
            <li>Journal de travail — type de séance, durée, intensité, ressenti, notes, médias</li>
            <li>Santé &amp; soins — type de soin, date, coût, documents médicaux</li>
            <li>Nutrition — ration alimentaire, compléments</li>
            <li>Budget — dépenses liées à votre cheval, factures</li>
            <li>Concours — résultats, classements, disciplines</li>
          </ul>
        </SubSection>

        <SubSection title="2.4 Données de localisation">
          <p>
            Nous collectons l&apos;adresse de votre écurie (que vous saisissez manuellement) pour vous fournir
            la météo automatique et vous permettre d&apos;apparaître dans les classements par région.
          </p>
          <p className="mt-1">
            Dans une version future, nous proposerons le suivi GPS de vos balades et séances extérieures.
            Cette fonctionnalité nécessitera votre accord explicite et ne sera activée que si vous le souhaitez.
          </p>
        </SubSection>

        <SubSection title="2.5 Photos et vidéos">
          <p>
            Vous pouvez téléverser des photos et vidéos de votre cheval, de vos séances ou de vos documents
            (ordonnances, factures). Ces fichiers sont stockés de manière sécurisée et ne sont partagés
            qu&apos;avec les personnes que vous autorisez.
          </p>
        </SubSection>

        <SubSection title="2.6 Données techniques">
          <p>
            Comme toute application, nous collectons automatiquement certaines données techniques : adresse IP,
            type d&apos;appareil, version de l&apos;application, journaux de connexion et données de crash. Ces données
            nous servent uniquement à assurer la sécurité et améliorer l&apos;application.
          </p>
        </SubSection>
      </Section>

      {/* 3. Pourquoi */}
      <Section title="3. Pourquoi utilisons-nous vos données ?">
        <p>Nous utilisons vos données pour les finalités suivantes :</p>
        <ul className="mt-2 space-y-1.5 list-disc list-inside ml-2">
          <li><strong className="text-black">Fournir le service</strong> — gérer votre compte, afficher vos chevaux, leurs données et votre historique</li>
          <li><strong className="text-black">Personnaliser votre expérience</strong> — adapter les fonctionnalités à votre profil et au mode de vie de votre cheval</li>
          <li><strong className="text-black">Générer des recommandations IA</strong> — croiser vos données de travail, santé et nutrition pour vous fournir des suggestions pertinentes</li>
          <li><strong className="text-black">Alimenter la communauté</strong> — afficher vos séances et résultats dans le Feed et les classements selon vos paramètres de confidentialité</li>
          <li><strong className="text-black">Améliorer l&apos;application</strong> — analyser des statistiques agrégées et anonymisées pour améliorer nos services</li>
          <li><strong className="text-black">Respecter nos obligations légales</strong> — notamment la conservation des données financières pendant 10 ans</li>
        </ul>
      </Section>

      {/* 4. Avec qui */}
      <Section title="4. Avec qui partageons-nous vos données ?">
        <SubSection title="4.1 Les autres utilisateurs de l'application">
          <p>Certaines de vos données sont visibles par d&apos;autres utilisateurs selon vos paramètres de confidentialité :</p>
          <ul className="mt-2 space-y-1 list-disc list-inside ml-2">
            <li>Les membres de votre écurie peuvent voir les informations que vous choisissez de partager</li>
            <li>Votre coach peut accéder aux données des chevaux que vous lui confiez</li>
            <li>Le gérant de votre écurie peut voir certaines informations selon les droits que vous lui accordez</li>
          </ul>
          <p className="mt-2">Vous contrôlez à tout moment ce qui est visible dans les paramètres de confidentialité de chaque cheval.</p>
        </SubSection>

        <SubSection title="4.2 Nos prestataires techniques">
          <p>Pour faire fonctionner Equistra, nous faisons appel à des prestataires qui traitent vos données en notre nom :</p>
          <ul className="mt-2 space-y-1 list-disc list-inside ml-2">
            <li><strong className="text-black">Supabase</strong> — hébergement de la base de données</li>
            <li><strong className="text-black">Vercel</strong> — hébergement de l&apos;application</li>
            <li><strong className="text-black">Anthropic</strong> — traitement de la saisie vocale et des recommandations IA</li>
          </ul>
          <p className="mt-2">Ces prestataires sont contractuellement tenus de protéger vos données.</p>
        </SubSection>

        <SubSection title="4.3 Les données agrégées et anonymisées">
          <p>
            Nous pouvons partager des statistiques agrégées et strictement anonymisées avec des partenaires
            (marques équestres, assureurs, instituts de recherche). Ces données ne permettent en aucun cas
            d&apos;identifier un utilisateur ou un cheval en particulier.
          </p>
          <p className="mt-2 text-gray-400 italic text-xs">
            Exemple : &laquo; En Île-de-France, les chevaux de CCE pratiquent en moyenne 4,2 séances par semaine
            en période de préparation. &raquo;
          </p>
          <p className="mt-2">
            Si vous ne souhaitez pas contribuer à ces statistiques, vous pouvez le désactiver dans
            Réglages → Confidentialité → Statistiques anonymisées.
          </p>
        </SubSection>

        <SubSection title="4.4 Ce que nous ne faisons jamais">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            {[
              "Nous ne vendons jamais vos données personnelles identifiables à des tiers.",
              "Nous ne partageons jamais vos données financières (budget, dépenses) en dehors de l'application.",
              "Nous ne transmettons jamais vos données médicales vétérinaires à des tiers sans votre accord explicite.",
              "Nous n'affichons aucune publicité ciblée basée sur vos données personnelles.",
            ].map((e) => (
              <div key={e} className="flex items-start gap-2.5">
                <span className="text-green-500 font-bold flex-shrink-0 mt-0.5">✓</span>
                <p>{e}</p>
              </div>
            ))}
          </div>
        </SubSection>
      </Section>

      {/* 5. Durée */}
      <Section title="5. Combien de temps conservons-nous vos données ?">
        <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2.5 text-left font-semibold text-black">Catégorie de données</th>
              <th className="px-4 py-2.5 text-left font-semibold text-black">Durée de conservation</th>
            </tr>
          </thead>
          <tbody>
            {[
              { cat: "Données de compte, cheval, séances, soins, nutrition, concours, médias", duration: "Jusqu'à suppression de votre compte + 12 mois" },
              { cat: "Données financières (budget, dépenses, factures)", duration: "10 ans (obligation légale française)" },
              { cat: "Données techniques (logs, IP)", duration: "12 mois glissants" },
              { cat: "Données agrégées anonymisées", duration: "Indéfiniment — ces données ne sont plus personnelles" },
            ].map((r) => (
              <tr key={r.cat} className="border-t border-gray-100">
                <td className="px-4 py-2.5 text-gray-700">{r.cat}</td>
                <td className="px-4 py-2.5 text-gray-600">{r.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* 6. Vos droits */}
      <Section title="6. Vos droits">
        <p>Conformément au RGPD, vous disposez des droits suivants :</p>
        <div className="mt-3 space-y-4">
          {[
            {
              title: "Droit d'accès",
              desc: "Téléchargez l'intégralité de vos données depuis Réglages → Mes données → Télécharger mes données. Le fichier est fourni en format JSON structuré par cheval.",
            },
            {
              title: "Droit de rectification",
              desc: "Vous pouvez modifier vos informations à tout moment directement dans l'application.",
            },
            {
              title: "Droit à l'effacement",
              desc: "Supprimez votre compte depuis Réglages → Mon compte → Supprimer mon compte. Toutes vos données personnelles identifiables seront supprimées dans un délai de 30 jours. Exception : vos données financières sont conservées 10 ans conformément à nos obligations légales.",
            },
            {
              title: "Droit à la portabilité",
              desc: "Le bouton « Télécharger mes données » vous fournit un export complet et structuré de toutes vos données dans un format réutilisable.",
            },
            {
              title: "Droit d'opposition",
              desc: "Vous pouvez vous opposer à la contribution de vos données aux statistiques anonymisées depuis Réglages → Confidentialité → Statistiques anonymisées.",
            },
            {
              title: "Retrait du consentement",
              desc: "Pour les modules optionnels (Santé, Nutrition, GPS à venir), vous pouvez retirer votre consentement à tout moment en désactivant le module dans les réglages de votre cheval. La désactivation n'efface pas vos données existantes.",
            },
          ].map((right) => (
            <div key={right.title} className="border-l-2 border-orange pl-4">
              <p className="text-sm font-bold text-black">{right.title}</p>
              <p className="text-sm text-gray-600 mt-0.5">{right.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
          Pour toute demande, contactez-nous à{" "}
          <a href="mailto:privacy@equistra.com" className="text-orange font-semibold hover:underline">
            privacy@equistra.com
          </a>
          . Nous répondons dans un délai de 30 jours. Vous pouvez également saisir la{" "}
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-orange hover:underline">
            CNIL
          </a>
          .
        </div>
      </Section>

      {/* 7. Sécurité */}
      <Section title="7. Comment protégeons-nous vos données ?">
        <ul className="space-y-1.5 list-disc list-inside ml-2">
          <li>Chiffrement de toutes les communications entre l&apos;application et nos serveurs (HTTPS/TLS)</li>
          <li>Chiffrement des données stockées sur nos serveurs (AES-256)</li>
          <li>Mots de passe jamais stockés en clair — uniquement sous forme chiffrée</li>
          <li>Accès aux données restreint aux membres de l&apos;équipe Equistra ayant un besoin légitime</li>
          <li>Hébergement des données en Europe</li>
        </ul>
        <p className="mt-3">
          En cas de violation de données, nous nous engageons à vous informer dans les meilleurs délais
          et à notifier la CNIL dans les 72 heures conformément au RGPD.
        </p>
      </Section>

      {/* 8. Cookies */}
      <Section title="8. Cookies et traceurs">
        <p>
          L&apos;application Equistra utilise des cookies techniques strictement nécessaires à son fonctionnement
          (maintien de votre session, préférences de l&apos;application). Ces cookies ne nécessitent pas votre
          consentement car ils sont indispensables au service.
        </p>
        <p className="mt-2">
          Nous n&apos;utilisons pas de cookies publicitaires ni de traceurs tiers à des fins de ciblage ou de
          profilage commercial.
        </p>
      </Section>

      {/* 9. Mineurs */}
      <Section title="9. Mineurs">
        <p>
          Equistra n&apos;est pas destinée aux enfants de moins de 16 ans. Si vous avez moins de 16 ans, vous
          devez obtenir le consentement de votre représentant légal pour utiliser l&apos;application.
        </p>
        <p className="mt-2">
          Si nous apprenons qu&apos;un mineur de moins de 16 ans a créé un compte sans consentement parental,
          nous supprimerons ce compte dans les meilleurs délais.
        </p>
      </Section>

      {/* 10. Modifications */}
      <Section title="10. Modifications de cette politique">
        <p>
          Nous pouvons mettre à jour cette politique pour refléter l&apos;évolution de l&apos;application ou des
          exigences légales. En cas de modification substantielle, nous vous en informerons par notification
          dans l&apos;application au moins 30 jours avant l&apos;entrée en vigueur des changements.
        </p>
        <p className="mt-2">
          L&apos;utilisation continue de l&apos;application après notification vaut acceptation de la nouvelle politique.
        </p>
      </Section>

      {/* 11. Contact */}
      <Section title="11. Nous contacter">
        <p>Pour toute question relative à cette politique ou à vos données personnelles :</p>
        <ul className="mt-2 space-y-1 list-disc list-inside ml-2">
          <li>Par e-mail : <a href="mailto:privacy@equistra.com" className="text-orange font-semibold hover:underline">privacy@equistra.com</a></li>
          <li>Par courrier : Equistra SAS — [ADRESSE À COMPLÉTER]</li>
        </ul>
        <p className="mt-3 text-gray-400 italic text-sm">
          Nous nous engageons à répondre à toute demande dans un délai maximum de 30 jours.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-black border-b border-gray-100 pb-2">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-bold text-black mb-1.5">{title}</h3>
      <div className="text-sm text-gray-600 leading-relaxed">{children}</div>
    </div>
  );
}
