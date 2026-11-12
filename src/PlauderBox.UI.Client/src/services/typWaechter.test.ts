import { describe, expect, it } from 'vitest'
import { istObjekt, istOptionaleZahl, istOptionalerText, istText, istZahl } from '@logik/typWaechter'

describe('Typwächter', () => {
  it('unterscheidet Objekte, Texte, endliche Zahlen und optionale Werte', () => {
    expect(istObjekt({})).toBe(true)
    expect(istObjekt(null)).toBe(false)
    expect(istText('Text')).toBe(true)
    expect(istText(1)).toBe(false)
    expect(istZahl(1)).toBe(true)
    expect(istZahl(Number.NaN)).toBe(false)
    expect(istOptionaleZahl(null)).toBe(true)
    expect(istOptionaleZahl('1')).toBe(false)
    expect(istOptionalerText(undefined)).toBe(true)
    expect(istOptionalerText(1)).toBe(false)
  })
})
