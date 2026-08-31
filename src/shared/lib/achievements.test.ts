import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadAchievements,
  saveAchievements,
  awardAchievement,
  ACHIEVEMENTS_KEY,
  AchievementId,
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

const allFalse = {
  [AchievementId.FirstExponential]: false,
  [AchievementId.VeryBigNumber]: false,
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
    saveAchievements({ ...allFalse, [AchievementId.FirstExponential]: true })
    expect(loadAchievements()).toEqual({
      [AchievementId.FirstExponential]: true,
      [AchievementId.VeryBigNumber]: false,
    })
  })

  it('awardAchievement отмечает достижение идемпотентно и сохраняет', () => {
    const a = awardAchievement(AchievementId.FirstExponential)
    expect(a[AchievementId.FirstExponential]).toBe(true)
    expect(JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY)!)).toEqual({
      [AchievementId.FirstExponential]: true,
      [AchievementId.VeryBigNumber]: false,
    })
    // повторное начисление не ломает
    const b = awardAchievement(AchievementId.FirstExponential)
    expect(b[AchievementId.FirstExponential]).toBe(true)
    expect(b[AchievementId.VeryBigNumber]).toBe(false)
  })

  it('повреждённые данные возвращают дефолт', () => {
    localStorage.setItem(ACHIEVEMENTS_KEY, '{invalid json')
    expect(loadAchievements()).toEqual(allFalse)
  })
})
