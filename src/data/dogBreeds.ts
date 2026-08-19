export type DogBreedId = 'dachshund' | 'jack-russell' | 'labrador'

export type DogBreed = {
  id: DogBreedId
  name: string
  subtitle: string
  temperament: string[]
  dailyFocus: string
  facts: string[]
  spriteRoot: string
}

export const dogBreeds: DogBreed[] = [
  {
    id: 'dachshund',
    name: 'Такса',
    subtitle: 'Любопытный исследователь',
    temperament: ['смелая', 'умная', 'настойчивая'],
    dailyFocus: 'Беречь спину, поддерживать здоровый вес и выбирать разумную нагрузку без постоянных высоких прыжков.',
    facts: [
      'Такс выводили для работы в норах, поэтому поисковые и нюхательные игры хорошо ложатся на историю породы.',
      'Из-за вытянутого корпуса особенно важно следить за весом и разумно относиться к повторяющимся прыжкам с высоты.',
      'Короткие тренировки с понятной наградой часто хорошо подходят самостоятельному характеру таксы.',
    ],
    spriteRoot: 'assets/sprites/dachshund',
  },
  {
    id: 'jack-russell',
    name: 'Джек-рассел-терьер',
    subtitle: 'Энергичный умник',
    temperament: ['активный', 'сообразительный', 'азартный'],
    dailyFocus: 'Чередовать физическую активность с поисковыми задачами и короткими тренировками самоконтроля.',
    facts: [
      'Джек-расселы быстро учатся и обычно нуждаются не только в движении, но и в интеллектуальной нагрузке.',
      'Игры на поиск запаха и еды помогают занять собаку без бесконечного увеличения физической нагрузки.',
      'Короткие регулярные занятия обычно удобнее длинных однообразных тренировок.',
    ],
    spriteRoot: 'assets/sprites/jack-russell',
  },
  {
    id: 'labrador',
    name: 'Лабрадор-ретривер',
    subtitle: 'Добродушный напарник',
    temperament: ['дружелюбный', 'обучаемый', 'контактный'],
    dailyFocus: 'Контролировать порции, поддерживать регулярную активность и учитывать лакомства в общем рационе.',
    facts: [
      'Многие лабрадоры хорошо мотивируются едой, поэтому часть обычного рациона можно использовать в обучении.',
      'Апортировка и плавание часто нравятся лабрадорам, если конкретной собаке такая нагрузка подходит по здоровью.',
      'Контроль веса особенно важен, поэтому приложение будет учитывать кормление и лакомства как единую систему.',
    ],
    spriteRoot: 'assets/sprites/labrador',
  },
]

export const dogBreedById = Object.fromEntries(
  dogBreeds.map((breed) => [breed.id, breed]),
) as Record<DogBreedId, DogBreed>

export const dogAnimationStates = [
  'idle',
  'happy',
  'walk',
  'play',
  'tired',
  'sleep',
  'celebrate',
] as const

export type DogAnimationState = (typeof dogAnimationStates)[number]
