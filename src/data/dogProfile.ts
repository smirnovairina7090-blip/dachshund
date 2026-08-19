import type { DogBreedId } from './dogBreeds'

export const DOG_PROFILE_STORAGE_KEY = 'pawquest-dog-profile-v1'
export const LEGACY_GAME_STORAGE_KEY = 'motya-tamagotchi-v2'

export type DogSpriteVariant = 'classic'

export type DogProfile = {
  name: string
  breedId: DogBreedId
  spriteVariant: DogSpriteVariant
  createdAt: string
  updatedAt: string
}

export function normalizeDogName(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 18)
}

export function isDogBreedId(value: unknown): value is DogBreedId {
  return value === 'dachshund' || value === 'jack-russell' || value === 'labrador'
}

export function parseDogProfile(raw: string | null): DogProfile | null {
  if (!raw) return null

  try {
    const value = JSON.parse(raw) as Partial<DogProfile>
    const name = normalizeDogName(typeof value.name === 'string' ? value.name : '')

    if (!name || !isDogBreedId(value.breedId)) return null

    const now = new Date().toISOString()
    return {
      name,
      breedId: value.breedId,
      spriteVariant: 'classic',
      createdAt: typeof value.createdAt === 'string' ? value.createdAt : now,
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : now,
    }
  } catch {
    return null
  }
}

export function makeDogProfile(name: string, breedId: DogBreedId, previous?: DogProfile | null): DogProfile {
  const normalizedName = normalizeDogName(name)
  if (!normalizedName) throw new Error('Dog name is required')

  const now = new Date().toISOString()
  return {
    name: normalizedName,
    breedId,
    spriteVariant: 'classic',
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  }
}

export function syncLegacyGameName(storage: Pick<Storage, 'getItem' | 'setItem'>, name: string) {
  try {
    const raw = storage.getItem(LEGACY_GAME_STORAGE_KEY)
    const previous = raw ? JSON.parse(raw) as Record<string, unknown> : {}
    storage.setItem(LEGACY_GAME_STORAGE_KEY, JSON.stringify({ ...previous, name }))
  } catch {
    storage.setItem(LEGACY_GAME_STORAGE_KEY, JSON.stringify({ name }))
  }
}
