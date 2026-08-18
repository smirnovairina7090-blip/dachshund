import { motion, useMotionValue, useSpring } from 'framer-motion'
import type { MouseEvent } from 'react'
import { DayPanel } from '../components/DayPanel'
import { Hud } from '../components/Hud'
import { StatusBubble } from '../components/StatusBubble'
import { useGameStore } from '../game/store'
import type { InteractionKind } from '../game/types'

const hotspots: Array<{
  kind: InteractionKind
  label: string
  className: string
}> = [
  { kind: 'walk', label: 'Пойти гулять', className: 'hotspot hotspot--door' },
  { kind: 'feed', label: 'Покормить Мотю', className: 'hotspot hotspot--bowl' },
  { kind: 'play', label: 'Поиграть с мячом', className: 'hotspot hotspot--ball' },
  { kind: 'rest', label: 'Отдохнуть на лежанке', className: 'hotspot hotspot--bed' },
]

export function HomeScene() {
  const interact = useGameStore((state) => state.interact)
  const mood = useGameStore((state) => state.dogMood)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const cameraX = useSpring(x, { stiffness: 45, damping: 18 })
  const cameraY = useSpring(y, { stiffness: 45, damping: 18 })

  const handlePointer = (event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    x.set(((event.clientX - rect.left) / rect.width - 0.5) * -12)
    y.set(((event.clientY - rect.top) / rect.height - 0.5) * -7)
  }

  const motyaAnimation = mood === 'excited'
    ? { y: [0, -14, -5, 0], rotate: [0, 1.5, -1.5, 0] }
    : mood === 'happy'
      ? { y: [0, -10, 0], rotate: [0, -1, 0] }
      : { y: 0, rotate: 0 }

  return (
    <main className="game-shell">
      <section className="room-scene" onMouseMove={handlePointer} onMouseLeave={() => { x.set(0); y.set(0) }}>
        <motion.div className="room-backdrop" style={{ x: cameraX, y: cameraY, scale: 1.035 }} />
        <div className="sun-glow" />
        <div className="dust dust--one" />
        <div className="dust dust--two" />
        <div className="dust dust--three" />

        <Hud />
        <DayPanel />
        <StatusBubble />

        <motion.button
          className={`motya motya--${mood}`}
          type="button"
          aria-label="Погладить Мотю"
          onClick={() => interact('pet')}
          style={{ x: '-50%' }}
          animate={motyaAnimation}
          transition={{ duration: mood === 'excited' ? 0.8 : 0.6, ease: 'easeOut' }}
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.015 }}
        >
          <img src="/assets/motya/dev-motya.svg" alt="Черновой игровой образ Моти" />
          <span className="motya-touch">Погладить</span>
        </motion.button>

        {hotspots.map((hotspot) => (
          <button
            key={hotspot.kind}
            type="button"
            className={hotspot.className}
            aria-label={hotspot.label}
            onClick={() => interact(hotspot.kind)}
          >
            <span>{hotspot.label}</span>
          </button>
        ))}

        <div className="scene-caption">
          <span>Дом Моти</span>
          <strong>{mood === 'sleepy' ? 'Пора замедлиться' : mood === 'excited' ? 'Мотя на старте' : 'Уютный день'}</strong>
        </div>
      </section>
    </main>
  )
}
