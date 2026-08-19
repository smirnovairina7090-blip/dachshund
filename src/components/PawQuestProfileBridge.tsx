import { useEffect, useState } from 'react'
import type { DogBreed } from '../data/dogBreeds'
import type { DogProfile } from '../data/dogProfile'
import PawQuestProfileCenter from './PawQuestProfileCenter'
import '../styles/pawquest-secondary.css'
import '../styles/pawquest-bridge.css'

type Page = 'breed' | 'achievements' | 'diary' | 'health' | null

type Props = { profile: DogProfile; breed: DogBreed }

type GameSnapshot = {
  coins: number
  xp: number
  streak: number
  doneCount: number
  allDone: boolean
  ownedOutfitCount: number
}

const GAME_KEY = 'pawquest-polished-game-v1'
const BASE = import.meta.env.BASE_URL

function readSnapshot(): GameSnapshot {
  try {
    const raw = localStorage.getItem(GAME_KEY)
    const value = raw ? JSON.parse(raw) as Record<string, unknown> : {}
    const completed = (value.completed ?? {}) as Record<string, boolean>
    const doneCount = Object.values(completed).filter(Boolean).length
    const owned = Array.isArray(value.ownedOutfits) ? value.ownedOutfits : ['none']
    return {
      coins: typeof value.coins === 'number' ? value.coins : 124,
      xp: typeof value.xp === 'number' ? value.xp : 40,
      streak: typeof value.streak === 'number' ? value.streak : 1,
      doneCount,
      allDone: doneCount >= 6,
      ownedOutfitCount: owned.length,
    }
  } catch {
    return { coins: 124, xp: 40, streak: 1, doneCount: 0, allDone: false, ownedOutfitCount: 1 }
  }
}

export default function PawQuestProfileBridge({ profile, breed }: Props) {
  const [page, setPage] = useState<Page>(null)
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => readSnapshot())

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      const button = target?.closest('.pq-profile-links button') as HTMLButtonElement | null
      if (!button) return

      const label = button.textContent ?? ''
      let next: Page = null
      if (label.includes('О породе')) next = 'breed'
      else if (label.includes('Здоровье')) next = 'health'
      else if (label.includes('Фото-дневник')) next = 'diary'
      else if (label.includes('Достижения')) next = 'achievements'
      if (!next) return

      event.preventDefault()
      event.stopPropagation()
      setSnapshot(readSnapshot())
      setPage(next)
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  if (!page) return null

  return (
    <div className="pq-secondary-overlay" role="dialog" aria-modal="true">
      <PawQuestProfileCenter
        page={page}
        profile={profile}
        breed={breed}
        portrait={`${BASE}assets/pawquest/${profile.breedId}-portrait.webp`}
        level={Math.floor(snapshot.xp / 100) + 1}
        coins={snapshot.coins}
        streak={snapshot.streak}
        doneCount={snapshot.doneCount}
        allDone={snapshot.allDone}
        ownedOutfitCount={snapshot.ownedOutfitCount}
        onClose={() => setPage(null)}
      />
    </div>
  )
}
