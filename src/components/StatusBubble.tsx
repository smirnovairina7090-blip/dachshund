import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '../game/store'

export function StatusBubble() {
  const message = useGameStore((state) => state.lastMessage)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={message}
        className="status-bubble"
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6 }}
      >
        {message}
      </motion.div>
    </AnimatePresence>
  )
}
