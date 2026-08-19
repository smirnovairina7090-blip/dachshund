import { useMemo, useState } from 'react'
import App from './App'
import { dogBreedById, dogBreeds, type DogBreedId } from './data/dogBreeds'
import {
  DOG_PROFILE_STORAGE_KEY,
  makeDogProfile,
  normalizeDogName,
  parseDogProfile,
  syncLegacyGameName,
  type DogProfile,
} from './data/dogProfile'
import './styles/onboarding.css'

const BASE = import.meta.env.BASE_URL

function loadProfile() {
  return parseDogProfile(localStorage.getItem(DOG_PROFILE_STORAGE_KEY))
}

export default function PawQuestRoot() {
  const [profile, setProfile] = useState<DogProfile | null>(() => loadProfile())
  const [editing, setEditing] = useState(() => !loadProfile())
  const [draftName, setDraftName] = useState(() => profile?.name ?? '')
  const [draftBreed, setDraftBreed] = useState<DogBreedId>(() => profile?.breedId ?? 'dachshund')
  const [error, setError] = useState('')

  const selectedBreed = useMemo(() => dogBreedById[draftBreed], [draftBreed])
  const activeBreed = profile ? dogBreedById[profile.breedId] : selectedBreed

  function openProfileEditor() {
    setDraftName(profile?.name ?? '')
    setDraftBreed(profile?.breedId ?? 'dachshund')
    setError('')
    setEditing(true)
  }

  function saveProfile() {
    const cleanName = normalizeDogName(draftName)
    if (!cleanName) {
      setError('Напиши кличку собаки, чтобы продолжить.')
      return
    }

    const nextProfile = makeDogProfile(cleanName, draftBreed, profile)
    localStorage.setItem(DOG_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile))
    syncLegacyGameName(localStorage, nextProfile.name)
    setProfile(nextProfile)
    setDraftName(nextProfile.name)
    setEditing(false)
    setError('')
  }

  if (editing || !profile) {
    return (
      <main className="onboarding-shell">
        <section className="onboarding-card" aria-labelledby="welcome-title">
          <div className="onboarding-copy">
            <span className="onboarding-kicker">PAWQUEST</span>
            <h1 id="welcome-title">Расскажи, кто твой напарник</h1>
            <p>Профиль влияет на подсказки по уходу, факты, задания и будущий набор анимаций персонажа.</p>
          </div>

          <div className="onboarding-grid">
            <div className="onboarding-form">
              <label className="field-label" htmlFor="dog-name">Кличка</label>
              <input
                id="dog-name"
                className="dog-name-input"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Например, Мотя"
                maxLength={18}
                autoComplete="off"
                autoFocus
              />

              <fieldset className="breed-fieldset">
                <legend>Порода</legend>
                <div className="breed-choice-grid">
                  {dogBreeds.map((breed) => (
                    <button
                      type="button"
                      className={`breed-choice ${draftBreed === breed.id ? 'active' : ''}`}
                      key={breed.id}
                      onClick={() => setDraftBreed(breed.id)}
                    >
                      <span className="breed-choice-mark">{breed.id === 'dachshund' ? '🐕' : breed.id === 'jack-russell' ? '🎾' : '🦮'}</span>
                      <span><b>{breed.name}</b><small>{breed.subtitle}</small></span>
                      <i>{draftBreed === breed.id ? '✓' : ''}</i>
                    </button>
                  ))}
                </div>
              </fieldset>

              {error && <p className="onboarding-error" role="alert">{error}</p>}

              <div className="onboarding-actions">
                {profile && <button className="secondary-onboarding-button" type="button" onClick={() => setEditing(false)}>Отмена</button>}
                <button className="primary-onboarding-button" type="button" onClick={saveProfile}>Продолжить</button>
              </div>
            </div>

            <aside className="breed-preview">
              <span className="breed-preview-label">ВЫБРАНО</span>
              <div className="breed-preview-art">
                {draftBreed === 'dachshund' ? (
                  <img src={`${BASE}assets/motya/motya-game.webp`} alt="Игровой образ таксы" />
                ) : (
                  <div className="sprite-coming-soon">
                    <span>{draftBreed === 'jack-russell' ? '🎾' : '🌊'}</span>
                    <b>Спрайт-пак готовится</b>
                    <small>Персонаж будет подключён без изменения профиля.</small>
                  </div>
                )}
              </div>
              <h2>{selectedBreed.name}</h2>
              <p>{selectedBreed.dailyFocus}</p>
              <div className="temperament-list">
                {selectedBreed.temperament.map((trait) => <span key={trait}>{trait}</span>)}
              </div>
            </aside>
          </div>
        </section>
      </main>
    )
  }

  return (
    <div className="pawquest-root">
      <div className="profile-ribbon">
        <div>
          <span className="profile-ribbon-kicker">{activeBreed.name}</span>
          <b>{profile.name}</b>
          <small>{activeBreed.subtitle}</small>
        </div>
        <div className="profile-ribbon-tip">
          <span>💡</span>
          <p>{activeBreed.dailyFocus}</p>
        </div>
        <button type="button" onClick={openProfileEditor}>Профиль</button>
      </div>
      <App key={`${profile.breedId}-${profile.name}-${profile.updatedAt}`} />
    </div>
  )
}
