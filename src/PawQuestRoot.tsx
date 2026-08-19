import { useMemo, useState } from 'react'
import PawQuestGame from './PawQuestGame'
import PawQuestProfileBridge from './components/PawQuestProfileBridge'
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

function dogPortrait(breedId: DogBreedId) {
  return `${BASE}assets/pawquest/${breedId}-portrait.webp`
}

export default function PawQuestRoot() {
  const [profile, setProfile] = useState<DogProfile | null>(() => loadProfile())
  const [editing, setEditing] = useState(() => !loadProfile())
  const [draftName, setDraftName] = useState(() => profile?.name ?? '')
  const [draftBreed, setDraftBreed] = useState<DogBreedId>(() => profile?.breedId ?? 'dachshund')
  const [error, setError] = useState('')

  const selectedBreed = useMemo(() => dogBreedById[draftBreed], [draftBreed])

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
            <h1 id="welcome-title">Кто твой хвостик?</h1>
            <p>Выбери породу и кличку. Дальше задания, подсказки, факты и визуальный персонаж будут подстраиваться под вашу команду.</p>
          </div>

          <div className="onboarding-grid">
            <div className="onboarding-form">
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
                      <img className="breed-choice-photo" src={dogPortrait(breed.id)} alt="" />
                      <span><b>{breed.name}</b><small>{breed.subtitle}</small></span>
                      <i>{draftBreed === breed.id ? '✓' : ''}</i>
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="field-label" htmlFor="dog-name">Как зовут?</label>
              <input
                id="dog-name"
                className="dog-name-input"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Например, Луна"
                maxLength={18}
                autoComplete="off"
              />

              {error && <p className="onboarding-error" role="alert">{error}</p>}

              <div className="onboarding-actions">
                {profile && <button className="secondary-onboarding-button" type="button" onClick={() => setEditing(false)}>Отмена</button>}
                <button className="primary-onboarding-button" type="button" onClick={saveProfile}>Продолжить</button>
              </div>
            </div>

            <aside className="breed-preview">
              <span className="breed-preview-label">ТВОЙ НАПАРНИК</span>
              <div className="breed-preview-art polished">
                <img src={dogPortrait(draftBreed)} alt={`${selectedBreed.name}, игровой персонаж`} />
              </div>
              <h2>{draftName.trim() || selectedBreed.name}</h2>
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

  const activeBreed = dogBreedById[profile.breedId]

  return (
    <>
      <PawQuestGame
        profile={profile}
        breed={activeBreed}
        onEditProfile={openProfileEditor}
      />
      <PawQuestProfileBridge profile={profile} breed={activeBreed} />
    </>
  )
}
