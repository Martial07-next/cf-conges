"use client";

import { useState, useEffect, useMemo } from "react";
import { getAsaGuide } from "@/lib/asaGuides";
import { useRouter } from "next/navigation";
import { Button, Card } from "./ui";

export default function RequestForm({ leaveTypes }) {
  const router = useRouter();
  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id || "");
  const [allMotifs, setAllMotifs] = useState([]);
  const [motifId, setMotifId] = useState("");
  const [rechercheMotif, setRechercheMotif] = useState("");
  const [filtreMotif, setFiltreMotif] = useState("TOUS");
  const [motifDetail, setMotifDetail] = useState(null);
  const [justificatifs, setJustificatifs] = useState([]);
  const [uploadingJustificatif, setUploadingJustificatif] = useState(false);
  const [justificatifError, setJustificatifError] = useState("");
  const [modeDate, setModeDate] = useState("jour");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [demiJournee, setDemiJournee] = useState(false);
  const [demiJourneePeriode, setDemiJourneePeriode] = useState("MATIN");
  const [exceptionnelle, setExceptionnelle] = useState(false);
  const [motif, setMotif] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [enfantMaladeMoinsUnAnHandicapAld, setEnfantMaladeMoinsUnAnHandicapAld] = useState(false);
  const [enfantMaladeTroisEnfantsOuPlus, setEnfantMaladeTroisEnfantsOuPlus] = useState(false);

  useEffect(() => {
    fetch("/api/motifs")
      .then((r) => r.json())
      .then((data) => setAllMotifs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const motifsForType = useMemo(() => allMotifs.filter((m) => m.leaveTypeId === leaveTypeId), [allMotifs, leaveTypeId]);
  const motifsFiltres = useMemo(() => {
    const recherche = rechercheMotif.trim().toLocaleLowerCase("fr");
    return motifsForType.filter((m) => {
      if (recherche && !m.libelle.toLocaleLowerCase("fr").includes(recherche)) return false;
      if (filtreMotif === "REMUNERE" && !m.remunere && m.libelle !== "Enfant malade") return false;
      if (filtreMotif === "JUSTIFICATIF" && !m.justificatifRequis) return false;
      if (
        filtreMotif === "CONDITIONS" &&
        !m.ancienneteMinMois &&
        m.plafondAnnuelJours == null &&
        m.libelle !== "Enfant malade" &&
        m.libelle !== "Démarches d'obtention ou renouvellement de la RQTH"
      ) return false;
      return true;
    });
  }, [motifsForType, rechercheMotif, filtreMotif]);

  const selectedMotif = motifsForType.find((m) => m.id === motifId);
  const estEnfantMalade = selectedMotif?.libelle === "Enfant malade";

  function handleSelectType(id) {
    setLeaveTypeId(id);
    setMotifId("");
    setEnfantMaladeMoinsUnAnHandicapAld(false);
    setEnfantMaladeTroisEnfantsOuPlus(false);
  }

  async function handleJustificatifs(files) {
    const selection = Array.from(files || []);
    if (!selection.length) return;

    const cleFichier = (file) => `${file.name}::${file.size}::${file.type}::${file.lastModified || ""}`;
    const clesExistantes = new Set(
      justificatifs.map((piece) => piece.cle || `${piece.nom}::${piece.taille}::${piece.type || ""}::${piece.lastModified || ""}`)
    );
    const clesSelection = new Set();
    const doublons = [];
    const liste = selection.filter((file) => {
      const cle = cleFichier(file);
      if (clesExistantes.has(cle) || clesSelection.has(cle)) {
        doublons.push(file.name);
        return false;
      }
      clesSelection.add(cle);
      return true;
    });

    if (doublons.length) {
      setJustificatifError(
        `Ce document est déjà ajouté : ${[...new Set(doublons)].join(", ")}.`
      );
    } else {
      setJustificatifError("");
    }

    if (!liste.length) return;
    if (justificatifs.length + liste.length > 20) {
      setJustificatifError("Vous pouvez joindre jusqu'à 20 documents par demande.");
      return;
    }

    setError("");
    setUploadingJustificatif(true);

    try {
      for (const file of liste) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/justificatifs/upload", { method: "POST", body: formData });
        const contentType = res.headers.get("content-type") || "";
        let data = null;

        if (contentType.includes("application/json")) {
          data = await res.json();
        } else {
          const texte = await res.text();
          if (!res.ok) {
            throw new Error(
              res.status === 413
                ? `${file.name} est trop volumineux. La taille maximale est de 10 Mo.`
                : "Le document n'a pas pu être envoyé. Réessayez dans quelques instants."
            );
          }
          throw new Error("Le serveur a renvoyé une réponse inattendue. Réessayez dans quelques instants.");
        }

        if (!res.ok) throw new Error(data?.error || `Impossible d'envoyer ${file.name}.`);

        setJustificatifs((actuels) => [
          ...actuels,
          {
            nom: data.nomOriginal || file.name,
            path: data.storagePath,
            type: data.type || file.type,
            taille: data.taille ?? file.size,
            lastModified: file.lastModified,
            cle: cleFichier(file),
          },
        ]);
      }
    } catch (err) {
      setJustificatifError(err?.message || "Le document n'a pas pu être envoyé. Veuillez réessayer.");
    } finally {
      setUploadingJustificatif(false);
    }
  }

  function retirerJustificatif(path) {
    setJustificatifs((actuels) => actuels.filter((piece) => piece.path !== path));
    setJustificatifError("");
  }

  function handleDateDebutChange(value) {
    setDateDebut(value);
    if (modeDate === "jour") setDateFin(value);
  }

  function handleModeDateChange(mode) {
    setModeDate(mode);
    if (mode === "jour" && dateDebut) setDateFin(dateDebut);
    if (mode === "plage") setDemiJournee(false);
  }

  function computedDateFin() {
    if (!selectedMotif || !dateDebut) return "";
    const d = new Date(dateDebut);
    d.setDate(d.getDate() + Math.ceil(selectedMotif.jours) - 1);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/leave-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leaveTypeId,
        motifId: motifId || undefined,
        dateDebut,
        dateFin: motifId ? undefined : dateFin,
        demiJournee,
        demiJourneePeriode: demiJournee ? demiJourneePeriode : undefined,
        exceptionnelle,
        motif,
        enfantMaladeMoinsUnAnHandicapAld: estEnfantMalade ? enfantMaladeMoinsUnAnHandicapAld : undefined,
        enfantMaladeTroisEnfantsOuPlus: estEnfantMalade ? enfantMaladeTroisEnfantsOuPlus : undefined,
        piecesJointes: justificatifs,
      }),
    });
    const contentType = res.headers.get("content-type") || "";
    let data = null;
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      await res.text();
    }
    setLoading(false);

    if (!res.ok) {
      setError(data?.error || "Votre demande n'a pas pu être envoyée. Veuillez réessayer.");
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/mes-demandes"), 1200);
  }

  if (success) {
    return (
      <Card className="p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-brand-green/20 flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
        <p className="font-bold text-brand-dark">Demande envoyée</p>
        <p className="text-sm text-brand-dark/60 mt-1">Vous serez notifié dès qu'elle sera traitée.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-7">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Etape 1 : type de conge - un clic */}
        <div>
          <label className="block text-xs font-semibold text-brand-dark/70 mb-2.5">1. Type de congé</label>
          <div className="flex flex-wrap gap-2">
            {leaveTypes.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => handleSelectType(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors focus-ring ${
                  leaveTypeId === t.id
                    ? "border-brand-green bg-brand-green/15 text-brand-dark"
                    : "border-black/10 text-brand-dark/70 hover:border-black/20"
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.couleur }} />
                {t.libelle}
              </button>
            ))}
          </div>
        </div>

        {/* Motif a duree fixe (ex: ASA) */}
        {motifsForType.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-brand-dark/70 mb-2.5">Motif</label>
            <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_190px]">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-brand-dark/35">⌕</span>
                <input
                  type="search"
                  value={rechercheMotif}
                  onChange={(e) => setRechercheMotif(e.target.value)}
                  placeholder="Rechercher un motif"
                  className="w-full rounded-xl border border-black/10 bg-brand-cream/60 py-2.5 pl-9 pr-3 text-sm text-brand-dark outline-none focus:border-brand-green"
                />
              </div>
              <select
                value={filtreMotif}
                onChange={(e) => setFiltreMotif(e.target.value)}
                className="rounded-xl border border-black/10 bg-brand-cream/60 px-3 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-green"
              >
                <option value="TOUS">Tous les motifs</option>
                <option value="REMUNERE">Rémunérés</option>
                <option value="JUSTIFICATIF">Justificatif requis</option>
                <option value="CONDITIONS">Avec conditions</option>
              </select>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {motifsFiltres.map((m) => {
                const actif = motifId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMotifId(m.id);
                      setEnfantMaladeMoinsUnAnHandicapAld(false);
                      setEnfantMaladeTroisEnfantsOuPlus(false);
                    }}
                    className={`rounded-xl border p-3.5 text-left transition-colors focus-ring ${
                      actif
                        ? "border-brand-green bg-brand-green/10"
                        : "border-black/10 bg-brand-cream/40 hover:border-brand-green/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-bold text-brand-dark">{m.libelle}</p>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="rounded-full bg-black/5 px-2 py-1 text-[10px] font-bold text-brand-dark/65">
                          {m.libelle === "Enfant malade" ? "3 à 5 j/an" : `${m.jours} j`}
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`Voir les détails de ${m.libelle}`}
                          onClick={(e) => { e.stopPropagation(); setMotifDetail(m); }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              setMotifDetail(m);
                            }
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/10 bg-white text-sm text-brand-dark/60 hover:border-brand-green hover:text-brand-dark"
                        >
                          👁
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.libelle === "Enfant malade" ? (
                        <span className="rounded-md bg-brand-yellow/15 px-2 py-1 text-[10px] font-semibold text-brand-dark/70">
                          Rémunération selon situation
                        </span>
                      ) : (
                        <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                          m.remunere
                            ? "bg-[rgb(10_254_107)]/15 text-brand-dark"
                            : "bg-black/5 text-brand-dark/60"
                        }`}>
                          {m.remunere ? "Rémunéré" : "Non rémunéré"}
                        </span>
                      )}
                      {m.justificatifRequis && (
                        <span className="rounded-md bg-black/5 px-2 py-1 text-[10px] font-semibold text-brand-dark/60">
                          Justificatif requis
                        </span>
                      )}
                      {m.ancienneteMinMois > 0 && (
                        <span className="rounded-md bg-black/5 px-2 py-1 text-[10px] font-semibold text-brand-dark/60">
                          {m.ancienneteMinMois} mois d'ancienneté
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {motifsFiltres.length === 0 && (
              <div className="rounded-xl border border-dashed border-black/10 px-4 py-6 text-center">
                <p className="text-sm font-semibold text-brand-dark/60">Aucun motif ne correspond à votre recherche.</p>
                <button
                  type="button"
                  onClick={() => { setRechercheMotif(""); setFiltreMotif("TOUS"); }}
                  className="mt-2 text-xs font-bold text-brand-greendark hover:underline"
                >
                  Réinitialiser la recherche
                </button>
              </div>
            )}

            {motifId && (
              <button
                type="button"
                onClick={() => {
                  setMotifId("");
                  setEnfantMaladeMoinsUnAnHandicapAld(false);
                  setEnfantMaladeTroisEnfantsOuPlus(false);
                }}
                className="mt-2 text-xs font-semibold text-brand-dark/50 hover:text-brand-dark"
              >
                Effacer le motif
              </button>
            )}

            {selectedMotif?.libelle === "Démarches d'obtention ou renouvellement de la RQTH" && (
              <div className="mt-3 rounded-xl border border-brand-yellow/40 bg-brand-yellow/10 p-3">
                <p className="text-xs font-semibold text-brand-dark">
                  Cette absence doit être demandée au moins 15 jours avant la date prévue.
                </p>
              </div>
            )}

            {estEnfantMalade && (
              <div className="mt-3 rounded-xl border border-black/10 bg-brand-cream/50 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-brand-dark">Situation de l'enfant</p>
                  <p className="text-xs text-brand-dark/55 mt-1">
                    Ces informations servent uniquement à déterminer automatiquement vos droits et la rémunération de l'absence.
                  </p>
                </div>
                <label className="flex items-start gap-2.5 text-sm text-brand-dark/80">
                  <input
                    type="checkbox"
                    checked={enfantMaladeMoinsUnAnHandicapAld}
                    onChange={(e) => setEnfantMaladeMoinsUnAnHandicapAld(e.target.checked)}
                    className="accent-brand-green w-4 h-4 mt-0.5 shrink-0"
                  />
                  <span>L'enfant a moins d'un an, est en situation de handicap ou relève d'une affection longue durée (ALD).</span>
                </label>
                <label className="flex items-start gap-2.5 text-sm text-brand-dark/80">
                  <input
                    type="checkbox"
                    checked={enfantMaladeTroisEnfantsOuPlus}
                    onChange={(e) => setEnfantMaladeTroisEnfantsOuPlus(e.target.checked)}
                    className="accent-brand-green w-4 h-4 mt-0.5 shrink-0"
                  />
                  <span>J'ai au moins 3 enfants de moins de 16 ans à charge.</span>
                </label>
                <p className="text-xs font-medium text-brand-dark/65">
                  La plateforme calcule le plafond et la part rémunérée à partir de votre ancienneté et de ces réponses. Un justificatif médical est requis.
                </p>
              </div>
            )}
          </div>
        )}

        {selectedMotif && (
          <JustificatifsField
            requis={selectedMotif.justificatifRequis}
            justificatifs={justificatifs}
            uploading={uploadingJustificatif}
            error={justificatifError}
            onFiles={handleJustificatifs}
            onRemove={retirerJustificatif}
          />
        )}

        {motifDetail && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
            onClick={() => setMotifDetail(null)}
          >
            <div
              className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-brand-dark/40">Autorisation spéciale d'absence</p>
                  <h3 className="mt-1 text-lg font-bold text-brand-dark">{motifDetail.libelle}</h3>
                </div>
                <button type="button" onClick={() => setMotifDetail(null)} className="rounded-lg p-2 text-brand-dark/50 hover:bg-black/5">✕</button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-black/[0.03] p-3">
                  <p className="text-brand-dark/45">Durée</p>
                  <p className="mt-1 font-bold text-brand-dark">{motifDetail.libelle === "Enfant malade" ? "3 à 5 jours/an" : `${motifDetail.jours} jour(s)`}</p>
                </div>
                <div className="rounded-xl bg-black/[0.03] p-3">
                  <p className="text-brand-dark/45">Rémunération</p>
                  <p className="mt-1 font-bold text-brand-dark">{motifDetail.libelle === "Enfant malade" ? "Selon la situation" : motifDetail.remunere ? "Rémunérée" : "Non rémunérée"}</p>
                </div>
                {motifDetail.ancienneteMinMois > 0 && (
                  <div className="rounded-xl bg-black/[0.03] p-3">
                    <p className="text-brand-dark/45">Ancienneté</p>
                    <p className="mt-1 font-bold text-brand-dark">{motifDetail.ancienneteMinMois} mois minimum</p>
                  </div>
                )}
                {motifDetail.plafondAnnuelJours != null && (
                  <div className="rounded-xl bg-black/[0.03] p-3">
                    <p className="text-brand-dark/45">Plafond</p>
                    <p className="mt-1 font-bold text-brand-dark">{motifDetail.plafondAnnuelJours} jour(s) par an</p>
                  </div>
                )}
              </div>

              {motifDetail.libelle === "Démarches d'obtention ou renouvellement de la RQTH" && (
                <p className="mt-3 rounded-xl bg-brand-yellow/10 p-3 text-xs font-semibold text-brand-dark">
                  La demande doit être déposée au moins 15 jours avant la date d'absence.
                </p>
              )}

              {(() => {
                const guide = getAsaGuide(motifDetail.libelle);
                return (
                  <div className="mt-5 space-y-3">
                    <div className="rounded-xl border border-black/5 bg-brand-cream/50 p-4">
                      <p className="text-sm font-bold text-brand-dark">En quoi consiste cette absence ?</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-brand-dark/65">{guide.description}</p>
                    </div>
                    <div className="rounded-xl border border-brand-green/20 bg-brand-green/5 p-4">
                      <p className="text-sm font-bold text-brand-dark">Pour que la demande puisse être validée</p>
                      <ul className="mt-2 space-y-2">
                        {guide.validation.map((item) => (
                          <li key={item} className="flex gap-2 text-xs leading-relaxed text-brand-dark/70">
                            <span className="mt-0.5 font-bold text-brand-green">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}

              <JustificatifsField
                requis={motifDetail.justificatifRequis}
                justificatifs={justificatifs}
                uploading={uploadingJustificatif}
                error={justificatifError}
                onFiles={handleJustificatifs}
                onRemove={retirerJustificatif}
                compact
              />

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMotifId(motifDetail.id);
                    setEnfantMaladeMoinsUnAnHandicapAld(false);
                    setEnfantMaladeTroisEnfantsOuPlus(false);
                    setMotifDetail(null);
                  }}
                  className="flex-1 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-bold text-brand-dark"
                >
                  Choisir ce motif
                </button>
                <button type="button" onClick={() => setMotifDetail(null)} className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-brand-dark/60">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Etape 2 : dates */}
        <div>
          <label className="block text-xs font-semibold text-brand-dark/70 mb-2.5">2. Dates</label>
          {motifId && !estEnfantMalade ? (
            <div>
              <span className="block text-[11px] text-brand-dark/50 mb-1">Date de début</span>
              <input
                type="date"
                required
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
              />
              {dateDebut && (
                <p className="text-xs text-brand-dark/50 mt-2">
                  Durée fixe de {selectedMotif?.jours} jour(s) → jusqu'au <strong>{computedDateFin()}</strong>
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="inline-flex bg-black/5 rounded-xl p-1 gap-1 mb-3">
                <button
                  type="button"
                  onClick={() => handleModeDateChange("jour")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    modeDate === "jour" ? "bg-white text-brand-dark shadow-sm" : "text-brand-dark/50 hover:text-brand-dark"
                  }`}
                >
                  Un seul jour
                </button>
                <button
                  type="button"
                  onClick={() => handleModeDateChange("plage")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    modeDate === "plage" ? "bg-white text-brand-dark shadow-sm" : "text-brand-dark/50 hover:text-brand-dark"
                  }`}
                >
                  Plusieurs jours
                </button>
              </div>

              {modeDate === "jour" ? (
                <div>
                  <span className="block text-[11px] text-brand-dark/50 mb-1">Date</span>
                  <input
                    type="date"
                    required
                    value={dateDebut}
                    onChange={(e) => handleDateDebutChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
                  />
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[11px] text-brand-dark/50 mb-1">Du</span>
                    <input
                      type="date"
                      required
                      value={dateDebut}
                      onChange={(e) => setDateDebut(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] text-brand-dark/50 mb-1">Au</span>
                    <input
                      type="date"
                      required
                      value={dateFin}
                      onChange={(e) => setDateFin(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none"
                    />
                  </div>
                </div>
              )}

              {modeDate === "jour" && (
                <>
                  <label className="flex items-center gap-2 mt-3 text-sm text-brand-dark/70">
                    <input
                      type="checkbox"
                      checked={demiJournee}
                      onChange={(e) => setDemiJournee(e.target.checked)}
                      className="accent-brand-green w-4 h-4"
                    />
                    Demi-journée
                  </label>
                  {demiJournee && (
                    <div className="flex gap-2 mt-2 ml-6">
                      <button
                        type="button"
                        onClick={() => setDemiJourneePeriode("MATIN")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          demiJourneePeriode === "MATIN" ? "border-brand-green bg-brand-green/15 text-brand-dark" : "border-black/10 text-brand-dark/60"
                        }`}
                      >
                        Matin
                      </button>
                      <button
                        type="button"
                        onClick={() => setDemiJourneePeriode("APREM")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          demiJourneePeriode === "APREM" ? "border-brand-green bg-brand-green/15 text-brand-dark" : "border-black/10 text-brand-dark/60"
                        }`}
                      >
                        Après-midi
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Exceptionnelle */}
        <div className="rounded-xl border border-black/10 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-brand-dark">
            <input
              type="checkbox"
              checked={exceptionnelle}
              onChange={(e) => setExceptionnelle(e.target.checked)}
              className="accent-brand-yellow w-4 h-4"
            />
            Demande exceptionnelle (préavis raccourci)
          </label>
          {exceptionnelle && (
            <p className="text-xs text-brand-dark/50 mt-2">
              Cette demande sera signalée en priorité à votre employeur. Le motif ci-dessous devient obligatoire.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-dark/70 mb-2.5">
            Commentaire {exceptionnelle && <span className="text-alert-soft">(obligatoire)</span>}
          </label>
          <textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            required={exceptionnelle}
            rows={3}
            placeholder="Précisez le motif si nécessaire…"
            className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-brand-cream/60 text-sm focus-ring outline-none resize-none"
          />
        </div>

        {error && <p className="text-sm text-alert-soft bg-alert-soft/10 border border-alert-soft/30 rounded-xl px-3 py-2">{error}</p>}

        {/* Etape 3 : envoi - un clic */}
        <Button type="submit" disabled={loading || !leaveTypeId} className="w-full">
          {loading ? "Envoi…" : "3. Envoyer la demande"}
        </Button>
      </form>
    </Card>
  );
}


function JustificatifsField({ requis, justificatifs, uploading, error, onFiles, onRemove, compact = false }) {
  return (
    <div className={`justificatifs-panel ${compact ? "mt-5" : "rounded-xl border border-black/10 bg-brand-cream/30 p-4"}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="justificatifs-title text-sm font-bold text-brand-dark">Justificatifs</p>
          <p className="justificatifs-help mt-0.5 text-xs text-brand-dark/50">
            {requis ? "Au moins un justificatif est obligatoire." : "Vous pouvez joindre un ou plusieurs documents."}
          </p>
        </div>
        {justificatifs.length > 0 && (
          <span className="rounded-full bg-brand-green/15 px-2.5 py-1 text-[11px] font-bold text-brand-dark">
            {justificatifs.length} fichier{justificatifs.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {justificatifs.length > 0 && (
        <div className="mt-3 space-y-2">
          {justificatifs.map((piece) => (
            <div key={piece.path} className="flex items-center justify-between gap-3 rounded-lg border border-black/5 bg-white px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-brand-dark">📎 {piece.nom}</p>
                {piece.taille != null && (
                  <p className="mt-0.5 text-[10px] text-brand-dark/40">{(piece.taille / 1024 / 1024).toFixed(2)} Mo</p>
                )}
              </div>
              <button type="button" onClick={() => onRemove(piece.path)} className="shrink-0 text-[11px] font-semibold text-alert-soft hover:underline">
                Retirer
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="justificatifs-dropzone mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-black/15 bg-white/70 p-3.5 hover:border-brand-green">
        <div>
          <p className="justificatifs-title text-sm font-semibold text-brand-dark">
            {uploading ? "Envoi en cours..." : justificatifs.length ? "Ajouter d'autres justificatifs" : "Ajouter un ou plusieurs justificatifs"}
          </p>
          <p className="justificatifs-help mt-0.5 text-[11px] text-brand-dark/45">PDF, JPG, PNG ou WebP, 10 Mo maximum par fichier</p>
        </div>
        <span className="justificatifs-action shrink-0 rounded-lg bg-black/5 px-3 py-2 text-xs font-bold text-brand-dark">
          {uploading ? "Envoi..." : "Choisir"}
        </span>
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {justificatifs.length > 0 && <p className="mt-2 text-xs font-semibold text-brand-green">✓ Document{justificatifs.length > 1 ? "s" : ""} enregistré{justificatifs.length > 1 ? "s" : ""}</p>}
      {error && <p className="mt-2 rounded-lg border border-alert-soft/30 bg-alert-soft/10 px-3 py-2 text-xs font-semibold text-alert-soft">{error}</p>}
    </div>
  );
}
