export function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === "object" && wert !== null;
}

export function istText(wert: unknown): wert is string {
  return typeof wert === "string";
}

export function istZahl(wert: unknown): wert is number {
  return typeof wert === "number" && Number.isFinite(wert);
}

export function istOptionaleZahl(wert: unknown): boolean {
  return wert === null || istZahl(wert);
}

export function istOptionalerText(wert: unknown): boolean {
  return wert === null || wert === undefined || istText(wert);
}
