export const ASA_GUIDES = {
  "Mariage ou PACS du collaborateur": {
    description: "Cette absence permet au collaborateur de s'absenter à l'occasion de son propre mariage ou de la conclusion de son PACS.",
    validation: [
      "La demande concerne le mariage ou le PACS du collaborateur.",
      "Un justificatif permettant d'établir l'événement doit être joint.",
      "La date de l'absence doit être cohérente avec la date de l'événement.",
    ],
  },
  "Mariage d'un enfant": {
    description: "Cette absence permet au collaborateur de s'absenter à l'occasion du mariage de son enfant.",
    validation: [
      "La demande concerne bien le mariage d'un enfant du collaborateur.",
      "Un justificatif permettant d'établir l'événement doit être joint.",
      "La date de l'absence doit être cohérente avec la date du mariage.",
    ],
  },
  "Naissance d'un enfant": {
    description: "Cette absence accompagne la naissance d'un enfant et s'ajoute aux dispositifs de congé de paternité et d'accueil de l'enfant lorsqu'ils sont applicables.",
    validation: [
      "La naissance doit concerner le foyer du collaborateur dans les conditions légales applicables.",
      "Un justificatif de naissance doit être joint.",
      "Les dates demandées doivent respecter la période de prise applicable au congé de naissance.",
    ],
  },
  "Arrivée d'un enfant placé en vue de son adoption": {
    description: "Cette absence accompagne l'arrivée au foyer d'un enfant placé en vue de son adoption.",
    validation: [
      "Le placement en vue de l'adoption doit concerner le foyer du collaborateur.",
      "Un document justifiant le placement ou l'arrivée de l'enfant doit être joint.",
      "Les dates demandées doivent être cohérentes avec l'arrivée de l'enfant et les règles légales de prise.",
    ],
  },
  "Décès du conjoint": {
    description: "Cette absence permet au collaborateur de disposer de jours d'absence à la suite du décès de son conjoint.",
    validation: [
      "Le lien avec la personne décédée doit correspondre au motif sélectionné.",
      "Un justificatif du décès doit être joint.",
      "La période demandée doit être cohérente avec l'événement.",
    ],
  },
  "Décès partenaire PACS ou concubin": {
    description: "Cette absence concerne le décès du partenaire lié par un PACS ou du concubin du collaborateur.",
    validation: [
      "Le lien avec la personne décédée doit correspondre au motif sélectionné.",
      "Un justificatif du décès et, si nécessaire, du lien avec le collaborateur doit être joint.",
      "La période demandée doit être cohérente avec l'événement.",
    ],
  },
  "Décès du père ou de la mère": {
    description: "Cette absence permet au collaborateur de s'absenter à la suite du décès de son père ou de sa mère.",
    validation: [
      "Le lien familial doit correspondre au motif sélectionné.",
      "Un justificatif du décès doit être joint.",
      "La période demandée doit être cohérente avec l'événement.",
    ],
  },
  "Décès beau-parent, frère ou sœur": {
    description: "Cette absence concerne le décès d'un beau-parent, d'un frère ou d'une sœur du collaborateur.",
    validation: [
      "Le lien familial doit correspondre au motif sélectionné.",
      "Un justificatif du décès doit être joint.",
      "La période demandée doit être cohérente avec l'événement.",
    ],
  },
  "Décès d'un enfant": {
    description: "Cette absence concerne le décès d'un enfant lorsque la situation ne relève pas du régime majoré prévu notamment pour certains décès avant 25 ans.",
    validation: [
      "Vérifier l'âge et la situation de l'enfant afin d'appliquer la bonne durée.",
      "Un justificatif du décès doit être joint.",
      "Si l'enfant avait moins de 25 ans, était lui-même parent ou si la situation concerne une personne de moins de 25 ans à charge effective et permanente, utiliser le motif majoré correspondant.",
    ],
  },
  "Décès enfant de moins de 25 ans ou cas assimilé": {
    description: "Ce motif applique la durée majorée prévue pour le décès d'un enfant de moins de 25 ans et les situations légalement assimilées.",
    validation: [
      "Vérifier que l'enfant avait moins de 25 ans, ou qu'une autre situation légalement assimilée s'applique.",
      "Un justificatif du décès doit être joint.",
      "Les éléments fournis doivent permettre de retenir le régime majoré.",
    ],
  },
  "Annonce handicap, pathologie chronique ou cancer d'un enfant": {
    description: "Cette absence permet au collaborateur de disposer de temps lors de l'annonce de la survenue d'un handicap, d'une pathologie chronique nécessitant un apprentissage thérapeutique ou d'un cancer chez son enfant.",
    validation: [
      "La situation annoncée doit correspondre à l'un des cas prévus par le dispositif.",
      "Un justificatif approprié doit être joint sans demander davantage d'informations médicales que nécessaire.",
      "La demande doit être liée à l'annonce concernée.",
    ],
  },
  "Examen universitaire ou professionnel": {
    description: "Cette autorisation permet au collaborateur de s'absenter pour se présenter à un examen universitaire ou professionnel, dans la limite prévue par la convention.",
    validation: [
      "Vérifier que le collaborateur dispose d'au moins 3 mois d'ancienneté.",
      "Vérifier que le plafond annuel de 3 jours n'est pas dépassé.",
      "Une convocation ou un justificatif d'examen doit être joint.",
    ],
  },
  "Démarches d'obtention ou renouvellement de la RQTH": {
    description: "Cette absence est destinée aux démarches liées à l'obtention ou au renouvellement de la reconnaissance de la qualité de travailleur handicapé.",
    validation: [
      "La demande doit concerner une démarche d'obtention ou de renouvellement de la RQTH.",
      "Respecter le délai de prévenance configuré dans l'application.",
      "Vérifier uniquement le justificatif nécessaire à la démarche, sans demander d'information médicale non nécessaire.",
    ],
  },
  "Enfant malade": {
    description: "Cette absence permet au parent de s'absenter pour s'occuper d'un enfant malade ou accidenté dont il a la charge. La durée et la rémunération sont calculées selon la situation déclarée et les droits déjà utilisés.",
    validation: [
      "Un certificat médical constatant la maladie ou l'accident de l'enfant doit être joint.",
      "Vérifier les conditions déclarées par le collaborateur lorsqu'elles modifient le plafond ou la rémunération.",
      "Le plafond annuel et la part rémunérée sont contrôlés automatiquement par l'application.",
    ],
  },
};

export function getAsaGuide(libelle) {
  return ASA_GUIDES[libelle] || {
    description: "Cette autorisation spéciale d'absence correspond au motif sélectionné par le collaborateur.",
    validation: [
      "Vérifier que la situation correspond au motif choisi.",
      "Contrôler le justificatif lorsqu'il est requis.",
      "Vérifier que les dates demandées sont cohérentes avec l'événement.",
    ],
  };
}
