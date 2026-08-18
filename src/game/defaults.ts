import type { DailyTask, DayMode, GameState } from './types'

export const makeTasks = (mode: DayMode): DailyTask[] => {
  const common: DailyTask[] = [
    { id: 'feed', title: 'Позавтракать', kind: 'feed', rewardBones: 8, done: false },
    { id: 'walk', title: 'Сходить гулять', kind: 'walk', rewardBones: 12, done: false },
    { id: 'play', title: 'Поиграть вместе', kind: 'play', rewardBones: 8, done: false },
  ]

  if (mode === 'weekend') {
    common.push({ id: 'rest', title: 'Устроить уютный отдых', kind: 'rest', rewardBones: 10, done: false })
  }

  return common
}

export const initialGameState: GameState = {
  dayMode: 'weekday',
  dogMood: 'calm',
  stats: { mood: 72, energy: 68, satiety: 64, bond: 18 },
  economy: { bones: 24, coins: 2 },
  tasks: makeTasks('weekday'),
  lastMessage: 'Мотя услышала тебя и уже смотрит в твою сторону.',
  completedDays: 0,
  lastUpdatedAt: new Date().toISOString(),
}
