import { describe, expect, it } from 'vitest'
import {
  istErfassungsId,
  istFreigabeToken,
  istUnterstuetzterBildtyp,
  maximaleBildgroesse,
} from '@logik/clientPruefungen'

describe('Gemeinsame Clientprüfungen', () => {
  it('erkennt ausschliesslich gültige Freigabetoken', () => {
    expect(istFreigabeToken('A'.repeat(32))).toBe(true)
    expect(istFreigabeToken('a_b-c'.repeat(7))).toBe(true)
    expect(istFreigabeToken('A'.repeat(31))).toBe(false)
    expect(istFreigabeToken(`${'A'.repeat(31)}!`)).toBe(false)
  })

  it('erkennt UUIDs mit den bisher zugelassenen Versionen und Varianten', () => {
    expect(istErfassungsId('00000000-0000-4000-8000-000000000001')).toBe(true)
    expect(istErfassungsId('00000000-0000-6000-8000-000000000001')).toBe(false)
    expect(istErfassungsId('keine-uuid')).toBe(false)
  })

  it('erkennt die unterstützten Bildtypen ohne Beachtung der Grossschreibung', () => {
    expect(istUnterstuetzterBildtyp('IMAGE/JPEG')).toBe(true)
    expect(istUnterstuetzterBildtyp('image/tiff')).toBe(true)
    expect(istUnterstuetzterBildtyp('image/webp')).toBe(false)
  })

  it('behält die bestehende Bildgrössengrenze von 15 MiB bei', () => {
    expect(maximaleBildgroesse).toBe(15 * 1024 * 1024)
  })
})
