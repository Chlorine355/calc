import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadProgress,
  saveProgress,
  recordHighScore,
  recordBombHighScore,
  recordDailyCompletion,
  todayKey,
  PROGRESS_KEY,
} from './progress'

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

describe('progress persistence', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createStorageMock(),
      writable: true,
    })
    localStorage.clear()
  })

  it('возвращает стартовые значения, если ничего не сохранено', () => {
    expect(loadProgress()).toEqual({
      currentLevel: 1,
      highestLevel: 1,
      highestScore: 0,
      bombHighScore: 0,
      dailyLastPlayed: '',
      dailyBestScore: 0,
    })
  })

  it('сохраняет и читает прогресс', () => {
    saveProgress({
      currentLevel: 7,
      highestLevel: 12,
      highestScore: 3.5,
      bombHighScore: 4,
      dailyLastPlayed: '2026-09-01',
      dailyBestScore: 2.5,
    })
    expect(loadProgress()).toEqual({
      currentLevel: 7,
      highestLevel: 12,
      highestScore: 3.5,
      bombHighScore: 4,
      dailyLastPlayed: '2026-09-01',
      dailyBestScore: 2.5,
    })
  })

  it('переживает повреждённые данные', () => {
    localStorage.setItem(PROGRESS_KEY, 'не-json')
    expect(loadProgress()).toEqual({
      currentLevel: 1,
      highestLevel: 1,
      highestScore: 0,
      bombHighScore: 0,
      dailyLastPlayed: '',
      dailyBestScore: 0,
    })
  })

  it('отбрасывает некорректные значения', () => {
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({
        currentLevel: -3,
        highestLevel: 'x',
        highestScore: -1,
        dailyLastPlayed: 'не-дата',
        dailyBestScore: -5,
      })
    )
    expect(loadProgress()).toEqual({
      currentLevel: 1,
      highestLevel: 1,
      highestScore: 0,
      bombHighScore: 0,
      dailyLastPlayed: '',
      dailyBestScore: 0,
    })
  })

  it('recordHighScore сохраняет максимум', () => {
    saveProgress({
      currentLevel: 1,
      highestLevel: 1,
      highestScore: 2,
      bombHighScore: 0,
      dailyLastPlayed: '',
      dailyBestScore: 0,
    })
    expect(recordHighScore(5)).toBe(5)
    expect(recordHighScore(3)).toBe(5)
    expect(loadProgress().highestScore).toBe(5)
  })

  it('recordBombHighScore сохраняет максимум отдельно от обычного рекорда', () => {
    saveProgress({
      currentLevel: 1,
      highestLevel: 1,
      highestScore: 2,
      bombHighScore: 0,
      dailyLastPlayed: '',
      dailyBestScore: 0,
    })
    expect(recordBombHighScore(7)).toBe(7)
    expect(recordBombHighScore(4)).toBe(7)
    expect(loadProgress().bombHighScore).toBe(7)
    // обычный рекорд не затронут
    expect(loadProgress().highestScore).toBe(2)
  })

  it('recordDailyCompletion отмечает сегодня и обновляет рекорд', () => {
    saveProgress({
      currentLevel: 1,
      highestLevel: 1,
      highestScore: 0,
      bombHighScore: 0,
      dailyLastPlayed: '',
      dailyBestScore: 0,
    })
    expect(recordDailyCompletion(3.2)).toBe(3.2)
    expect(recordDailyCompletion(2.1)).toBe(3.2)
    const p = loadProgress()
    expect(p.dailyBestScore).toBe(3.2)
    expect(p.dailyLastPlayed).toBe(todayKey())
  })
})
