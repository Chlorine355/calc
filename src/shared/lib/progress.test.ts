import { describe, it, expect, beforeEach } from 'vitest'
import { loadProgress, saveProgress, recordHighScore, PROGRESS_KEY } from './progress'

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
    expect(loadProgress()).toEqual({ currentLevel: 1, highestLevel: 1, highestScore: 0 })
  })

  it('сохраняет и читает прогресс', () => {
    saveProgress({ currentLevel: 7, highestLevel: 12, highestScore: 3.5 })
    expect(loadProgress()).toEqual({ currentLevel: 7, highestLevel: 12, highestScore: 3.5 })
  })

  it('переживает повреждённые данные', () => {
    localStorage.setItem(PROGRESS_KEY, 'не-json')
    expect(loadProgress()).toEqual({ currentLevel: 1, highestLevel: 1, highestScore: 0 })
  })

  it('отбрасывает некорректные значения', () => {
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ currentLevel: -3, highestLevel: 'x', highestScore: -1 })
    )
    expect(loadProgress()).toEqual({ currentLevel: 1, highestLevel: 1, highestScore: 0 })
  })

  it('recordHighScore сохраняет максимум', () => {
    saveProgress({ currentLevel: 1, highestLevel: 1, highestScore: 2 })
    expect(recordHighScore(5)).toBe(5)
    expect(recordHighScore(3)).toBe(5)
    expect(loadProgress().highestScore).toBe(5)
  })
})
