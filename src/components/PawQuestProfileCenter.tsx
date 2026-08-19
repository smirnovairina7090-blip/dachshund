import { useEffect, useMemo, useState } from 'react'
import type { DogBreed } from '../data/dogBreeds'
import type { DogProfile } from '../data/dogProfile'

type ProfilePage = 'breed' | 'achievements' | 'diary' | 'health'

type Props = {
  page: ProfilePage
  profile: DogProfile
  breed: DogBreed
  portrait: string
  level: number
  coins: number
  streak: number
  doneCount: number
  allDone: boolean
  ownedOutfitCount: number
  onClose: () => void
}

type DiaryEntry = { id: number; date: string; title: string; text: string }
type HealthData = { weight: string; nextVetVisit: string; nextVaccine: string; parasiteTreatment: string; medication: string }
type CenterData = { diary: DiaryEntry[]; health: HealthData }

const STORAGE_KEY = 'pawquest-profile-center-v1'
const emptyData: CenterData = {
  diary: [],
  health: { weight: '', nextVetVisit: '', nextVaccine: '', parasiteTreatment: '', medication: '' },
}

function loadData(): CenterData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData
    const parsed = JSON.parse(raw) as Partial<CenterData>
    return {
      diary: parsed.diary ?? [],
      health: { ...emptyData.health, ...(parsed.health ?? {}) },
    }
  } catch {
    return emptyData
  }
}

function todayLabel() {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date())
}

export default function PawQuestProfileCenter({ page, profile, breed, portrait, level, coins, streak, doneCount, allDone, ownedOutfitCount, onClose }: Props) {
  const [data, setData] = useState<CenterData>(() => loadData())
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const achievements = useMemo(() => [
    { icon: '🐾', title: 'Первый шаг', description: 'Выполнить первое дело заботы', unlocked: doneCount >= 1 },
    { icon: '🏆', title: 'Идеальный день', description: 'Закрыть все ежедневные дела', unlocked: allDone },
    { icon: '🔥', title: 'Мы в режиме', description: 'Серия заботы 3 дня', unlocked: streak >= 3 },
    { icon: '⭐', title: 'Опытная команда', description: 'Достичь 3 уровня', unlocked: level >= 3 },
    { icon: '🎒', title: 'Коллекционер', description: 'Собрать 3 предмета гардероба', unlocked: ownedOutfitCount >= 3 },
    { icon: '📷', title: 'Хранитель историй', description: 'Добавить 3 записи в дневник', unlocked: data.diary.length >= 3 },
  ], [allDone, data.diary.length, doneCount, level, ownedOutfitCount, streak])

  function addDiaryEntry() {
    const cleanTitle = title.trim()
    const cleanText = text.trim()
    if (!cleanTitle || !cleanText) return
    setData((previous) => ({
      ...previous,
      diary: [{ id: Date.now(), date: todayLabel(), title: cleanTitle.slice(0, 48), text: cleanText.slice(0, 220) }, ...previous.diary],
    }))
    setTitle('')
    setText('')
  }

  function updateHealth(key: keyof HealthData, value: string) {
    setData((previous) => ({ ...previous, health: { ...previous.health, [key]: value } }))
  }

  if (page === 'breed') {
    return (
      <section className="pq-screen pq-secondary-screen">
        <button className="pq-back-button" type="button" onClick={onClose}>‹ Профиль</button>
        <div className="pq-breed-hero-card">
          <div className="pq-secondary-dog"><img src={portrait} alt={`${breed.name} ${profile.name}`} /></div>
          <div><span className="pq-secondary-kicker">О ПОРОДЕ</span><h1>{breed.name}</h1><p>{breed.subtitle}</p><div className="pq-traits">{breed.temperament.map((trait) => <span key={trait}>{trait}</span>)}</div></div>
        </div>
        <div className="pq-info-card"><span>💡</span><div><b>Фокус ухода</b><p>{breed.dailyFocus}</p></div></div>
        <div className="pq-section-heading"><div><span>ЗНАНИЯ</span><h2>Интересные факты</h2></div></div>
        <div className="pq-fact-list">{breed.facts.map((fact, index) => <article key={fact}><span>{index + 1}</span><p>{fact}</p></article>)}</div>
      </section>
    )
  }

  if (page === 'achievements') {
    const unlockedCount = achievements.filter((item) => item.unlocked).length
    return (
      <section className="pq-screen pq-secondary-screen">
        <button className="pq-back-button" type="button" onClick={onClose}>‹ Профиль</button>
        <div className="pq-page-title"><div><span>КОЛЛЕКЦИЯ</span><h1>Достижения</h1><p>Большие цели превращают регулярную заботу в долгую игру.</p></div><div className="pq-progress-ring">{unlockedCount}/{achievements.length}</div></div>
        <div className="pq-achievement-grid">{achievements.map((item) => <article className={item.unlocked ? 'unlocked' : 'locked'} key={item.title}><span>{item.unlocked ? item.icon : '🔒'}</span><b>{item.title}</b><p>{item.description}</p><small>{item.unlocked ? 'Открыто ✓' : 'Пока закрыто'}</small></article>)}</div>
      </section>
    )
  }

  if (page === 'diary') {
    return (
      <section className="pq-screen pq-secondary-screen">
        <button className="pq-back-button" type="button" onClick={onClose}>‹ Профиль</button>
        <div className="pq-page-title"><div><span>ВАША ИСТОРИЯ</span><h1>Дневник</h1><p>Сохраняй прогулки, смешные моменты и маленькие победы.</p></div><div className="pq-diary-count">{data.diary.length} записей</div></div>
        <div className="pq-diary-compose">
          <div className="pq-diary-photo"><div className="pq-dog-visual pq-diary-dog"><img src={portrait} alt={profile.name} /></div></div>
          <div className="pq-diary-fields"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Что случилось сегодня?" maxLength={48} /><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Короткая заметка о вашем дне" maxLength={220} rows={4} /><button type="button" onClick={addDiaryEntry}>Сохранить воспоминание</button></div>
        </div>
        <div className="pq-diary-list">{data.diary.length === 0 && <div className="pq-empty-state"><span>📷</span><b>Первое воспоминание ждёт</b><p>Добавь запись, и здесь начнёт собираться ваша общая история.</p></div>}{data.diary.map((entry) => <article key={entry.id}><small>{entry.date}</small><b>{entry.title}</b><p>{entry.text}</p></article>)}</div>
      </section>
    )
  }

  return (
    <section className="pq-screen pq-secondary-screen">
      <button className="pq-back-button" type="button" onClick={onClose}>‹ Профиль</button>
      <div className="pq-page-title"><div><span>ЗАБОТА</span><h1>Здоровье</h1><p>Локальная карточка важных дат. Для медицинских решений ориентируйся на ветеринара.</p></div><span className="pq-health-heart">♥</span></div>
      <div className="pq-health-grid">
        <label><span>⚖️</span><div><b>Вес</b><small>кг</small></div><input value={data.health.weight} onChange={(event) => updateHealth('weight', event.target.value)} inputMode="decimal" placeholder="5.8" /></label>
        <label><span>🩺</span><div><b>Следующий визит</b><small>ветеринар</small></div><input type="date" value={data.health.nextVetVisit} onChange={(event) => updateHealth('nextVetVisit', event.target.value)} /></label>
        <label><span>💉</span><div><b>Прививка</b><small>следующая дата</small></div><input type="date" value={data.health.nextVaccine} onChange={(event) => updateHealth('nextVaccine', event.target.value)} /></label>
        <label><span>🌿</span><div><b>Обработка</b><small>от паразитов</small></div><input type="date" value={data.health.parasiteTreatment} onChange={(event) => updateHealth('parasiteTreatment', event.target.value)} /></label>
        <label className="wide"><span>💊</span><div><b>Лекарства и заметки</b><small>то, что назначено или важно помнить</small></div><input value={data.health.medication} onChange={(event) => updateHealth('medication', event.target.value)} placeholder="Название и режим по назначению врача" /></label>
      </div>
      <div className="pq-info-card health"><span>🔔</span><div><b>Напоминания</b><p>Следующим этапом подключим системные уведомления к сохранённым датам.</p></div></div>
      <div className="pq-info-card"><span>●</span><div><b>Игровой прогресс</b><p>{profile.name}: {coins} монет, уровень {level}, серия {streak} дней.</p></div></div>
    </section>
  )
}
