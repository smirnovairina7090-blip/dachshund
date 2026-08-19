import { useEffect, useMemo, useState } from 'react'

type Tab = 'home' | 'quests' | 'games' | 'learn' | 'collection'
type StatKey = 'satiety' | 'joy' | 'energy' | 'clean'
type ActionKey = 'feed' | 'treat' | 'pet' | 'play' | 'walk' | 'wash' | 'sleep'

type Stats = Record<StatKey, number>

type GameState = {
  name: string
  stats: Stats
  xp: number
  bones: number
  bond: number
  streak: number
  lastVisit: number
  lastDay: string
  dailyCounts: Record<string, number>
  actionTotals: Record<string, number>
  claimedDaily: boolean
  achievements: string[]
  discoveredFacts: number[]
  breedsViewed: string[]
  gameWins: number
  totalCare: number
  ownedAccessories: string[]
  selectedAccessory: string
}

type ActionDefinition = {
  id: ActionKey
  icon: string
  title: string
  subtitle: string
  changes: Partial<Stats>
  xp: number
  bones: number
  bond: number
  message: string
  requirement?: (state: GameState) => string | null
}

type Achievement = {
  id: string
  icon: string
  title: string
  description: string
  reward: number
  test: (state: GameState) => boolean
}

type Fact = {
  title: string
  text: string
  level: number
  achievement?: string
}

type Accessory = {
  id: string
  icon: string
  title: string
  price: number
  level: number
}

const STORAGE_KEY = 'motya-tamagotchi-v2'
const BASE = import.meta.env.BASE_URL
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)))
const dayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const levelOf = (xp: number) => Math.floor(xp / 120) + 1

const initialState = (): GameState => ({
  name: 'Мотя',
  stats: { satiety: 78, joy: 82, energy: 76, clean: 84 },
  xp: 0,
  bones: 85,
  bond: 12,
  streak: 1,
  lastVisit: Date.now(),
  lastDay: dayKey(),
  dailyCounts: {},
  actionTotals: {},
  claimedDaily: false,
  achievements: [],
  discoveredFacts: [0],
  breedsViewed: [],
  gameWins: 0,
  totalCare: 0,
  ownedAccessories: ['none'],
  selectedAccessory: 'none',
})

const actions: ActionDefinition[] = [
  {
    id: 'feed', icon: '🍲', title: 'Покормить', subtitle: 'Полная миска',
    changes: { satiety: 26, joy: 3, clean: -2 }, xp: 9, bones: 3, bond: 2,
    message: 'Миска одобрена. Очень серьёзно одобрена.',
  },
  {
    id: 'treat', icon: '🦴', title: 'Вкусняшка', subtitle: 'За красивые глаза',
    changes: { satiety: 11, joy: 12 }, xp: 6, bones: 0, bond: 3,
    message: 'Вкусняшка исчезла быстрее, чем успела появиться.',
  },
  {
    id: 'pet', icon: '🤎', title: 'Почесать', subtitle: 'Уши и пузико',
    changes: { joy: 15, energy: 2 }, xp: 7, bones: 2, bond: 5,
    message: 'Вот. Именно это место. Продолжай.',
  },
  {
    id: 'play', icon: '🎾', title: 'Поиграть', subtitle: 'Мячик уже ждёт',
    changes: { joy: 24, energy: -14, satiety: -7, clean: -3 }, xp: 14, bones: 6, bond: 4,
    message: 'Мяч пойман. Мяч потерян. Мяч снова срочно нужен.',
    requirement: (state) => state.stats.energy < 18 ? 'Сначала Моте нужно отдохнуть.' : null,
  },
  {
    id: 'walk', icon: '🌿', title: 'Гулять', subtitle: 'Нюхать весь район',
    changes: { joy: 20, energy: -17, satiety: -9, clean: -6 }, xp: 16, bones: 8, bond: 5,
    message: 'Прогулка завершена. Изучено примерно 47 очень важных запахов.',
    requirement: (state) => state.stats.energy < 24 ? 'Для прогулки пока маловато сил.' : null,
  },
  {
    id: 'wash', icon: '🫧', title: 'Умыть', subtitle: 'Лапки и шерсть',
    changes: { clean: 38, joy: -3 }, xp: 10, bones: 4, bond: 2,
    message: 'Чистая такса выглядит подозрительно довольной собой.',
  },
  {
    id: 'sleep', icon: '🌙', title: 'Поспать', subtitle: 'Клубком под пледом',
    changes: { energy: 40, satiety: -6, joy: 4 }, xp: 8, bones: 2, bond: 2,
    message: 'Мотя свернулась в идеальный таксячий круассан.',
  },
]

const achievements: Achievement[] = [
  { id: 'hello', icon: '🐾', title: 'Ну привет!', description: 'Сделать первое действие заботы.', reward: 20, test: (s) => s.totalCare >= 1 },
  { id: 'chef', icon: '🥣', title: 'Шеф домашней кухни', description: 'Покормить Мотю 10 раз.', reward: 45, test: (s) => (s.actionTotals.feed ?? 0) >= 10 },
  { id: 'friend', icon: '💞', title: 'Человек выбран', description: 'Довести доверие до 100.', reward: 60, test: (s) => s.bond >= 100 },
  { id: 'carepro', icon: '✨', title: 'Идеальный день', description: 'Поднять все четыре показателя до 85+.', reward: 70, test: (s) => Object.values(s.stats).every((v) => v >= 85) },
  { id: 'level5', icon: '🏆', title: 'Такса-профи', description: 'Достичь 5 уровня.', reward: 100, test: (s) => levelOf(s.xp) >= 5 },
  { id: 'streak3', icon: '🔥', title: 'Мы в режиме', description: 'Зайти 3 дня подряд.', reward: 50, test: (s) => s.streak >= 3 },
  { id: 'gamer', icon: '🎮', title: 'Игровая лапа', description: 'Победить в мини-играх 5 раз.', reward: 65, test: (s) => s.gameWins >= 5 },
  { id: 'reader', icon: '📚', title: 'Таксолог', description: 'Открыть 8 фактов.', reward: 60, test: (s) => s.discoveredFacts.length >= 8 },
  { id: 'explorer', icon: '🔎', title: 'Знаток разновидностей', description: 'Изучить 5 карточек Таксопедии.', reward: 55, test: (s) => s.breedsViewed.length >= 5 },
]

const facts: Fact[] = [
  { title: 'Зачем такая форма?', text: 'Такс выводили как норных охотничьих собак. Длинное тело и короткие лапы помогали работать там, куда крупной собаке не пробраться.', level: 1 },
  { title: 'Имя с подсказкой', text: 'Немецкое слово Dachshund буквально связано с барсуком и собакой. История породы очень хорошо спрятана прямо в названии.', level: 1 },
  { title: 'Три типа шерсти', text: 'У такс бывают гладкошёрстная, длинношёрстная и жесткошёрстная разновидности. У каждой свой характер ухода за шерстью.', level: 2 },
  { title: 'Нос важнее навигатора', text: 'Таксы относятся к собакам с очень сильной мотивацией исследовать запахи. Поэтому медленная прогулка с нюханием может быть настоящей интеллектуальной работой.', level: 2 },
  { title: 'Одеяло захвачено', text: 'Любовь зарываться в пледы и подушки отлично сочетается с норным прошлым породы. Для многих такс это один из любимых способов отдыхать.', level: 3 },
  { title: 'Голос в маленьком корпусе', text: 'Таксы нередко удивляют довольно мощным голосом. Исторически охотнику было важно слышать собаку, даже когда она работала вне поля зрения.', level: 3 },
  { title: 'Спина любит разумную заботу', text: 'Из-за особенностей пропорций таксам особенно полезны нормальный вес, разумная нагрузка и меньше повторяющихся высоких прыжков.', level: 4 },
  { title: 'Размеры бывают разные', text: 'В разных кинологических системах категории размеров описываются по-разному. Помимо стандартных такс встречаются более компактные размерные разновидности.', level: 4 },
  { title: 'Копать? Конечно копать', text: 'Стремление копать, рыться и искать источник запаха для таксы вполне естественно. Игры на поиск часто отлично занимают этот талант.', level: 5 },
  { title: 'Упрямство или план?', text: 'Такса умеет принимать самостоятельные решения. В быту это иногда выглядит как упрямство, поэтому обучение обычно лучше работает через понятную мотивацию и короткие задачи.', level: 5 },
  { title: 'Жесткошёрстные с характерной бородой', text: 'У жесткошёрстных такс заметные брови и борода создают очень узнаваемую морду. Такая шерсть требует своего режима ухода.', level: 6, achievement: 'explorer' },
  { title: 'Маленький исследователь', text: 'Хорошая игра для таксы часто сочетает движение, поиск запаха и маленькую задачу на решение. Именно поэтому нюхательные игры так хорошо вписываются в домашние занятия.', level: 6, achievement: 'gamer' },
]

const breedCards = [
  { id: 'smooth', icon: '🤎', title: 'Гладкошёрстная', tag: 'Классический силуэт', text: 'Короткая плотная шерсть подчёркивает форму тела. Уход обычно простой, но сезонная линька всё равно остаётся.' },
  { id: 'long', icon: '🪶', title: 'Длинношёрстная', tag: 'Шёлковые очёсы', text: 'Длиннее шерсть на ушах, груди и хвосте. Нужны регулярное расчёсывание и внимание к местам, где шерсть может спутываться.' },
  { id: 'wire', icon: '🧔', title: 'Жесткошёрстная', tag: 'Брови и борода', text: 'Жёсткий покров и выразительная морда. Для поддержания структуры шерсти часто используют специальный уход и тримминг.' },
  { id: 'standard', icon: '📏', title: 'Стандартная', tag: 'Самая крупная размерная группа', text: 'Классическая размерная разновидность породы. Точные критерии зависят от стандарта конкретной кинологической системы.' },
  { id: 'mini', icon: '🌰', title: 'Миниатюрная', tag: 'Компактнее стандарта', text: 'Меньшая размерная разновидность. По темпераменту это всё та же такса: любопытная, самостоятельная и очень заинтересованная в запахах.' },
  { id: 'rabbit', icon: '🐇', title: 'Кроличья', tag: 'Самая миниатюрная категория FCI', text: 'В системе FCI выделяется кроличья разновидность. Исторически такой размер связывался с работой по очень узким норам.' },
]

const accessories: Accessory[] = [
  { id: 'none', icon: '🐾', title: 'Без аксессуара', price: 0, level: 1 },
  { id: 'bandana', icon: '🧣', title: 'Бандана', price: 60, level: 1 },
  { id: 'flower', icon: '🌼', title: 'Ромашка', price: 90, level: 2 },
  { id: 'glasses', icon: '🕶️', title: 'Очки босса', price: 130, level: 3 },
  { id: 'crown', icon: '👑', title: 'Корона', price: 180, level: 4 },
  { id: 'rocket', icon: '🚀', title: 'Режим ракеты', price: 240, level: 6 },
]

function loadState(): GameState {
  const fresh = initialState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fresh
    const saved = { ...fresh, ...JSON.parse(raw) } as GameState
    saved.stats = { ...fresh.stats, ...(saved.stats ?? {}) }
    saved.dailyCounts = saved.dailyCounts ?? {}
    saved.actionTotals = saved.actionTotals ?? {}
    saved.achievements = saved.achievements ?? []
    saved.discoveredFacts = saved.discoveredFacts ?? [0]
    saved.breedsViewed = saved.breedsViewed ?? []
    saved.ownedAccessories = saved.ownedAccessories ?? ['none']
    saved.selectedAccessory = saved.ownedAccessories.includes(saved.selectedAccessory) ? saved.selectedAccessory : 'none'

    const now = Date.now()
    const elapsedHours = Math.min(12, Math.max(0, (now - (saved.lastVisit || now)) / 3_600_000))
    saved.stats = {
      satiety: clamp(saved.stats.satiety - elapsedHours * 3.2),
      joy: clamp(saved.stats.joy - elapsedHours * 1.5),
      energy: clamp(saved.stats.energy - elapsedHours * 2.1),
      clean: clamp(saved.stats.clean - elapsedHours * 1.1),
    }

    const today = dayKey()
    if (saved.lastDay !== today) {
      const prev = new Date(`${saved.lastDay}T12:00:00`)
      const curr = new Date(`${today}T12:00:00`)
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86_400_000)
      saved.streak = diff === 1 ? saved.streak + 1 : 1
      saved.dailyCounts = {}
      saved.claimedDaily = false
      saved.lastDay = today
    }
    saved.lastVisit = now
    return saved
  } catch {
    return fresh
  }
}

const statMeta: Record<StatKey, { label: string; icon: string }> = {
  satiety: { label: 'Сытость', icon: '🍲' },
  joy: { label: 'Настроение', icon: '💛' },
  energy: { label: 'Энергия', icon: '⚡' },
  clean: { label: 'Чистота', icon: '🫧' },
}

function moodFor(state: GameState) {
  const { satiety, joy, energy, clean } = state.stats
  if (satiety < 22) return { icon: '🥺', title: 'Голодная', line: 'Я тут случайно вспомнила, что миски вообще-то существуют.' }
  if (energy < 22) return { icon: '😴', title: 'Сонная', line: 'Плед. Сейчас. Все остальные дела потом.' }
  if (clean < 22) return { icon: '🫠', title: 'Чумазая', line: 'Это не грязь. Это доказательства отличной прогулки.' }
  if (joy < 25) return { icon: '🙃', title: 'Скучает', line: 'Кажется, кто-то слишком давно не доставал мячик.' }
  if (Object.values(state.stats).every((v) => v >= 85)) return { icon: '✨', title: 'В восторге', line: 'Вот теперь жизнь организована правильно.' }
  if (state.bond >= 100) return { icon: '🥰', title: 'Обожает тебя', line: 'Ладно. Ты официально мой человек.' }
  return { icon: '😊', title: 'Спокойная', line: 'Всё хорошо. Но почесать за ухом всё равно можно.' }
}

function App() {
  const [state, setState] = useState<GameState>(() => loadState())
  const [tab, setTab] = useState<Tab>('home')
  const [message, setMessage] = useState('Я готова принимать заботу, комплименты и законные вкусняшки.')
  const [toast, setToast] = useState('')
  const [selectedBreed, setSelectedBreed] = useState(breedCards[0].id)
  const [secretCup, setSecretCup] = useState<number | null>(null)
  const [sniffAttempts, setSniffAttempts] = useState(0)
  const [sniffResult, setSniffResult] = useState('')
  const [boneGame, setBoneGame] = useState({ running: false, score: 0, timeLeft: 0, x: 45, y: 48 })
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(state.name)

  const level = levelOf(state.xp)
  const xpInLevel = state.xp % 120
  const mood = useMemo(() => moodFor(state), [state])
  const selectedAccessory = accessories.find((a) => a.id === state.selectedAccessory) ?? accessories[0]

  useEffect(() => {
    const payload = { ...state, lastVisit: Date.now(), lastDay: dayKey() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [state])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(id)
  }, [toast])

  useEffect(() => {
    const newlyUnlocked = achievements.filter((a) => !state.achievements.includes(a.id) && a.test(state))
    if (newlyUnlocked.length === 0) return
    const reward = newlyUnlocked.reduce((sum, a) => sum + a.reward, 0)
    setState((prev) => ({ ...prev, achievements: [...prev.achievements, ...newlyUnlocked.map((a) => a.id)], bones: prev.bones + reward }))
    setToast(`🏆 ${newlyUnlocked[0].title} +${reward} 🦴`)
  }, [state])

  useEffect(() => {
    if (!boneGame.running) return
    const id = window.setInterval(() => {
      setBoneGame((prev) => ({ ...prev, timeLeft: Math.max(0, prev.timeLeft - 1) }))
    }, 1000)
    return () => window.clearInterval(id)
  }, [boneGame.running])

  useEffect(() => {
    if (!boneGame.running || boneGame.timeLeft > 0) return
    const score = boneGame.score
    const won = score >= 6
    setBoneGame((prev) => ({ ...prev, running: false }))
    if (won) {
      const reward = Math.min(45, 10 + score * 4)
      setState((prev) => ({
        ...prev,
        bones: prev.bones + reward,
        xp: prev.xp + 22,
        gameWins: prev.gameWins + 1,
        dailyCounts: { ...prev.dailyCounts, game: (prev.dailyCounts.game ?? 0) + 1 },
      }))
      setToast(`🎾 Отлично! ${score} попаданий, +${reward} 🦴`)
    } else {
      setToast(`Поймано ${score}. Ещё чуть-чуть до награды!`)
    }
  }, [boneGame.running, boneGame.score, boneGame.timeLeft])

  const dailyQuests = [
    { id: 'feed', icon: '🥣', title: 'Покормить 2 раза', target: 2, value: state.dailyCounts.feed ?? 0 },
    { id: 'pet', icon: '🤎', title: 'Почесать 3 раза', target: 3, value: state.dailyCounts.pet ?? 0 },
    { id: 'play', icon: '🎾', title: 'Поиграть или погулять 2 раза', target: 2, value: (state.dailyCounts.play ?? 0) + (state.dailyCounts.walk ?? 0) },
    { id: 'learn', icon: '📚', title: 'Открыть факт', target: 1, value: state.dailyCounts.learn ?? 0 },
    { id: 'game', icon: '🎮', title: 'Выиграть мини-игру', target: 1, value: state.dailyCounts.game ?? 0 },
  ]
  const questDone = dailyQuests.filter((q) => q.value >= q.target).length
  const allQuestsDone = questDone === dailyQuests.length

  function vibrate() {
    if ('vibrate' in navigator) navigator.vibrate(18)
  }

  function doAction(action: ActionDefinition) {
    const problem = action.requirement?.(state)
    if (problem) {
      setToast(problem)
      return
    }
    vibrate()
    setState((prev) => {
      const nextStats = { ...prev.stats }
      for (const [key, delta] of Object.entries(action.changes) as [StatKey, number][]) {
        nextStats[key] = clamp(nextStats[key] + delta)
      }
      return {
        ...prev,
        stats: nextStats,
        xp: prev.xp + action.xp,
        bones: prev.bones + action.bones,
        bond: prev.bond + action.bond,
        totalCare: prev.totalCare + 1,
        actionTotals: { ...prev.actionTotals, [action.id]: (prev.actionTotals[action.id] ?? 0) + 1 },
        dailyCounts: { ...prev.dailyCounts, [action.id]: (prev.dailyCounts[action.id] ?? 0) + 1 },
      }
    })
    setMessage(action.message)
    setToast(`+${action.xp} XP · +${action.bond} доверия${action.bones ? ` · +${action.bones} 🦴` : ''}`)
  }

  function touchDog() {
    doAction(actions.find((a) => a.id === 'pet')!)
  }

  function claimDaily() {
    if (!allQuestsDone || state.claimedDaily) return
    setState((prev) => ({ ...prev, claimedDaily: true, bones: prev.bones + 85, xp: prev.xp + 55, bond: prev.bond + 10 }))
    setToast('🎁 День закрыт: +85 🦴, +55 XP, +10 доверия')
  }

  function openFact(index: number) {
    const fact = facts[index]
    const unlocked = level >= fact.level && (!fact.achievement || state.achievements.includes(fact.achievement))
    if (!unlocked) return
    if (!state.discoveredFacts.includes(index)) {
      setState((prev) => ({
        ...prev,
        discoveredFacts: [...prev.discoveredFacts, index],
        xp: prev.xp + 8,
        dailyCounts: { ...prev.dailyCounts, learn: (prev.dailyCounts.learn ?? 0) + 1 },
      }))
      setToast('📚 Новый факт открыт · +8 XP')
    }
  }

  function viewBreed(id: string) {
    setSelectedBreed(id)
    if (!state.breedsViewed.includes(id)) {
      setState((prev) => ({ ...prev, breedsViewed: [...prev.breedsViewed, id], xp: prev.xp + 5 }))
      setToast('🔎 Новая карточка изучена · +5 XP')
    }
  }

  function startSniffGame() {
    setSecretCup(Math.floor(Math.random() * 6))
    setSniffAttempts(0)
    setSniffResult('Мотя уже принюхивается. У тебя три попытки.')
  }

  function chooseCup(index: number) {
    if (secretCup === null || sniffAttempts >= 3) return
    const nextAttempt = sniffAttempts + 1
    setSniffAttempts(nextAttempt)
    if (index === secretCup) {
      const reward = Math.max(18, 36 - sniffAttempts * 8)
      setSniffResult(`Нашли! Вкусняшка была в тайнике №${index + 1}.`)
      setSecretCup(null)
      setState((prev) => ({
        ...prev,
        bones: prev.bones + reward,
        xp: prev.xp + 18,
        gameWins: prev.gameWins + 1,
        dailyCounts: { ...prev.dailyCounts, game: (prev.dailyCounts.game ?? 0) + 1 },
      }))
      setToast(`👃 Нюхач победил · +${reward} 🦴`)
      return
    }
    if (nextAttempt >= 3) {
      setSniffResult(`Почти! Тайник был №${secretCup + 1}. Запускай ещё раунд.`)
      setSecretCup(null)
    } else {
      setSniffResult(index < secretCup ? 'Запах будто сильнее правее…' : 'Кажется, стоит проверить левее…')
    }
  }

  function startBoneGame() {
    setBoneGame({ running: true, score: 0, timeLeft: 8, x: 45, y: 48 })
  }

  function hitBone() {
    if (!boneGame.running) return
    vibrate()
    setBoneGame((prev) => ({
      ...prev,
      score: prev.score + 1,
      x: 10 + Math.random() * 78,
      y: 15 + Math.random() * 68,
    }))
  }

  function buyAccessory(item: Accessory) {
    if (level < item.level) {
      setToast(`Откроется на ${item.level} уровне`)
      return
    }
    if (state.ownedAccessories.includes(item.id)) {
      setState((prev) => ({ ...prev, selectedAccessory: item.id }))
      setToast(`${item.icon} Надето: ${item.title}`)
      return
    }
    if (state.bones < item.price) {
      setToast('Не хватает косточек')
      return
    }
    setState((prev) => ({
      ...prev,
      bones: prev.bones - item.price,
      ownedAccessories: [...prev.ownedAccessories, item.id],
      selectedAccessory: item.id,
    }))
    setToast(`${item.icon} Куплено и надето!`)
  }

  function saveName() {
    const cleanName = nameDraft.trim().slice(0, 18)
    if (!cleanName) return
    setState((prev) => ({ ...prev, name: cleanName }))
    setEditingName(false)
    setToast('Имя сохранено')
  }

  function resetGame() {
    if (!window.confirm('Начать жизнь таксы заново? Прогресс, косточки и достижения сбросятся.')) return
    const fresh = initialState()
    setState(fresh)
    setNameDraft(fresh.name)
    setMessage('Новая история начинается прямо сейчас.')
    setTab('home')
    setToast('Прогресс сброшен')
  }

  const selectedBreedData = breedCards.find((b) => b.id === selectedBreed) ?? breedCards[0]

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setTab('home')}>
          <span className="brand-mark">🐾</span>
          <span><b>{state.name}.life</b><small>такса, настроение и приключения</small></span>
        </button>
        <div className="top-stats">
          <div className="mini-pill"><span>🔥</span><b>{state.streak}</b><small>дней</small></div>
          <div className="mini-pill"><span>🦴</span><b>{state.bones}</b><small>косточек</small></div>
          <div className="level-pill"><span>LVL {level}</span><i><b style={{ width: `${(xpInLevel / 120) * 100}%` }} /></i><small>{xpInLevel}/120 XP</small></div>
        </div>
      </header>

      <main className="main-content">
        {tab === 'home' && (
          <section className="home-grid">
            <div className="pet-card card">
              <div className="pet-card-head">
                <div>
                  <span className="eyebrow">СЕЙЧАС</span>
                  <h1>{mood.icon} {state.name} {mood.title.toLowerCase()}</h1>
                </div>
                <div className="bond-badge"><span>💞</span><b>{state.bond}</b><small>доверие</small></div>
              </div>

              <div className="pet-stage">
                <div className="room-shape room-shape-one" />
                <div className="room-shape room-shape-two" />
                <div className="window-glow" />
                <div className="speech-bubble">{message || mood.line}</div>
                <button className={`dog-button mood-${mood.title.toLowerCase()}`} onClick={touchDog} aria-label={`Погладить ${state.name}`}>
                  {selectedAccessory.id !== 'none' && <span className={`dog-accessory accessory-${selectedAccessory.id}`}>{selectedAccessory.icon}</span>}
                  <img src={`${BASE}assets/motya/motya-game.webp`} alt={`Такса ${state.name}`} draggable="false" />
                  <span className="tap-hint">нажми на меня 🤎</span>
                </button>
                <div className="floor-shadow" />
                <div className="stage-toy">🎾</div>
                <div className="stage-bowl">🥣</div>
              </div>

              <div className="stat-grid">
                {(Object.keys(statMeta) as StatKey[]).map((key) => (
                  <div className="stat-row" key={key}>
                    <div className="stat-label"><span>{statMeta[key].icon}</span><span>{statMeta[key].label}</span><b>{state.stats[key]}%</b></div>
                    <div className="meter"><i style={{ width: `${state.stats[key]}%` }} className={state.stats[key] < 30 ? 'is-low' : state.stats[key] > 84 ? 'is-high' : ''} /></div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="side-stack">
              <div className="card day-card">
                <div className="section-heading compact">
                  <div><span className="eyebrow">ДЕНЬ {state.streak}</span><h2>Забота на сегодня</h2></div>
                  <span className="circle-progress">{questDone}/{dailyQuests.length}</span>
                </div>
                <div className="quest-mini-list">
                  {dailyQuests.slice(0, 4).map((q) => (
                    <div className={`quest-mini ${q.value >= q.target ? 'done' : ''}`} key={q.id}>
                      <span>{q.value >= q.target ? '✓' : q.icon}</span><p>{q.title}</p><b>{Math.min(q.value, q.target)}/{q.target}</b>
                    </div>
                  ))}
                </div>
                <button className="text-button" onClick={() => setTab('quests')}>Все задания <span>→</span></button>
              </div>

              <div className="card tip-card">
                <div className="tip-icon">💡</div>
                <div><span className="eyebrow">ТАКСА СОВЕТУЕТ</span><p>{mood.line}</p></div>
              </div>
            </aside>

            <div className="card action-card full-width">
              <div className="section-heading">
                <div><span className="eyebrow">ЧТО ДЕЛАЕМ?</span><h2>Уход, игры и маленькие радости</h2></div>
                <span className="muted">Каждое действие даёт XP и доверие</span>
              </div>
              <div className="actions-grid">
                {actions.map((action) => {
                  const problem = action.requirement?.(state)
                  return (
                    <button className={`action-button ${problem ? 'is-disabled' : ''}`} key={action.id} onClick={() => doAction(action)}>
                      <span className="action-icon">{action.icon}</span>
                      <span><b>{action.title}</b><small>{problem ?? action.subtitle}</small></span>
                      <em>+{action.xp} XP</em>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {tab === 'quests' && (
          <section className="page-section">
            <div className="page-hero hero-quests">
              <div><span className="eyebrow">ЕЖЕДНЕВНЫЙ РИТУАЛ</span><h1>Дела таксы</h1><p>Закрой все задания и забери большую награду. Прогресс сбрасывается с новым днём.</p></div>
              <div className="hero-medal">{allQuestsDone ? '🎁' : '📋'}<b>{questDone}/{dailyQuests.length}</b></div>
            </div>

            <div className="quest-layout">
              <div className="card quest-card">
                <div className="section-heading"><h2>Сегодня</h2><span className="reward-chip">+85 🦴 · +55 XP · +10 💞</span></div>
                <div className="daily-list">
                  {dailyQuests.map((q) => {
                    const progress = Math.min(100, (q.value / q.target) * 100)
                    return (
                      <div className={`daily-row ${q.value >= q.target ? 'done' : ''}`} key={q.id}>
                        <span className="daily-icon">{q.value >= q.target ? '✓' : q.icon}</span>
                        <div><b>{q.title}</b><div className="meter slim"><i style={{ width: `${progress}%` }} /></div></div>
                        <strong>{Math.min(q.value, q.target)}/{q.target}</strong>
                      </div>
                    )
                  })}
                </div>
                <button className="primary-button" disabled={!allQuestsDone || state.claimedDaily} onClick={claimDaily}>
                  {state.claimedDaily ? 'Награда уже получена ✓' : allQuestsDone ? 'Забрать награду' : `Осталось заданий: ${dailyQuests.length - questDone}`}
                </button>
              </div>

              <div className="card challenge-card">
                <span className="eyebrow">БОЛЬШОЙ ЧЕЛЛЕНДЖ</span>
                <div className="challenge-visual">🏁<span>🐕</span></div>
                <h2>100 забот</h2>
                <p>Сделай сто любых полезных действий. Тут нет дедлайна: просто наблюдай, как растёт ваша история.</p>
                <div className="big-progress"><i style={{ width: `${Math.min(100, state.totalCare)}%` }} /></div>
                <b>{Math.min(state.totalCare, 100)} / 100</b>
              </div>
            </div>

            <div className="card achievements-card">
              <div className="section-heading"><div><span className="eyebrow">КОЛЛЕКЦИЯ</span><h2>Достижения</h2></div><span className="muted">Открыто {state.achievements.length}/{achievements.length}</span></div>
              <div className="achievement-grid">
                {achievements.map((a) => {
                  const unlocked = state.achievements.includes(a.id)
                  return <div className={`achievement ${unlocked ? 'unlocked' : ''}`} key={a.id}><span>{unlocked ? a.icon : '🔒'}</span><div><b>{a.title}</b><p>{a.description}</p><small>{unlocked ? 'Получено' : `Награда: ${a.reward} 🦴`}</small></div></div>
                })}
              </div>
            </div>
          </section>
        )}

        {tab === 'games' && (
          <section className="page-section">
            <div className="page-hero hero-games">
              <div><span className="eyebrow">ИГРОВАЯ ПЛОЩАДКА</span><h1>Игры с {state.name}</h1><p>Мини-игры дают косточки, XP и помогают закрывать ежедневное задание.</p></div>
              <div className="hero-medal">🎮<b>{state.gameWins} побед</b></div>
            </div>

            <div className="games-grid">
              <div className="card mini-game-card sniff-game">
                <div className="game-title"><span>👃</span><div><h2>Нюхач</h2><p>Угадай, где спряталась вкусняшка. После ошибки Мотя даст подсказку.</p></div></div>
                <div className="cup-grid">
                  {Array.from({ length: 6 }, (_, i) => (
                    <button key={i} className="cup" onClick={() => chooseCup(i)} disabled={secretCup === null}><span>📦</span><small>{i + 1}</small></button>
                  ))}
                </div>
                <div className="game-message">{sniffResult || 'Запусти раунд, чтобы спрятать вкусняшку.'}</div>
                <button className="primary-button" onClick={startSniffGame}>{secretCup === null ? 'Новый раунд' : `Попытка ${sniffAttempts + 1} из 3`}</button>
              </div>

              <div className="card mini-game-card catch-game">
                <div className="game-title"><span>🦴</span><div><h2>Лови косточку</h2><p>За 8 секунд нажми на косточку минимум 6 раз. На телефоне особенно весело.</p></div></div>
                <div className="catch-arena">
                  {boneGame.running ? (
                    <button className="moving-bone" onClick={hitBone} style={{ left: `${boneGame.x}%`, top: `${boneGame.y}%` }}>🦴</button>
                  ) : (
                    <div className="arena-idle"><span>🎯</span><b>{boneGame.score ? `${boneGame.score} попаданий` : 'Готова?'}</b><small>Косточка будет прыгать по полю</small></div>
                  )}
                  <div className="game-timer"><b>{boneGame.running ? `${boneGame.timeLeft}с` : '8с'}</b><span>Счёт: {boneGame.score}</span></div>
                </div>
                <button className="primary-button" onClick={startBoneGame} disabled={boneGame.running}>{boneGame.running ? 'Лови!' : 'Начать игру'}</button>
              </div>
            </div>

            <div className="card game-reward-info">
              <span>🏅</span><div><b>Игровая серия</b><p>За 5 побед открывается достижение «Игровая лапа», а вместе с ним - специальный факт в Таксопедии.</p></div><strong>{Math.min(state.gameWins, 5)}/5</strong>
            </div>
          </section>
        )}

        {tab === 'learn' && (
          <section className="page-section">
            <div className="page-hero hero-learn">
              <div><span className="eyebrow">ТАКСОПЕДИЯ</span><h1>Узнай свою таксу</h1><p>Факты открываются с уровнями и достижениями. Разновидности можно изучать в любом порядке.</p></div>
              <div className="hero-medal">📚<b>{state.discoveredFacts.length}/{facts.length}</b></div>
            </div>

            <div className="card breed-explorer">
              <div className="section-heading"><div><span className="eyebrow">РАЗНОВИДНОСТИ</span><h2>Одна порода, разные образы</h2></div><span className="muted">Нажми на карточку</span></div>
              <div className="breed-tabs">
                {breedCards.map((b) => <button key={b.id} className={selectedBreed === b.id ? 'active' : ''} onClick={() => viewBreed(b.id)}><span>{b.icon}</span><b>{b.title}</b></button>)}
              </div>
              <div className="breed-detail">
                <div className="breed-art"><span>{selectedBreedData.icon}</span><i>🐕</i></div>
                <div><span className="eyebrow">{selectedBreedData.tag}</span><h2>{selectedBreedData.title} такса</h2><p>{selectedBreedData.text}</p><small>{state.breedsViewed.includes(selectedBreedData.id) ? '✓ Изучено' : '+5 XP за первое открытие'}</small></div>
              </div>
            </div>

            <div className="card facts-card">
              <div className="section-heading"><div><span className="eyebrow">КАРТОЧКИ ЗНАНИЙ</span><h2>Интересные факты</h2></div><span className="muted">Твой уровень: {level}</span></div>
              <div className="facts-grid">
                {facts.map((fact, index) => {
                  const unlocked = level >= fact.level && (!fact.achievement || state.achievements.includes(fact.achievement))
                  const discovered = state.discoveredFacts.includes(index)
                  return (
                    <button className={`fact-card ${unlocked ? 'available' : 'locked'} ${discovered ? 'discovered' : ''}`} key={fact.title} onClick={() => openFact(index)}>
                      <div className="fact-top"><span>{unlocked ? (discovered ? '📖' : '✨') : '🔒'}</span><small>{fact.achievement ? `Достижение: ${achievements.find((a) => a.id === fact.achievement)?.title}` : `Уровень ${fact.level}`}</small></div>
                      <b>{unlocked ? fact.title : 'Секретный факт'}</b>
                      <p>{unlocked ? fact.text : `Откроется позже. Нужно: ${fact.achievement ? 'нужное достижение' : `${fact.level} уровень`}.`}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {tab === 'collection' && (
          <section className="page-section">
            <div className="page-hero hero-collection">
              <div><span className="eyebrow">ТВОЯ ИСТОРИЯ</span><h1>{state.name} & ты</h1><p>Настрой профиль, выбери аксессуар и посмотри, сколько всего вы уже сделали вместе.</p></div>
              <div className="hero-medal">💞<b>{state.bond}</b></div>
            </div>

            <div className="profile-grid">
              <div className="card profile-card">
                <div className="profile-dog"><img src={`${BASE}assets/motya/motya-game.webp`} alt={state.name} />{selectedAccessory.id !== 'none' && <span>{selectedAccessory.icon}</span>}</div>
                <div className="profile-info">
                  <span className="eyebrow">ПРОФИЛЬ ТАКСЫ</span>
                  {editingName ? (
                    <div className="name-editor"><input value={nameDraft} onChange={(e: { target: { value: string } }) => setNameDraft(e.target.value)} maxLength={18} autoFocus /><button onClick={saveName}>Сохранить</button></div>
                  ) : (
                    <div className="profile-name"><h2>{state.name}</h2><button onClick={() => setEditingName(true)}>✎</button></div>
                  )}
                  <p>{mood.icon} Сейчас: {mood.title.toLowerCase()}</p>
                  <div className="profile-numbers"><div><b>{level}</b><small>уровень</small></div><div><b>{state.totalCare}</b><small>забот</small></div><div><b>{state.gameWins}</b><small>побед</small></div><div><b>{state.achievements.length}</b><small>наград</small></div></div>
                </div>
              </div>

              <div className="card shop-card">
                <div className="section-heading"><div><span className="eyebrow">ГАРДЕРОБ</span><h2>Аксессуары</h2></div><span className="reward-chip">{state.bones} 🦴</span></div>
                <div className="shop-grid">
                  {accessories.map((item) => {
                    const owned = state.ownedAccessories.includes(item.id)
                    const active = state.selectedAccessory === item.id
                    const locked = level < item.level
                    return (
                      <button className={`shop-item ${active ? 'active' : ''}`} key={item.id} onClick={() => buyAccessory(item)}>
                        <span>{locked ? '🔒' : item.icon}</span><b>{item.title}</b><small>{active ? 'Надето ✓' : owned ? 'Надеть' : locked ? `Уровень ${item.level}` : item.price === 0 ? 'Бесплатно' : `${item.price} 🦴`}</small>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="card stats-history">
              <div className="section-heading"><div><span className="eyebrow">СТАТИСТИКА</span><h2>Что вы делаете чаще всего</h2></div></div>
              <div className="history-grid">
                {actions.map((a) => <div key={a.id}><span>{a.icon}</span><b>{state.actionTotals[a.id] ?? 0}</b><small>{a.title}</small></div>)}
              </div>
            </div>

            <div className="danger-zone">
              <div><b>Начать сначала</b><p>Сбросит локальный прогресс только на этом устройстве.</p></div>
              <button onClick={resetGame}>Сбросить прогресс</button>
            </div>
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Основная навигация">
        {([
          ['home', '🏠', 'Дом'],
          ['quests', '✅', 'Задания'],
          ['games', '🎮', 'Игры'],
          ['learn', '📚', 'Таксопедия'],
          ['collection', '🎒', 'Коллекция'],
        ] as [Tab, string, string][]).map(([id, icon, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><span>{icon}</span><small>{label}</small></button>
        ))}
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

export default App
