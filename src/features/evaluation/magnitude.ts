import type { MathNode } from 'mathjs'

/**
 * Оценка порядка величины результата выражения БЕЗ его вычисления.
 *
 * Зачем: mathjs при `node.evaluate()` на выражениях вроде `9^(9^9)` материализует
 * астрономически огромное целое (сотни мегабайт / миллионы разрядов). Это роняет
 * поток (воркер) ДО того, как какой-либо try/catch успеет сработать — исключение
 * просто некому поймать. Поэтому перед evaluate() мы приближённо прикидываем
 * порядок (log10) результата и, если он превышает безопасный предел, коротко
 * замыкаем вычисление и сообщаем «ОЧЕНЬ БОЛЬШОЕ ЧИСЛО».
 *
 * Оценка считается по самому дереву парсера (числа, + − * / ^ !, √, скобки) и
 * обходится дёшево. Оценка — только для решения «огромно / не огромно», точность
 * порядка не важна; главное — не дать mathjs дойти до взрывающегося evaluate().
 */

/** Порядок, при котором операнд уже небезопасно материализовать в evaluate(). */
const SAFE_OPERAND_LOG10 = 1e6

/** Порядок, при котором результат считаем «ОЧЕНЬ БОЛЬШИМ ЧИСЛОМ». */
export const HUGE_RESULT_LOG10 = 1e7

interface Est {
  huge: boolean
  nan: boolean
  zero: boolean
  neg: boolean
  /** log10(|value|), null если huge/nan/zero */
  log10: number | null
  /** фактическое значение, если |value| мало и влезает во float */
  val: number | null
}

function base(): Est {
  return { huge: false, nan: false, zero: false, neg: false, log10: null, val: null }
}

function hugeEst(neg = false): Est {
  const e = base()
  e.huge = true
  e.neg = neg
  return e
}
function nanEst(): Est {
  const e = base()
  e.nan = true
  return e
}

function fromVal(v: number, neg: boolean): Est {
  const e = base()
  e.neg = neg
  const a = Math.abs(v)
  if (!Number.isFinite(a)) {
    return nanEst()
  }
  if (a === 0) {
    e.zero = true
    return e
  }
  e.log10 = Math.log10(a)
  if (Math.abs(v) < 1e12) {
    e.val = v
  }
  if (e.log10 > HUGE_RESULT_LOG10) {
    e.huge = true
  }
  return e
}

/** log10(|value|), грубое приближение факториала (Стирлинг). */
function stirlingLog10(a: number): number {
  if (a <= 0) return 0
  return 0.5 * Math.log10(2 * Math.PI * a) + a * Math.log10(a) - a * Math.LOG10E
}

/** Операнд с таким порядком небезопасен для материализации внутри evaluate(). */
function operandRisky(e: Est): boolean {
  if (e.huge) return true
  if (e.log10 != null && e.log10 > SAFE_OPERAND_LOG10) return true
  return false
}

/** Проверка, что число конечно (typeof === 'number' уже гарантирован). */
function isFiniteNumber(v: number): boolean {
  return isFinite(v)
}

/**
 * Приближённая оценка узла. Возвращает Est.
 * Функция НИКОГДА не бросает исключений.
 */
function estimate(node: MathNode): Est {
  try {
    switch (node.type) {
      case 'ConstantNode': {
        const v = (node as { value?: unknown }).value
        const num = typeof v === 'number' ? v : Number(v)
        if (Number.isNaN(num)) return nanEst()
        return fromVal(num, num < 0)
      }

      case 'ParenthesisNode':
        return estimate((node as unknown as { content: MathNode }).content)

      case 'FunctionNode': {
        const fnNode = node as { fn?: { name?: string }; args?: MathNode[] }
        const fn = fnNode.fn?.name ?? ''
        const arg = fnNode.args?.[0]
        if (arg && (fn === 'sqrt' || fn === 'squareRoot')) {
          const inner = estimate(arg)
          if (inner.nan) return nanEst()
          if (inner.zero) {
            const e = base()
            e.zero = true
            return e
          }
          if (inner.neg) return nanEst() // корень из отрицательного — ошибка
          if (inner.huge) return hugeEst()
          const e = base()
          e.log10 = inner.log10! / 2
          if (e.log10! > HUGE_RESULT_LOG10) {
            e.huge = true
          } else if (inner.val != null && inner.val >= 0) {
            const s = Math.sqrt(inner.val)
            if (Math.abs(s) < 1e12) e.val = s
          }
          return e
        }
        // Неизвестная функция — не оцениваем как огромную.
        const e = base()
        e.log10 = 0
        return e
      }

      case 'OperatorNode': {
        const opNode = node as { op?: string; fn?: string; args?: MathNode[] }
        const op = opNode.op ?? ''
        const fn = opNode.fn ?? ''
        const args = opNode.args ?? []

        // Факториал (постфиксный унарный)
        if (op === '!') {
          const inner = estimate(args[0])
          if (inner.nan) return nanEst()
          if (inner.zero || (inner.val != null && inner.val === 0)) {
            const e = base()
            e.val = 1
            e.log10 = 0
            return e
          }
          if (inner.neg) return nanEst() // отрицательное в факториал — NaN
          const v = inner.val
          if (v == null) {
            // значение неизвестно и порядок велик → факториал огромен
            return hugeEst()
          }
          const a = Math.abs(v)
          // materialize операнда (самого значения) небезопасен? он уже val известен
          const l = stirlingLog10(a)
          if (l > HUGE_RESULT_LOG10 || a > SAFE_OPERAND_LOG10) {
            return hugeEst()
          }
          const e = base()
          e.log10 = Math.max(0, l)
          if (a < 50 && Number.isInteger(a)) {
            let f = 1
            for (let i = 2; i <= a; i++) f *= i
            e.val = f
          }
          return e
        }

        // Унарный минус
        if (args.length === 1 && (fn === 'unaryMinus' || op === '-')) {
          const inner = estimate(args[0])
          const e = { ...inner }
          e.neg = !inner.neg
          if (inner.log10 != null && inner.log10 > HUGE_RESULT_LOG10) e.huge = true
          return e
        }

        if (args.length < 2) {
          const e = base()
          e.log10 = 0
          return e
        }

        const a = estimate(args[0])
        const b = estimate(args[1])

        if (op === '^' || fn === 'pow') return powEstimate(a, b)
        if (op === '*') {
          if (operandRisky(a) || operandRisky(b)) return hugeEst(a.neg !== b.neg)
          if (a.nan || b.nan) return nanEst()
          if (a.zero || b.zero) {
            const e = base()
            e.zero = true
            e.neg = a.neg !== b.neg
            return e
          }
          const l = a.log10! + b.log10!
          if (l > HUGE_RESULT_LOG10) return hugeEst()
          const e = base()
          e.log10 = l
          e.neg = a.neg !== b.neg
          if (a.val != null && b.val != null) {
            const p = a.val * b.val
            if (isFiniteNumber(p) && Math.abs(p) < 1e12) e.val = p
          }
          return e
        }
        if (op === '/') {
          if (operandRisky(a) || operandRisky(b)) return hugeEst(a.neg !== b.neg)
          if (a.nan || b.nan) return nanEst()
          if (b.zero || (b.val != null && b.val === 0)) {
            // деление на ноль — обработает evaluate (ошибка)
            const e = base()
            e.nan = true
            return e
          }
          if (a.zero) {
            const e = base()
            e.zero = true
            e.neg = a.neg !== b.neg
            return e
          }
          const l = a.log10! - b.log10!
          if (l > HUGE_RESULT_LOG10) return hugeEst()
          const e = base()
          e.log10 = l
          e.neg = a.neg !== b.neg
          if (a.val != null && b.val != null) {
            const q = a.val / b.val
            if (isFiniteNumber(q) && Math.abs(q) < 1e12) e.val = q
          }
          return e
        }
        if (op === '+' || op === '-') {
          // Ужесточаем: сложение материализует больший операнд целиком.
          if (operandRisky(a) || operandRisky(b)) {
            // Знак результата определяет огромный операнд. Для вычитания, когда
            // огромный операнд — вычитаемое (справа), знак инвертируется.
            const aRisky = operandRisky(a)
            const bRisky = operandRisky(b)
            if (aRisky && !bRisky) return hugeEst(a.neg)
            if (bRisky && !aRisky) return hugeEst(op === '-' ? !b.neg : b.neg)
            // Оба огромны — знак неопределён, не считаем отрицательным.
            return hugeEst(false)
          }
          if (a.nan || b.nan) return nanEst()
          if (a.zero) {
            const e = { ...b }
            if (op === '-') e.neg = !b.neg
            return e
          }
          if (b.zero) return { ...a }
          const la = a.log10!
          const lb = b.log10!
          let max: number, min: number, maxNeg: boolean
          if (la >= lb) {
            max = la
            min = lb
            maxNeg = a.neg
          } else {
            max = lb
            min = la
            maxNeg = op === '-' ? !b.neg : b.neg
          }
          const mag = max + Math.log10(1 + Math.pow(10, min - max))
          const e = base()
          e.log10 = mag
          e.neg = maxNeg
          if (a.val != null && b.val != null) {
            const s = op === '-' ? a.val - b.val : a.val + b.val
            if (isFiniteNumber(s) && Math.abs(s) < 1e12) {
              e.val = s
              e.log10 = Math.log10(Math.abs(s) || 1e-300)
            }
          }
          return e
        }
        // Прочие операторы — не оцениваем как огромные.
        const e = base()
        e.log10 = 0
        return e
      }

      default: {
        const e = base()
        e.log10 = 0
        return e
      }
    }
  } catch {
    return base()
  }
}

function powEstimate(baseEst: Est, expEst: Est): Est {
  if (baseEst.nan || expEst.nan) return nanEst()
  if (baseEst.huge || expEst.huge) return hugeEst()
  if (baseEst.zero) {
    // 0^b
    const e = base()
    if (expEst.val != null && expEst.val === 0) {
      e.val = 1
      e.log10 = 0
    } else {
      e.zero = true
    }
    return e
  }
  const aLog = baseEst.log10
  const expVal = expEst.val
  if (aLog == null) return hugeEst() // база огромна → результат огромен (exp ≠ 0)
  if (expVal == null) {
    // показатель неизвестен; если |база| ≈ 1 → результат малой величины
    if (Math.abs(aLog) < 1e-9) {
      const e = base()
      e.val = 1
      e.log10 = 0
      return e
    }
    return hugeEst()
  }
  const l = Math.abs(expVal) * aLog
  if (l > HUGE_RESULT_LOG10 || aLog > SAFE_OPERAND_LOG10) return hugeEst()
  const e = base()
  e.log10 = l
  e.neg = baseEst.neg && Number.isInteger(expVal) && expVal % 2 !== 0 && expVal > 0
  if (baseEst.val != null && Number.isInteger(expVal) && Math.abs(expVal) < 50) {
    let r = 1
    for (let i = 0; i < Math.abs(expVal); i++) r *= baseEst.val
    if (isFiniteNumber(r) && Math.abs(r) < 1e12) {
      e.val = r
      e.log10 = Math.log10(Math.abs(r))
    }
  }
  return e
}

/**
 * Является ли результат выражения астрономически огромным (или небезопасным для
 * материализации)? Если да — вызывающий НЕ должен звать evaluate().
 * Функция НИКОГДА не бросает исключений.
 */
export function isAstronomicallyHuge(node: MathNode): boolean {
  return estimate(node).huge
}

/**
 * Знак астрономически огромного результата (true — отрицательный).
 * Вызывать только когда isAstronomicallyHuge(node) === true.
 * Функция НИКОГДА не бросает исключений.
 */
export function isHugeNegative(node: MathNode): boolean {
  const est = estimate(node)
  return est.huge && est.neg;
}
