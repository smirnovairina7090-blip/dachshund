import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useGameStore } from '../game/store'

export function DayPanel() {
  const dayMode = useGameStore((state) => state.dayMode)
  const setDayMode = useGameStore((state) => state.setDayMode)
  const tasks = useGameStore((state) => state.tasks)
  const finishDay = useGameStore((state) => state.finishDay)
  const [notice, setNotice] = useState('')
  const done = tasks.filter((task) => task.done).length

  const completeDay = () => {
    const success = finishDay()
    setNotice(success ? 'День сохранён. +1 монетка' : 'Мотя ещё ждёт пару дел сегодня.')
  }

  return (
    <aside className="day-panel">
      <div className="mode-switch" aria-label="Режим дня">
        <button className={dayMode === 'weekday' ? 'is-active' : ''} onClick={() => setDayMode('weekday')}>Будни</button>
        <button className={dayMode === 'weekend' ? 'is-active' : ''} onClick={() => setDayMode('weekend')}>Выходной</button>
      </div>

      <div className="task-summary">
        <div>
          <span>Сегодня</span>
          <strong>{done}/{tasks.length}</strong>
        </div>
        <div className="task-dots" aria-label={`${done} из ${tasks.length} задач выполнено`}>
          {tasks.map((task) => <i key={task.id} className={task.done ? 'done' : ''} />)}
        </div>
      </div>

      <button className="finish-day" onClick={completeDay}>Завершить день</button>
      <AnimatePresence mode="wait">
        {notice && (
          <motion.p
            key={notice}
            className="day-notice"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >{notice}</motion.p>
        )}
      </AnimatePresence>
    </aside>
  )
}
