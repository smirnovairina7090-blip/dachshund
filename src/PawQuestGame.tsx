import { useEffect, useMemo, useState } from 'react'
import type { DogBreed } from './data/dogBreeds'
import type { DogProfile } from './data/dogProfile'
import './styles/pawquest-game.css'

type Tab = 'home' | 'tasks' | 'map' | 'shop' | 'profile'
type StatKey = 'happiness' | 'satiety' | 'energy' | 'health'
type TaskId = 'feed' | 'walk' | 'teeth' | 'play' | 'brush' | 'water'

type PawQuestGameProps = {
  profile: DogProfile
  breed: DogBreed
  onEditProfile: () => void
}

type GameState = {
  stats: Record<StatKey, number>
  coins: number
  xp: number
  streak: number
  completed: Record<TaskId, boolean>
  claimedChest: boolean
  ownedOutfits: string[]
  selectedOutfit: string
}

type TaskDefinition = {
  id: TaskId
  icon: string
  title: string
  subtitle: string
  reward: number
  xp: number
  stat: StatKey
  delta: number
}

type Outfit = {
  id: string
  icon: string
  name: string
  price: number
  level: number
}

const BASE = import.meta.env.BASE_URL
const GAME_KEY = 'pawquest-polished-game-v1'

const taskDefinitions: TaskDefinition[] = [
  { id: 'feed', icon: '🥣', title: 'Покормить', subtitle: 'Отметить основной приём пищи', reward: 18, xp: 20, stat: 'satiety', delta: 18 },
  { id: 'walk', icon: '🦮', title: 'Прогуляться', subtitle: 'Спокойная прогулка и новые запахи', reward: 22, xp: 25, stat: 'happiness', delta: 14 },
  { id: 'teeth', icon: '🪥', title: 'Почистить зубы', subtitle: 'Небольшой шаг для здоровья', reward: 15, xp: 18, stat: 'health', delta: 10 },
  { id: 'play', icon: '🎾', title: 'Поиграть', subtitle: 'Короткая игровая сессия', reward: 16, xp: 18, stat: 'happiness', delta: 16 },
  { id: 'brush', icon: '🧼', title: 'Уход за шерстью', subtitle: 'Расчёсывание или осмотр лап', reward: 14, xp: 16, stat: 'health', delta: 7 },
  { id: 'water', icon: '💧', title: 'Свежая вода', subtitle: 'Проверить и обновить миску', reward: 10, xp: 12, stat: 'satiety', delta: 5 },
]

const outfits: Outfit[] = [
  { id: 'none', icon: '🐾', name: 'Без костюма', price: 0, level: 1 },
  { id: 'bandana', icon: '🧣', name: 'Бирюзовая бандана', price: 90, level: 1 },
  { id: 'rain', icon: '🧥', name: 'Дождевик', price: 150, level: 2 },
  { id: 'glasses', icon: '🕶️', name: 'Очки исследователя', price: 210, level: 3 },
  { id: 'flower', icon: '🌼', name: 'Цветочный венок', price: 260, level: 4 },
  { id: 'crown', icon: '👑', name: 'Корона чемпиона', price: 360, level: 5 },
]

const navItems: Array<{ id: Tab; icon: string; label: string }> = [
  { id: 'home', icon: '⌂', label: 'Дом' },
  { id: 'tasks', icon: '✓', label: 'Задания' },
  { id: 'map', icon: '⌖', label: 'Карта' },
  { id: 'shop', icon: '♜', label: 'Магазин' },
  { id: 'profile', icon: '●', label: 'Профиль' },
]

const statMeta: Record<StatKey, { icon: string; label: string }> = {
  happiness: { icon: '💛', label: 'Счастье' },
  satiety: { icon: '🥣', label: 'Сытость' },
  energy: { icon: '⚡', label: 'Энергия' },
  health: { icon: '✚', label: 'Здоровье' },
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function initialGameState(): GameState {
  return {
    stats: { happiness: 82, satiety: 76, energy: 71, health: 88 },
    coins: 124,
    xp: 40,
    streak: 3,
    completed: { feed: false, walk: false, teeth: false, play: false, brush: false, water: false },
    claimedChest: false,
    ownedOutfits: ['none'],
    selectedOutfit: 'none',
  }
}

function loadGameState(): GameState {
  const fresh = initialGameState()
  try {
    const raw = localStorage.getItem(GAME_KEY)
    if (!raw) return fresh
    const parsed = JSON.parse(raw) as Partial<GameState>
    return {
      ...fresh,
      ...parsed,
      stats: { ...fresh.stats, ...(parsed.stats ?? {}) },
      completed: { ...fresh.completed, ...(parsed.completed ?? {}) },
      ownedOutfits: parsed.ownedOutfits ?? fresh.ownedOutfits,
    }
  } catch {
    return fresh
  }
}

function dogPortrait(breedId: DogProfile['breedId']) {
  return `${BASE}assets/pawquest/${breedId}-portrait.webp`
}

export default function PawQuestGame({ profile, breed, onEditProfile }: PawQuestGameProps) {
  const [tab, setTab] = useState<Tab>('home')
  const [state, setState] = useState<GameState>(() => loadGameState())
  const [toast, setToast] = useState('')
  const [selectedMapStop, setSelectedMapStop] = useState('park')

  const level = Math.floor(state.xp / 100) + 1
  const levelProgress = state.xp % 100
  const doneCount = Object.values(state.completed).filter(Boolean).length
  const selectedOutfit = outfits.find((item) => item.id === state.selectedOutfit) ?? outfits[0]
  const allDone = doneCount === taskDefinitions.length

  const greeting = useMemo(() => {
    if (state.stats.energy < 30) return 'Кажется, сегодня нужен спокойный режим и хороший отдых.'
    if (state.stats.satiety < 35) return 'Миска подозрительно давно не появлялась в центре внимания.'
    if (allDone) return 'Идеальный день заботы. Можно гордиться вашей командой.'
    return `${breed.subtitle}. Сегодня у вас ещё есть маленькие приключения.`
  }, [allDone, breed.subtitle, state.stats.energy, state.stats.satiety])

  useEffect(() => {
    localStorage.setItem(GAME_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  function completeTask(task: TaskDefinition) {
    if (state.completed[task.id]) {
      setToast('Это дело уже отмечено на сегодня ✓')
      return
    }

    setState((previous) => ({
      ...previous,
      coins: previous.coins + task.reward,
      xp: previous.xp + task.xp,
      completed: { ...previous.completed, [task.id]: true },
      stats: { ...previous.stats, [task.stat]: clamp(previous.stats[task.stat] + task.delta) },
    }))
    setToast(`+${task.reward} монет · +${task.xp} XP`)
  }

  function claimChest() {
    if (!allDone || state.claimedChest) return
    setState((previous) => ({ ...previous, claimedChest: true, coins: previous.coins + 120, xp: previous.xp + 80 }))
    setToast('Дневной сундук открыт: +120 монет · +80 XP')
  }

  function buyOutfit(item: Outfit) {
    if (level < item.level) {
      setToast(`Откроется на ${item.level} уровне`)
      return
    }

    if (state.ownedOutfits.includes(item.id)) {
      setState((previous) => ({ ...previous, selectedOutfit: item.id }))
      setToast(item.id === 'none' ? 'Костюм снят' : `${item.name} надет`)
      return
    }

    if (state.coins < item.price) {
      setToast('Пока не хватает монет')
      return
    }

    setState((previous) => ({
      ...previous,
      coins: previous.coins - item.price,
      ownedOutfits: [...previous.ownedOutfits, item.id],
      selectedOutfit: item.id,
    }))
    setToast(`${item.name} теперь в коллекции`)
  }

  function renderDog(className = '') {
    return (
      <div className={`pq-dog-visual ${className}`}>
        <img src={dogPortrait(profile.breedId)} alt={`${breed.name} ${profile.name}`} />
        {selectedOutfit.id !== 'none' && <span className={`pq-outfit pq-outfit-${selectedOutfit.id}`}>{selectedOutfit.icon}</span>}
      </div>
    )
  }

  return (
    <div className="pq-shell">
      <header className="pq-topbar">
        <button className="pq-profile-button" type="button" onClick={() => setTab('profile')}>
          <img src={dogPortrait(profile.breedId)} alt="" />
          <span><b>{profile.name}</b><small>{breed.name} · уровень {level}</small></span>
        </button>
        <div className="pq-top-resources">
          <div><span>🔥</span><b>{state.streak}</b></div>
          <div className="coin"><span>●</span><b>{state.coins}</b></div>
        </div>
      </header>

      <main className="pq-main">
        {tab === 'home' && (
          <section className="pq-screen pq-home-screen">
            <div className="pq-home-hero">
              <div className="pq-home-sky" />
              <div className="pq-room-window" />
              <div className="pq-room-plant">🌿</div>
              <div className="pq-room-bed">☁️</div>
              <div className="pq-speech">{greeting}</div>
              {renderDog('pq-home-dog')}
              <div className="pq-room-toy">🎾</div>
              <div className="pq-room-bowl">🥣</div>
              <button className="pq-bond-chip" type="button" onClick={() => completeTask(taskDefinitions[3])}>
                <span>💞</span><b>{Math.min(999, 40 + state.xp)}</b><small>связь</small>
              </button>
            </div>

            <div className="pq-stat-strip">
              {(Object.keys(statMeta) as StatKey[]).map((key) => (
                <div className="pq-stat" key={key}>
                  <span>{statMeta[key].icon}</span>
                  <div><small>{statMeta[key].label}</small><b>{state.stats[key]}%</b></div>
                  <i><em style={{ width: `${state.stats[key]}%` }} /></i>
                </div>
              ))}
            </div>

            <div className="pq-section-heading">
              <div><span>СЕГОДНЯ</span><h2>Забота превращается в игру</h2></div>
              <button type="button" onClick={() => setTab('tasks')}>{doneCount}/{taskDefinitions.length} →</button>
            </div>

            <div className="pq-quick-actions">
              {taskDefinitions.slice(0, 4).map((task) => (
                <button className={state.completed[task.id] ? 'done' : ''} type="button" key={task.id} onClick={() => completeTask(task)}>
                  <span>{state.completed[task.id] ? '✓' : task.icon}</span>
                  <b>{task.title}</b>
                  <small>{state.completed[task.id] ? 'Готово' : `+${task.xp} XP`}</small>
                </button>
              ))}
            </div>

            <button className="pq-adventure-card" type="button" onClick={() => setTab('map')}>
              <div><span>НОВОЕ ПРИКЛЮЧЕНИЕ</span><h3>Карта прогулок</h3><p>Парк уже открыт. Следующие места появятся с уровнями.</p></div>
              <div className="pq-mini-map"><i>⌂</i><i>♧</i><i>≈</i><i>△</i></div>
            </button>
          </section>
        )}

        {tab === 'tasks' && (
          <section className="pq-screen">
            <div className="pq-page-title">
              <div><span>ДЕНЬ {state.streak}</span><h1>Сегодня</h1><p>Реальные дела по уходу дают игровой прогресс.</p></div>
              <div className="pq-progress-ring">{doneCount}/{taskDefinitions.length}</div>
            </div>

            <div className="pq-task-list">
              {taskDefinitions.map((task) => (
                <button className={`pq-task ${state.completed[task.id] ? 'done' : ''}`} type="button" key={task.id} onClick={() => completeTask(task)}>
                  <span className="pq-task-icon">{state.completed[task.id] ? '✓' : task.icon}</span>
                  <span className="pq-task-copy"><b>{task.title}</b><small>{task.subtitle}</small></span>
                  <span className="pq-task-reward">+{task.xp} XP</span>
                  <span className="pq-task-check">{state.completed[task.id] ? '●' : '○'}</span>
                </button>
              ))}
            </div>

            <button className={`pq-chest ${allDone ? 'ready' : ''}`} type="button" disabled={!allDone || state.claimedChest} onClick={claimChest}>
              <span className="pq-chest-art">🎁</span>
              <div><small>ДНЕВНОЙ СУНДУК</small><b>{state.claimedChest ? 'Награда получена' : allDone ? 'Можно открыть!' : `Ещё ${taskDefinitions.length - doneCount} дел`}</b><p>120 монет · 80 XP · бонус серии</p></div>
            </button>
          </section>
        )}

        {tab === 'map' && (
          <section className="pq-screen pq-map-screen">
            <div className="pq-page-title compact"><div><span>ИССЛЕДУЙТЕ ВМЕСТЕ</span><h1>Карта приключений</h1></div><b className="pq-map-level">LVL {level}</b></div>
            <div className="pq-adventure-map">
              <div className="pq-map-water" />
              <div className="pq-map-path path-one" />
              <div className="pq-map-path path-two" />
              <div className="pq-map-mountain">△ △</div>
              <button className={`pq-map-stop home ${selectedMapStop === 'home' ? 'active' : ''}`} onClick={() => setSelectedMapStop('home')} type="button"><span>⌂</span><b>Дом</b></button>
              <button className={`pq-map-stop park ${selectedMapStop === 'park' ? 'active' : ''}`} onClick={() => setSelectedMapStop('park')} type="button"><span>🌲</span><b>Парк</b></button>
              <button className={`pq-map-stop forest ${level < 2 ? 'locked' : ''} ${selectedMapStop === 'forest' ? 'active' : ''}`} onClick={() => level >= 2 && setSelectedMapStop('forest')} type="button"><span>{level < 2 ? '🔒' : '🍄'}</span><b>Лес</b></button>
              <button className={`pq-map-stop beach ${level < 3 ? 'locked' : ''} ${selectedMapStop === 'beach' ? 'active' : ''}`} onClick={() => level >= 3 && setSelectedMapStop('beach')} type="button"><span>{level < 3 ? '🔒' : '🏖️'}</span><b>Пляж</b></button>
              <button className={`pq-map-stop hills ${level < 4 ? 'locked' : ''} ${selectedMapStop === 'hills' ? 'active' : ''}`} onClick={() => level >= 4 && setSelectedMapStop('hills')} type="button"><span>{level < 4 ? '🔒' : '⛰️'}</span><b>Холмы</b></button>
            </div>
            <div className="pq-map-card">
              <span>{selectedMapStop === 'park' ? '🌳' : selectedMapStop === 'home' ? '🏡' : selectedMapStop === 'forest' ? '🍄' : selectedMapStop === 'beach' ? '🌊' : '⛰️'}</span>
              <div><small>ВЫБРАННАЯ ЛОКАЦИЯ</small><b>{selectedMapStop === 'park' ? 'Парк' : selectedMapStop === 'home' ? 'Дом' : selectedMapStop === 'forest' ? 'Лесная тропа' : selectedMapStop === 'beach' ? 'Пляж' : 'Зелёные холмы'}</b><p>Здесь будут отдельные квесты, факты и коллекционные награды.</p></div>
              <button type="button" onClick={() => setToast('Локационный квест появится в следующем обновлении')}>В путь</button>
            </div>
          </section>
        )}

        {tab === 'shop' && (
          <section className="pq-screen">
            <div className="pq-page-title compact"><div><span>ГАРДЕРОБ</span><h1>Магазин</h1></div><div className="pq-wallet"><span>●</span>{state.coins}</div></div>
            <div className="pq-shop-feature">
              <div className="pq-shop-stage">
                <div className="pq-shop-light" />
                {renderDog('pq-shop-dog')}
              </div>
              <div className="pq-shop-copy">
                <span>СЕЙЧАС НАДЕТО</span>
                <h2>{selectedOutfit.name}</h2>
                <p>Костюмы не меняют характеристики. Это чистая коллекция и способ сделать питомца своим.</p>
              </div>
            </div>

            <div className="pq-outfit-grid">
              {outfits.map((item) => {
                const owned = state.ownedOutfits.includes(item.id)
                const active = state.selectedOutfit === item.id
                const locked = level < item.level
                return (
                  <button className={`pq-outfit-card ${active ? 'active' : ''}`} type="button" key={item.id} onClick={() => buyOutfit(item)}>
                    <span>{locked ? '🔒' : item.icon}</span>
                    <b>{item.name}</b>
                    <small>{active ? 'Надето ✓' : owned ? 'Надеть' : locked ? `${item.level} уровень` : item.price === 0 ? 'Бесплатно' : `${item.price} ●`}</small>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {tab === 'profile' && (
          <section className="pq-screen">
            <div className="pq-profile-hero">
              {renderDog('pq-profile-dog')}
              <div><span>{breed.name}</span><h1>{profile.name}</h1><p>{breed.subtitle}</p><button type="button" onClick={onEditProfile}>Изменить профиль</button></div>
            </div>

            <div className="pq-level-card">
              <div><span>УРОВЕНЬ {level}</span><b>{state.xp} XP</b></div>
              <i><em style={{ width: `${levelProgress}%` }} /></i>
              <small>До следующего уровня: {100 - levelProgress} XP</small>
            </div>

            <div className="pq-profile-links">
              <button type="button" onClick={() => setToast(breed.facts[0])}><span>📚</span><div><b>О породе</b><small>Факты и особенности {breed.name.toLowerCase()}</small></div><i>›</i></button>
              <button type="button" onClick={() => setToast('Раздел здоровья уже заложен в структуру')}><span>✚</span><div><b>Здоровье</b><small>Прививки, обработки, вес, лекарства</small></div><i>›</i></button>
              <button type="button" onClick={() => setToast('Фото-дневник будет хранить реальные моменты с собакой')}><span>▣</span><div><b>Фото-дневник</b><small>Прогулки, события и заметки</small></div><i>›</i></button>
              <button type="button" onClick={() => setToast(`Открыто ${state.ownedOutfits.length} предметов гардероба`)}><span>🏅</span><div><b>Достижения</b><small>Коллекции, серии и большие цели</small></div><i>›</i></button>
            </div>

            <div className="pq-breed-tip">
              <span>💡</span><div><small>ФОКУС УХОДА</small><p>{breed.dailyFocus}</p></div>
            </div>
          </section>
        )}
      </main>

      <nav className="pq-bottom-nav" aria-label="Основная навигация">
        {navItems.map((item) => (
          <button className={tab === item.id ? 'active' : ''} type="button" key={item.id} onClick={() => setTab(item.id)}>
            <span>{item.icon}</span><small>{item.label}</small>
          </button>
        ))}
      </nav>

      {toast && <div className="pq-toast">{toast}</div>}
    </div>
  )
}
