import { describe, expect, it } from 'vitest'
import { initialGameState, makeTasks } from '../game/defaults'

describe('daily plan', () => {
  it('adds an extra rest task on weekends', () => {
    expect(makeTasks('weekend')).toHaveLength(makeTasks('weekday').length + 1)
  })

  it('starts with a playable economy', () => {
    expect(initialGameState.economy.bones).toBeGreaterThan(0)
    expect(initialGameState.stats.mood).toBeGreaterThanOrEqual(0)
    expect(initialGameState.stats.mood).toBeLessThanOrEqual(100)
  })
})
