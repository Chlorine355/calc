import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadAchievements,
  saveAchievements,
  awardAchievement,
  awardAchievements,
  ACHIEVEMENTS_KEY,
  AchievementId,
  type AchievementsState,
} from './achievements'

// Node-окружение vitest не имеет localStorage — подменяем простым хранилищем.
function createStorageMock(): Storage {
  let store: Record<string, string> = {}
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => {
      store[k] = String(v)
    },
    removeItem: (k) => {
      delete store[k]
    },
    clear: () => {
      store = {}
    },
    key: (i) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length
    },
  }
}

const allFalse: AchievementsState = {
  [AchievementId.FirstExponential]: false,
  [AchievementId.VeryBigNumber]: false,
  [AchievementId.SixtySeven]: false,
  [AchievementId.Millionaire]: false,
  [AchievementId.Devil]: false,
  [AchievementId.ElonMusk]: false,
}

/** Строит полное состояние из частичных правок поверх allFalse. */
function state(partial: Partial<AchievementsState>): AchievementsState {
  return { ...allFalse, ...partial }
}

describe('achievements persistence', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createStorageMock(),
      writable: true,
    })
    localStorage.clear()
  })

  it('по умолчанию все достижения не получены', () => {
    expect(loadAchievements()).toEqual(allFalse)
  })

  it('сохраняет и читает бинарное состояние', () => {
    saveAchievements(state({ [AchievementId.FirstExponential]: true }))
    expect(loadAchievements()).toEqual(state({ [AchievementId.FirstExponential]: true }))
  })

  it('awardAchievement отмечает достижение идемпотентно и сохраняет', () => {
    const a = awardAchievement(AchievementId.FirstExponential)
    expect(a[AchievementId.FirstExponential]).toBe(true)
    expect(JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY)!)).toEqual(
      state({ [AchievementId.FirstExponential]: true }),
    )
    // повторное начисление не ломает
    const b = awardAchievement(AchievementId.FirstExponential)
    expect(b[AchievementId.FirstExponential]).toBe(true)
    expect(b[AchievementId.VeryBigNumber]).toBe(false)
  })

  it('awardAchievements отмечает несколько достижений сразу', () => {
    const a = awardAchievements([AchievementId.Millionaire, AchievementId.ElonMusk])
    expect(a[AchievementId.Millionaire]).toBe(true)
    expect(a[AchievementId.ElonMusk]).toBe(true)
    expect(a[AchievementId.Devil]).toBe(false)
  })

  it('повреждённые данные возвращают дефолт', () => {
    localStorage.setItem(ACHIEVEMENTS_KEY, '{invalid json')
    expect(loadAchievements()).toEqual(allFalse)
  })
})
