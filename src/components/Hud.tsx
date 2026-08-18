import { motion } from 'framer-motion'
import { useGameStore } from '../game/store'

export function Hud() {
  const bones = useGameStore((state) => state.economy.bones)
  const coins = useGameStore((state) => state.economy.coins)
  const bond = useGameStore((state) => state.stats.bond)

  return (
    <header className="hud" aria-label="Игровые показатели">
      <motion.div className="hud-pill" layout>
        <span className="hud-label">Косточки</span>
        <strong>{bones}</strong>
      </motion.div>
      <motion.div className="hud-pill hud-pill--coin" layout>
        <span className="hud-label">Монеты</span>
        <strong>{coins}</strong>
      </motion.div>
      <motion.div className="hud-pill hud-pill--bond" layout>
        <span className="hud-label">Связь</span>
        <strong>{bond}%</strong>
      </motion.div>
    </header>
  )
}
