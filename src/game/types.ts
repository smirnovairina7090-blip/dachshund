export type DayMode = 'weekday' | 'weekend'
export type DogMood = 'calm' | 'happy' | 'excited' | 'sleepy' | 'hungry'
export type InteractionKind = 'pet' | 'feed' | 'play' | 'walk' | 'rest'

export type DogStats = {
  mood: number
  energy: number
  satiety: number
  bond: number
}

export type Economy = {
  bones: number
  coins: number
}

export type DailyTask = {
  id: string
  title: string
  kind: InteractionKind
  rewardBones: number
  done: boolean
}

export type GameState = {
  dayMode: DayMode
  dogMood: DogMood
  stats: DogStats
  economy: Economy
  tasks: DailyTask[]
  lastMessage: string
  completedDays: number
  lastUpdatedAt: string
}
