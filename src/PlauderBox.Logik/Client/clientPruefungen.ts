const freigabeTokenMuster = /^[A-Za-z0-9_-]{32,128}$/
const erfassungsIdMuster = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const unterstuetzteBildtypen = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/tiff',
  'image/tif',
])

const unterstuetzteBildtypenMenge = new Set<string>(unterstuetzteBildtypen)

export const maximaleBildgroesse = 15 * 1024 * 1024

export function istFreigabeToken(wert: string): boolean {
  return freigabeTokenMuster.test(wert)
}

export function istErfassungsId(wert: string): boolean {
  return erfassungsIdMuster.test(wert)
}

export function istUnterstuetzterBildtyp(wert: string): boolean {
  return unterstuetzteBildtypenMenge.has(wert.toLocaleLowerCase('en-US'))
}
