import { describe, expect, it } from 'vitest'
import {
  LEGACY_GAME_STORAGE_KEY,
  makeDogProfile,
  normalizeDogName,
  parseDogProfile,
  syncLegacyGameName,
} from '../data/dogProfile'

describe('dog profile', () => {
  it('normalizes dog names', () => {
    expect(normalizeDogName('  Мотя   Супер  ')).toBe('Мотя Супер')
  })

  it('creates a valid breed profile', () => {
    const profile = makeDogProfile('Рэй', 'jack-russell')
    expect(profile.name).toBe('Рэй')
    expect(profile.breedId).toBe('jack-russell')
    expect(profile.spriteVariant).toBe('classic')
  })

  it('rejects an unknown breed from storage', () => {
    const raw = JSON.stringify({ name: 'Боб', breedId: 'unknown' })
    expect(parseDogProfile(raw)).toBeNull()
  })

  it('syncs the dog name into the legacy game save', () => {
    const data = new Map<string, string>([[LEGACY_GAME_STORAGE_KEY, JSON.stringify({ bones: 12, name: 'Мотя' })]])
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    }

    syncLegacyGameName(storage, 'Луна')
    expect(JSON.parse(data.get(LEGACY_GAME_STORAGE_KEY)!)).toEqual({ bones: 12, name: 'Луна' })
  })
})
