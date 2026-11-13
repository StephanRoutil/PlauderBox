export interface HappyHourProjektKontext {
  id: number;
  nummer: number;
  bezeichnung: string;
}
export interface HappyHourObjektKontext {
  id: number;
  bezeichnung: string;
  adresse: string | null;
  gemeinde: string | null;
}
export interface HappyHourMitarbeiterKontext {
  id: number;
  name: string;
}
export interface HappyHourVerteilerEintrag {
  id: number;
  projektAnsprechpartnerId: number;
  person: string;
  firma: string | null;
  funktion: string | null;
  istTeilnehmer: boolean;
  istCc: boolean;
  istProtokollschreiber: boolean;
}
export interface HappyHourProtokollpunktKontext {
  id: number;
  guid: string;
  protokollpunktArtId?: number;
  projektAnsprechpartnerId?: number | null;
  gruppe: string;
  reihenfolge: number;
  thema: string;
  inhalt: string;
  rechtsverweis: string | null;
}
export interface HappyHourProtokollpunktArtKontext {
  id: number;
  bezeichnung: string;
}
export interface HappyHourProtokollKontext {
  protokollId: number;
  protokollNummer: number;
  thema: string;
  typ: string;
  status: string;
  datum: string;
  ort: string | null;
  projekt: HappyHourProjektKontext;
  objekt: HappyHourObjektKontext | null;
  mitarbeiter: HappyHourMitarbeiterKontext;
  traktanden: string[];
  verteiler: HappyHourVerteilerEintrag[];
  protokollpunkte: HappyHourProtokollpunktKontext[];
  protokollpunktArten?: HappyHourProtokollpunktArtKontext[];
}

export type EintragStatus =
  | "entwurf"
  | "wartet_auf_auswertung"
  | "wird_ausgewertet"
  | "ausgewertet"
  | "fehler";
export type BegehungStatus =
  "aktiv" | "kontrolle" | "lokal_abgeschlossen" | "an_happyhour_uebertragen";
export interface LokaleAudioaufnahme {
  dateiname: string;
  medientyp: string;
  groesse: number;
  dauerSekunden: number;
  audio: Blob;
}
export interface LokalesBild {
  id: string;
  dateiname: string;
  medientyp: string;
  groesse: number;
  erstelltAm: string;
  bild: Blob;
}
export interface BegehungEintrag {
  id: string;
  erstelltAm: string;
  aktualisiertAm: string;
  status: EintragStatus;
  traktandum: string;
  vorbereiteterProtokollpunktId: number | null;
  protokollpunktArtId: number | null;
  projektAnsprechpartnerId: number | null;
  gruppe: string;
  thema: string;
  inhalt: string;
  rechtsverweis: string;
  transkript: string;
  fehler: string;
  audio: LokaleAudioaufnahme | null;
  bilder: LokalesBild[];
  legacyImportId?: string;
}
export interface LokaleBegehung {
  id: string;
  gestartetAm: string;
  aktualisiertAm: string;
  status: BegehungStatus;
  protokoll: HappyHourProtokollKontext;
  freigabeToken?: string;
  uebertragenAm?: string;
  bilderUebertragenAm?: string;
  aktuellerEintragId: string | null;
  eintraege: BegehungEintrag[];
}

export function erstelleBegehung(
  protokoll: HappyHourProtokollKontext,
  neueId: () => string = () => crypto.randomUUID(),
  freigabeToken = "",
): LokaleBegehung {
  const jetzt = new Date().toISOString();
  const vorbereiteteEintraege = protokoll.protokollpunkte.map((punkt) =>
    erstelleVorbereitetenEintrag(punkt, protokoll, jetzt, neueId),
  );
  return {
    id: neueId(),
    gestartetAm: jetzt,
    aktualisiertAm: jetzt,
    status: "aktiv",
    protokoll,
    freigabeToken,
    aktuellerEintragId: vorbereiteteEintraege.at(-1)?.id ?? null,
    eintraege: vorbereiteteEintraege,
  };
}

function erstelleVorbereitetenEintrag(
  punkt: HappyHourProtokollpunktKontext,
  protokoll: HappyHourProtokollKontext,
  jetzt: string,
  neueId: () => string,
): BegehungEintrag {
  return {
    id: punkt.guid || neueId(),
    erstelltAm: jetzt,
    aktualisiertAm: jetzt,
    status: "ausgewertet",
    traktandum: "",
    vorbereiteterProtokollpunktId: punkt.id,
    protokollpunktArtId: punkt.protokollpunktArtId ?? null,
    projektAnsprechpartnerId: normalisiereProjektAnsprechpartnerId(
      protokoll,
      punkt.projektAnsprechpartnerId ?? null,
    ),
    gruppe: punkt.gruppe,
    thema: punkt.thema,
    inhalt: punkt.inhalt,
    rechtsverweis: punkt.rechtsverweis ?? "",
    transkript: "",
    fehler: "",
    audio: null,
    bilder: [],
  };
}

export function fuehreHappyHourKontextZusammen(
  begehung: LokaleBegehung,
  neuerKontext: HappyHourProtokollKontext,
  freigabeToken: string,
  neueId: () => string = () => crypto.randomUUID(),
): LokaleBegehung {
  if (neuerKontext.protokollId !== begehung.protokoll.protokollId)
    throw new Error("falsches_protokoll");

  const jetzt = new Date().toISOString();
  const eintraege = begehung.eintraege.map((eintrag) => ({
    ...eintrag,
    bilder: [...eintrag.bilder],
  }));
  const nachVorbereiteterId = new Map(
    eintraege
      .filter((eintrag) => eintrag.vorbereiteterProtokollpunktId !== null)
      .map((eintrag) => [eintrag.vorbereiteterProtokollpunktId!, eintrag]),
  );
  const nachGuid = new Map(
    eintraege.map((eintrag) => [eintrag.id.toLocaleLowerCase("en-US"), eintrag]),
  );
  const happyHourGuids = new Set(
    neuerKontext.protokollpunkte
      .map((punkt) => punkt.guid.toLocaleLowerCase("en-US"))
      .filter((guid) => guid.length > 0),
  );
  const hatNichtBestaetigteLokaleEintraege = eintraege.some(
    (eintrag) =>
      eintrag.vorbereiteterProtokollpunktId === null &&
      !happyHourGuids.has(eintrag.id.toLocaleLowerCase("en-US")),
  );

  for (const punkt of neuerKontext.protokollpunkte) {
    const vorhanden =
      nachVorbereiteterId.get(punkt.id) ??
      nachGuid.get(punkt.guid.toLocaleLowerCase("en-US"));
    if (vorhanden) {
      vorhanden.vorbereiteterProtokollpunktId = punkt.id;
      continue;
    }
    eintraege.push(
      erstelleVorbereitetenEintrag(punkt, neuerKontext, jetzt, neueId),
    );
  }

  eintraege.forEach((eintrag) =>
    normalisiereEintragProjektAnsprechpartner(eintrag, neuerKontext),
  );
  const hatOffeneLokaleAenderungen =
    begehung.status !== "an_happyhour_uebertragen" ||
    hatNichtBestaetigteLokaleEintraege;
  return {
    ...begehung,
    protokoll: neuerKontext,
    freigabeToken,
    aktualisiertAm: jetzt,
    status:
      hatOffeneLokaleAenderungen &&
      begehung.status === "an_happyhour_uebertragen"
        ? "lokal_abgeschlossen"
        : begehung.status,
    uebertragenAm: hatOffeneLokaleAenderungen
      ? undefined
      : begehung.uebertragenAm,
    bilderUebertragenAm: hatOffeneLokaleAenderungen
      ? undefined
      : begehung.bilderUebertragenAm,
    aktuellerEintragId:
      eintraege.some((eintrag) => eintrag.id === begehung.aktuellerEintragId)
        ? begehung.aktuellerEintragId
        : (eintraege.at(-1)?.id ?? null),
    eintraege,
  };
}

export function erstelleEintrag(
  neueId: () => string = () => crypto.randomUUID(),
  projektAnsprechpartnerId: number | null = null,
): BegehungEintrag {
  const jetzt = new Date().toISOString();
  return {
    id: neueId(),
    erstelltAm: jetzt,
    aktualisiertAm: jetzt,
    status: "entwurf",
    traktandum: "",
    vorbereiteterProtokollpunktId: null,
    protokollpunktArtId: null,
    projektAnsprechpartnerId,
    gruppe: "",
    thema: "",
    inhalt: "",
    rechtsverweis: "",
    transkript: "",
    fehler: "",
    audio: null,
    bilder: [],
  };
}

export function erstelleEintragFuerProtokoll(
  protokoll: HappyHourProtokollKontext,
  neueId: () => string = () => crypto.randomUUID(),
  protokollpunktArtId: number | null = null,
): BegehungEintrag {
  const eintrag = erstelleEintrag(
    neueId,
    normalisiereProjektAnsprechpartnerId(protokoll, null),
  );
  eintrag.protokollpunktArtId = protokoll.protokollpunktArten?.some(
    (art) => art.id === protokollpunktArtId,
  )
    ? protokollpunktArtId
    : null;
  return eintrag;
}

export function ermittleStandardProtokollpunktArtId(
  begehung: LokaleBegehung,
): number | null {
  const gueltigeArten = new Set(
    (begehung.protokoll.protokollpunktArten ?? []).map((art) => art.id),
  );
  return (
    [...begehung.eintraege]
      .reverse()
      .find(
        (eintrag) =>
          eintrag.vorbereiteterProtokollpunktId === null &&
          eintrag.protokollpunktArtId !== null &&
          gueltigeArten.has(eintrag.protokollpunktArtId),
      )?.protokollpunktArtId ?? null
  );
}

export function eindeutigeVerteileroptionen(
  protokoll: HappyHourProtokollKontext,
): HappyHourVerteilerEintrag[] {
  const bekannteIds = new Set<number>();
  return protokoll.verteiler.filter((person) => {
    if (
      !Number.isInteger(person.projektAnsprechpartnerId) ||
      person.projektAnsprechpartnerId <= 0 ||
      bekannteIds.has(person.projektAnsprechpartnerId)
    )
      return false;
    bekannteIds.add(person.projektAnsprechpartnerId);
    return true;
  });
}

export type BegehungsstartPruefung =
  | Readonly<{ gueltig: true }>
  | Readonly<{ gueltig: false; meldung: string; probleme: readonly string[] }>;

export function pruefeBegehungsstart(
  protokoll: HappyHourProtokollKontext,
): BegehungsstartPruefung {
  const probleme: string[] = [];
  if (eindeutigeVerteileroptionen(protokoll).length === 0) {
    probleme.push("Verteiler fehlt: In HappyHour muss mindestens eine gültige Person im Verteiler erfasst sein.");
  }
  const gueltigeProtokollpunktarten = (protokoll.protokollpunktArten ?? []).filter(
    (art) => Number.isInteger(art.id) && art.id > 0 && art.bezeichnung.trim().length > 0,
  );
  if (gueltigeProtokollpunktarten.length === 0) {
    probleme.push("Art des Protokollpunkts fehlt: In HappyHour muss mindestens eine Protokollpunktart vorhanden sein.");
  }
  if (probleme.length === 0) return { gueltig: true };
  return {
    gueltig: false,
    meldung:
      "Die Begehung kann noch nicht gestartet werden. Bitte die fehlenden Angaben in HappyHour ergänzen, die PlauderBox-Freigabe aktualisieren und den QR-Code erneut scannen.",
    probleme,
  };
}

export function normalisiereProjektAnsprechpartnerId(
  protokoll: HappyHourProtokollKontext,
  kandidat: number | null | undefined,
): number | null {
  const gueltigeIds = new Set(
    eindeutigeVerteileroptionen(protokoll).map(
      (person) => person.projektAnsprechpartnerId,
    ),
  );
  if (
    typeof kandidat === "number" &&
    Number.isInteger(kandidat) &&
    kandidat > 0 &&
    gueltigeIds.has(kandidat)
  )
    return kandidat;
  const protokollschreiberIds = new Set(
    protokoll.verteiler
      .filter(
        (person) =>
          person.istProtokollschreiber &&
          gueltigeIds.has(person.projektAnsprechpartnerId),
      )
      .map((person) => person.projektAnsprechpartnerId),
  );
  return protokollschreiberIds.size === 1
    ? [...protokollschreiberIds][0]!
    : null;
}

export function ermittleStandardProjektAnsprechpartnerId(
  protokoll: HappyHourProtokollKontext,
): number | null {
  return normalisiereProjektAnsprechpartnerId(protokoll, null);
}

export function normalisiereEintragProjektAnsprechpartner(
  eintrag: BegehungEintrag,
  protokoll: HappyHourProtokollKontext,
): boolean {
  const vorbereiteterPunkt = protokoll.protokollpunkte.find(
    (punkt) => punkt.id === eintrag.vorbereiteterProtokollpunktId,
  );
  const kandidat =
    typeof eintrag.projektAnsprechpartnerId === "number"
      ? eintrag.projektAnsprechpartnerId
      : (vorbereiteterPunkt?.projektAnsprechpartnerId ?? null);
  const normalisiert = normalisiereProjektAnsprechpartnerId(
    protokoll,
    kandidat,
  );
  if (eintrag.projektAnsprechpartnerId === normalisiert) return false;
  eintrag.projektAnsprechpartnerId = normalisiert;
  return true;
}

export function gruppiereEintraege(
  eintraege: BegehungEintrag[],
): Array<{ gruppe: string; eintraege: BegehungEintrag[] }> {
  const gruppen = new Map<string, BegehungEintrag[]>();
  for (const eintrag of eintraege) {
    const gruppe = eintrag.gruppe.trim() || "Noch ohne Gruppe";
    const liste = gruppen.get(gruppe) ?? [];
    liste.push(eintrag);
    gruppen.set(gruppe, liste);
  }
  return [...gruppen.entries()]
    .sort(([links], [rechts]) => links.localeCompare(rechts, "de-CH"))
    .map(([gruppe, gruppenEintraege]) => ({
      gruppe,
      eintraege: gruppenEintraege,
    }));
}

export function istEintragUnvollstaendig(eintrag: BegehungEintrag): boolean {
  return (
    !eintrag.protokollpunktArtId ||
    !eintrag.projektAnsprechpartnerId ||
    !eintrag.gruppe.trim() ||
    !eintrag.thema.trim() ||
    !eintrag.inhalt.trim()
  );
}
export function naechsterAusstehenderEintrag(
  begehung: LokaleBegehung,
): BegehungEintrag | null {
  return (
    begehung.eintraege.find(
      (eintrag) =>
        eintrag.status === "wartet_auf_auswertung" ||
        eintrag.status === "fehler",
    ) ?? null
  );
}
export function zaehleAusstehendeAudioaufnahmen(
  begehung: LokaleBegehung,
): number {
  return begehung.eintraege.filter(
    (eintrag) =>
      Boolean(eintrag.audio) &&
      ["wartet_auf_auswertung", "wird_ausgewertet", "fehler"].includes(
        eintrag.status,
      ),
  ).length;
}
export function bereiteWiederanlaufVor(begehung: LokaleBegehung): boolean {
  let geaendert = false;
  for (const eintrag of begehung.eintraege) {
    if (eintrag.status === "wird_ausgewertet") {
      eintrag.status = "wartet_auf_auswertung";
      geaendert = true;
    }
    if (normalisiereEintragProjektAnsprechpartner(eintrag, begehung.protokoll))
      geaendert = true;
  }
  if (
    begehung.status !== "an_happyhour_uebertragen" &&
    (begehung.uebertragenAm || begehung.bilderUebertragenAm)
  ) {
    begehung.uebertragenAm = undefined;
    begehung.bilderUebertragenAm = undefined;
    geaendert = true;
  }
  return geaendert;
}
export function uebernehmeAuswertung(
  eintrag: BegehungEintrag,
  auswertung: {
    text: string;
    gruppe?: string;
    thema?: string;
    inhalt?: string;
    rechtsverweis?: string;
  },
): void {
  eintrag.transkript = auswertung.text;
  if (!eintrag.gruppe.trim()) eintrag.gruppe = auswertung.gruppe?.trim() ?? "";
  if (!eintrag.thema.trim()) eintrag.thema = auswertung.thema?.trim() ?? "";
  if (!eintrag.inhalt.trim()) eintrag.inhalt = auswertung.inhalt?.trim() ?? "";
  if (!eintrag.rechtsverweis.trim())
    eintrag.rechtsverweis = auswertung.rechtsverweis?.trim() ?? "";
  eintrag.status = "ausgewertet";
  eintrag.fehler = "";
  eintrag.audio = null;
  eintrag.aktualisiertAm = new Date().toISOString();
}
export async function verarbeiteWarteschlange(
  begehung: LokaleBegehung,
  istOnline: () => boolean,
  auswerten: (eintrag: BegehungEintrag) => Promise<boolean>,
): Promise<void> {
  let eintrag = naechsterAusstehenderEintrag(begehung);
  while (eintrag && istOnline()) {
    if (!(await auswerten(eintrag))) return;
    eintrag = naechsterAusstehenderEintrag(begehung);
  }
}
