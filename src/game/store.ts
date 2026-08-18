import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { initialGameState, makeTasks } from './defaults'
import { indexedDbStorage } from './persistence'
import type { DogMood, GameState, InteractionKind } from './types'

const clamp = (value: number) => Math.max(0, Math.min(100, value))

type GameActions = {
  interact: (kind: InteractionKind) => void
  setDayMode: (mode: GameState['dayMode']) => void
  finishDay: () => boolean
}

type Store = GameState & GameActions

const interactionConfig: Record<InteractionKind, {
  message: string
  mood: DogMood
  stats: Partial<GameState['stats']>
}> = {
  pet: {
    message: 'Мотя прижалась поближе. Контакт засчитан.',
    mood: 'happy',
    stats: { mood: 7, bond: 3 },
  },
  feed: {
    message: 'Миска опустела подозрительно быстро.',
    mood: 'happy',
    stats: { satiety: 24, mood: 3 },
  },
  play: {
    message: 'Мяч официально объявлен самой важной вещью в комнате.',
    mood: 'excited',
    stats: { mood: 14, energy: -9, bond: 4 },
  },
  walk: {
    message: 'Поводок найден. Мотя уже мысленно за дверью.',
    mood: 'excited',
    stats: { mood: 16, energy: -14, satiety: -4, bond: 5 },
  },
  rest: {
    message: 'Мотя свернулась на лежанке и явно одобряет этот план.',
    mood: 'sleepy',
    stats: { energy: 18, mood: 4 },
  },
}

export const useGameStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialGameState,
      interact: (kind) => {
        const config = interactionConfig[kind]
        const current = get()
        const taskIndex = current.tasks.findIndex((task) => task.kind === kind && !task.done)
        const reward = taskIndex >= 0 ? current.tasks[taskIndex].rewardBones : 2
        const nextTasks = current.tasks.map((task, index) =>
          index === taskIndex ? { ...task, done: true } : task,
        )

        set({
          dogMood: config.mood,
          stats: {
            mood: clamp(current.stats.mood + (config.stats.mood ?? 0)),
            energy: clamp(current.stats.energy + (config.stats.energy ?? 0)),
            satiety: clamp(current.stats.satiety + (config.stats.satiety ?? 0)),
            bond: clamp(current.stats.bond + (config.stats.bond ?? 0)),
          },
          economy: { ...current.economy, bones: current.economy.bones + reward },
          tasks: nextTasks,
          lastMessage: `${config.message} +${reward} косточек`,
          lastUpdatedAt: new Date().toISOString(),
        })
      },
      setDayMode: (mode) => {
        set({
          dayMode: mode,
          tasks: makeTasks(mode),
          lastMessage: mode === 'weekday'
            ? 'Сегодня спокойный будний режим.'
            : 'Выходной включён. Мотя рассчитывает на приключения.',
          lastUpdatedAt: new Date().toISOString(),
        })
      },
      finishDay: () => {
        const current = get()
        const complete = current.tasks.every((task) => task.done)
        if (!complete) return false

        set({
          economy: {
            bones: current.economy.bones + 15,
            coins: current.economy.coins + 1,
          },
          completedDays: current.completedDays + 1,
          dogMood: 'sleepy',
          stats: { ...current.stats, bond: clamp(current.stats.bond + 4) },
          lastMessage: 'День закрыт. Мотя получила монетку и уже устраивается спать.',
          tasks: makeTasks(current.dayMode),
          lastUpdatedAt: new Date().toISOString(),
        })
        return true
      },
    }),
    {
      name: 'game-state',
      storage: createJSONStorage(() => indexedDbStorage),
    },
  ),
)
