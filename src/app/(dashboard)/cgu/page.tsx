export default function CGUPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-black text-black">Conditions Générales d&apos;Utilisation</h1>
        <p className="text-sm text-gray-400 mt-0.5">Dernière mise à jour : Mars 2026</p>
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 leading-relaxed">
          Ces conditions régissent l&apos;utilisation de l&apos;application Equistra. En vous inscrivant, vous acceptez
          l&apos;intégralité de ces conditions. Ce document doit être relu par un avocat avant le lancement officiel.
        </div>
      </div>

      {/* 1. Objet */}
      <Section title="1. Objet">
        <p>
          Les présentes Conditions Générales d&apos;Utilisation (ci-après &laquo; CGU &raquo;) ont pour objet de définir
          les modalités et conditions dans lesquelles Equistra SAS (ci-après &laquo; Equistra &raquo;) met à disposition
          des utilisateurs l&apos;application Equistra, ainsi que les droits et obligations de chaque partie.
        </p>
        <p className="mt-2">
          Equistra est une application de suivi équestre permettant aux cavaliers, propriétaires de chevaux,
          coachs et gérants d&apos;écurie de centraliser toutes les informations liées à leurs chevaux : journal
          de travail, carnet de santé, nutrition, budget, concours et Horse Index.
        </p>
      </Section>

      {/* 2. Acceptation */}
      <Section title="2. Acceptation des conditions">
        <p>
          L&apos;accès et l&apos;utilisation de l&apos;application Equistra sont soumis à l&apos;acceptation sans réserve des
          présentes CGU. En créant un compte ou en utilisant l&apos;application, vous reconnaissez avoir lu,
          compris et accepté ces conditions dans leur intégralité.
        </p>
        <p className="mt-2">
          Si vous n&apos;acceptez pas ces conditions, vous ne devez pas utiliser l&apos;application. Equistra se réserve
          le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute
          modification substantielle par notification dans l&apos;application au moins 30 jours avant son entrée
          en vigueur.
        </p>
        <p className="mt-2">
          L&apos;utilisation continue de l&apos;application après la date d&apos;entrée en vigueur des modifications vaut
          acceptation des nouvelles conditions.
        </p>
      </Section>

      {/* 3. Inscription */}
      <Section title="3. Inscription et compte utilisateur">
        <SubSection title="3.1 Création du compte">
          <p>
            Pour utiliser Equistra, vous devez créer un compte en fournissant une adresse e-mail valide et
            un mot de passe. Vous pouvez également vous inscrire via un service d&apos;authentification tiers
            (Google, Apple). Vous devez avoir au moins 16 ans pour créer un compte, ou disposer du
            consentement de votre représentant légal si vous avez moins de 16 ans.
          </p>
        </SubSection>

        <SubSection title="3.2 Exactitude des informations">
          <p>
            Vous vous engagez à fournir des informations exactes, à jour et complètes lors de votre
            inscription et à les maintenir à jour. Equistra ne saurait être tenu responsable des
            conséquences liées à la communication d&apos;informations inexactes.
          </p>
        </SubSection>

        <SubSection title="3.3 Sécurité du compte">
          <p>
            Vous êtes seul responsable de la confidentialité de vos identifiants de connexion et de
            toutes les actions effectuées depuis votre compte. En cas de suspicion d&apos;utilisation non
            autorisée, vous devez en informer Equistra dans les meilleurs délais à{" "}
            <a href="mailto:contact@equistra.com" className="text-orange font-semibold hover:underline">
              contact@equistra.com
            </a>
            .
          </p>
        </SubSection>

        <SubSection title="3.4 Compte unique">
          <p>
            Chaque utilisateur ne peut créer qu&apos;un seul compte. La création de comptes multiples est
            interdite et peut entraîner la suspension de l&apos;ensemble de vos comptes.
          </p>
        </SubSection>
      </Section>

      {/* 4. Description du service */}
      <Section title="4. Description du service">
        <SubSection title="4.1 Fonctionnalités disponibles">
          <p>Equistra propose les fonctionnalités suivantes selon le plan souscrit :</p>
          <ul className="mt-2 space-y-1 list-disc list-inside ml-2">
            <li><strong className="text-black">Horse Index</strong> — score de forme global calculé sur 100 points, mis à jour en temps réel</li>
            <li><strong className="text-black">Journal de travail</strong> — enregistrement des séances, suivi de l&apos;intensité et du ressenti</li>
            <li><strong className="text-black">Carnet de santé</strong> — suivi des soins, rappels automatiques, gestion des praticiens</li>
            <li><strong className="text-black">Nutrition</strong> — suivi de la ration alimentaire et des compléments</li>
            <li><strong className="text-black">Budget</strong> — suivi des dépenses liées à votre cheval</li>
            <li><strong className="text-black">Concours</strong> — enregistrement des résultats et du palmarès</li>
            <li><strong className="text-black">Coach IA</strong> — recommandations personnalisées et insights hebdomadaires</li>
            <li><strong className="text-black">Communauté</strong> — fil d&apos;activité et classements entre utilisateurs</li>
          </ul>
        </SubSection>

        <SubSection title="4.2 Disponibilité du service">
          <p>
            Equistra s&apos;efforce d&apos;assurer la disponibilité de l&apos;application 24h/24 et 7j/7. Toutefois,
            des interruptions peuvent survenir pour maintenance, mises à jour ou en cas de force majeure.
            Equistra ne saurait être tenu responsable de toute interruption de service.
          </p>
        </SubSection>

        <SubSection title="4.3 Évolution du service">
          <p>
            Equistra se réserve le droit de modifier, améliorer ou supprimer des fonctionnalités à tout
            moment. Les modifications substantielles affectant les fonctionnalités payantes seront
            notifiées à l&apos;avance.
          </p>
        </SubSection>
      </Section>

      {/* 5. Obligations utilisateur */}
      <Section title="5. Obligations de l'utilisateur">
        <SubSection title="5.1 Utilisation conforme">
          <p>
            Vous vous engagez à utiliser Equistra conformément aux présentes CGU, à la législation
            applicable et aux bonnes mœurs. Il est notamment interdit de :
          </p>
          <ul className="mt-2 space-y-1 list-disc list-inside ml-2">
            <li>Utiliser l&apos;application à des fins illégales ou frauduleuses</li>
            <li>Publier des contenus offensants, diffamatoires, discriminatoires ou portant atteinte à des droits tiers</li>
            <li>Tenter de contourner les mesures de sécurité de l&apos;application</li>
            <li>Collecter des données sur d&apos;autres utilisateurs sans leur consentement</li>
            <li>Utiliser des robots ou scripts automatisés pour accéder au service</li>
            <li>Revendre ou sous-licencier l&apos;accès à Equistra à des tiers</li>
          </ul>
        </SubSection>

        <SubSection title="5.2 Contenu utilisateur">
          <p>
            Vous êtes seul responsable des contenus (textes, photos, vidéos, données) que vous
            publiez sur Equistra. En publiant du contenu, vous accordez à Equistra une licence
            non exclusive, mondiale, gratuite et révocable pour utiliser, stocker et afficher ce
            contenu dans le cadre du service.
          </p>
          <p className="mt-2">
            Vous garantissez disposer de tous les droits nécessaires sur les contenus publiés et
            que ceux-ci ne violent aucun droit de tiers.
          </p>
        </SubSection>

        <SubSection title="5.3 Exactitude des données équestres">
          <p>
            Les données saisies concernant vos chevaux (santé, travail, nutrition) sont sous votre
            responsabilité exclusive. Equistra ne peut en aucun cas valider ou certifier l&apos;exactitude
            médicale ou sportive de ces données.
          </p>
        </SubSection>
      </Section>

      {/* 6. Données personnelles */}
      <Section title="6. Données personnelles">
        <p>
          Le traitement de vos données personnelles est régi par notre{" "}
          <a href="/confidentialite" className="text-orange font-semibold hover:underline">
            Politique de confidentialité
          </a>
          , qui fait partie intégrante des présentes CGU. Conformément au Règlement Général sur la
          Protection des Données (RGPD), vous disposez de droits d&apos;accès, de rectification, d&apos;effacement
          et de portabilité de vos données.
        </p>
        <p className="mt-2">
          Pour exercer ces droits ou pour toute question relative à vos données personnelles, contactez
          notre délégué à la protection des données à{" "}
          <a href="mailto:privacy@equistra.com" className="text-orange font-semibold hover:underline">
            privacy@equistra.com
          </a>
          .
        </p>
      </Section>

      {/* 7. Propriété intellectuelle */}
      <Section title="7. Propriété intellectuelle">
        <SubSection title="7.1 Droits d'Equistra">
          <p>
            L&apos;application Equistra, son code source, son design, ses algorithmes (dont le Horse Index),
            ses bases de données, ses marques et logos sont la propriété exclusive d&apos;Equistra SAS ou
            de ses partenaires et sont protégés par les lois en vigueur sur la propriété intellectuelle.
          </p>
          <p className="mt-2">
            Toute reproduction, modification, distribution ou exploitation sans autorisation préalable
            écrite d&apos;Equistra est strictement interdite.
          </p>
        </SubSection>

        <SubSection title="7.2 Vos données">
          <p>
            Vous conservez la pleine propriété de toutes les données relatives à vos chevaux que vous
            saisissez dans l&apos;application. Equistra ne revendique aucun droit de propriété sur vos données.
          </p>
          <p className="mt-2">
            Vous pouvez exporter l&apos;intégralité de vos données à tout moment depuis Réglages → Mes données →
            Télécharger mes données.
          </p>
        </SubSection>
      </Section>

      {/* 8. Limitation de responsabilité */}
      <Section title="8. Limitation de responsabilité">
        <SubSection title="8.1 Nature du service">
          <p>
            Equistra est un outil de suivi et d&apos;aide à la décision. Les informations et recommandations
            fournies par l&apos;application — y compris les insights générés par l&apos;intelligence artificielle —
            ont un caractère informatif et ne sauraient en aucun cas se substituer à l&apos;avis d&apos;un
            professionnel (vétérinaire, entraîneur, nutritionniste équin).
          </p>
        </SubSection>

        <SubSection title="8.2 Limitation de garantie">
          <p>
            Equistra est fourni &laquo; tel quel &raquo;, sans garantie d&apos;aucune sorte, expresse ou implicite.
            Equistra ne garantit pas que le service sera exempt d&apos;erreurs, ininterrompu ou adapté à
            vos besoins spécifiques.
          </p>
        </SubSection>

        <SubSection title="8.3 Exclusion de responsabilité">
          <p>
            Equistra ne pourra être tenu responsable de dommages directs ou indirects résultant de
            l&apos;utilisation ou de l&apos;impossibilité d&apos;utiliser l&apos;application, d&apos;une erreur dans les données
            saisies par l&apos;utilisateur, de décisions prises sur la base des informations fournies par
            l&apos;application, ou d&apos;accès non autorisé à votre compte dû à un manquement à votre obligation
            de confidentialité de vos identifiants.
          </p>
        </SubSection>

        <SubSection title="8.4 Plafond de responsabilité">
          <p>
            Dans les cas où la responsabilité d&apos;Equistra ne pourrait être exclue, elle est limitée au
            montant des sommes effectivement versées par l&apos;utilisateur au cours des 12 derniers mois
            précédant le fait générateur du dommage.
          </p>
        </SubSection>
      </Section>

      {/* 9. Suspension et résiliation */}
      <Section title="9. Suspension et résiliation">
        <SubSection title="9.1 Résiliation par l'utilisateur">
          <p>
            Vous pouvez supprimer votre compte à tout moment depuis Réglages → Mon compte →
            Supprimer mon compte. La suppression est définitive et entraîne l&apos;effacement de toutes
            vos données personnelles dans un délai de 30 jours, à l&apos;exception des données financières
            conservées 10 ans conformément à nos obligations légales.
          </p>
        </SubSection>

        <SubSection title="9.2 Suspension par Equistra">
          <p>
            Equistra se réserve le droit de suspendre ou résilier votre compte, sans préavis ni
            remboursement, en cas de violation des présentes CGU, d&apos;utilisation frauduleuse du service,
            de comportement nuisible envers d&apos;autres utilisateurs, ou sur injonction d&apos;une autorité
            judiciaire ou administrative compétente.
          </p>
        </SubSection>

        <SubSection title="9.3 Effets de la résiliation">
          <p>
            En cas de résiliation, votre accès au service est immédiatement interrompu. Les articles
            relatifs à la propriété intellectuelle, la limitation de responsabilité et le droit applicable
            survivent à la résiliation.
          </p>
        </SubSection>
      </Section>

      {/* 10. Tarifs et paiements */}
      <Section title="10. Tarifs et paiements">
        <SubSection title="10.1 Plans disponibles">
          <p>Equistra propose les plans suivants :</p>
          <table className="mt-3 w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2.5 text-left font-semibold text-black">Plan</th>
                <th className="px-4 py-2.5 text-left font-semibold text-black">Tarif</th>
                <th className="px-4 py-2.5 text-left font-semibold text-black">Fonctionnalités</th>
              </tr>
            </thead>
            <tbody>
              {[
                { plan: "Starter", price: "Gratuit", features: "1 cheval, carnet de santé, journal de travail" },
                { plan: "Pro", price: "9 €/mois", features: "Chevaux illimités, tous les modules, IA illimitée, export PDF" },
                { plan: "Écurie", price: "29 €/mois", features: "Tout le plan Pro + gestion multi-cavaliers, dashboard écurie" },
              ].map((r) => (
                <tr key={r.plan} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 font-semibold text-black">{r.plan}</td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{r.price}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.features}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SubSection>

        <SubSection title="10.2 Facturation">
          <p>
            Les abonnements payants sont facturés mensuellement par prélèvement automatique via notre
            prestataire de paiement sécurisé Stripe. Votre abonnement est reconduit tacitement chaque
            mois jusqu&apos;à résiliation.
          </p>
        </SubSection>

        <SubSection title="10.3 Résiliation et remboursement">
          <p>
            Vous pouvez résilier votre abonnement à tout moment depuis Réglages → Mon abonnement →
            Gérer mon abonnement. La résiliation prend effet à la fin de la période de facturation en
            cours. Aucun remboursement au prorata ne sera effectué pour la période en cours.
          </p>
          <p className="mt-2">
            Conformément à l&apos;article L.221-28 du Code de la consommation, le droit de rétractation de
            14 jours s&apos;applique à partir de la souscription. Pour l&apos;exercer, contactez-nous à{" "}
            <a href="mailto:contact@equistra.com" className="text-orange font-semibold hover:underline">
              contact@equistra.com
            </a>
            .
          </p>
        </SubSection>

        <SubSection title="10.4 Modification des tarifs">
          <p>
            Equistra se réserve le droit de modifier ses tarifs. Toute modification sera notifiée
            aux abonnés au moins 30 jours à l&apos;avance. Le défaut de résiliation avant la date d&apos;entrée
            en vigueur vaut acceptation des nouveaux tarifs.
          </p>
        </SubSection>
      </Section>

      {/* 11. Droit applicable */}
      <Section title="11. Droit applicable et litiges">
        <p>
          Les présentes CGU sont régies par le droit français. En cas de litige relatif à l&apos;interprétation
          ou à l&apos;exécution des présentes CGU, les parties s&apos;engagent à rechercher une solution amiable
          avant tout recours judiciaire.
        </p>
        <p className="mt-2">
          À défaut d&apos;accord amiable dans un délai de 30 jours, tout litige sera soumis aux tribunaux
          compétents de Paris, sauf disposition légale contraire applicable aux consommateurs.
        </p>
        <p className="mt-2">
          Conformément aux articles L.616-1 et R.616-1 du Code de la consommation, Equistra propose
          un dispositif de médiation de la consommation. En cas de litige, vous pouvez recourir
          gratuitement au médiateur suivant : [MÉDIATEUR À COMPLÉTER].
        </p>
        <p className="mt-2">
          La Commission européenne met à disposition une plateforme de règlement en ligne des litiges
          accessible à l&apos;adresse :{" "}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-orange hover:underline">
            ec.europa.eu/consumers/odr
          </a>
          .
        </p>
      </Section>

      {/* 12. Contact */}
      <Section title="12. Nous contacter">
        <p>Pour toute question relative aux présentes CGU ou à l&apos;utilisation du service :</p>
        <table className="mt-3 w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
          <tbody>
            {[
              { label: "Société", value: "Equistra SAS" },
              { label: "Adresse", value: "[ADRESSE À COMPLÉTER]" },
              { label: "E-mail", value: "contact@equistra.com" },
              { label: "RGPD", value: "privacy@equistra.com" },
            ].map((r) => (
              <tr key={r.label} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2.5 font-semibold text-black bg-gray-50 w-28">{r.label}</td>
                <td className="px-4 py-2.5 text-gray-600">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-gray-400 italic text-sm">
          Nous nous engageons à répondre à toute demande dans un délai maximum de 30 jours ouvrés.
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
