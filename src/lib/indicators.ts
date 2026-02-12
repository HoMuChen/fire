/**
 * Technical indicator calculation functions for Taiwan stock analysis.
 * All functions are pure and return arrays of (number | null)[] where
 * null indicates insufficient data for that index.
 */

/**
 * Simple Moving Average
 * Returns null for indices < period - 1
 */
export function calcSMA(
  closes: number[],
  period: number
): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += closes[j];
    }
    result[i] = sum / period;
  }

  return result;
}

/**
 * Exponential Moving Average
 * Seeded with SMA of first `period` values.
 * multiplier = 2 / (period + 1)
 */
export function calcEMA(
  closes: number[],
  period: number
): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);

  if (closes.length < period) return result;

  // Seed with SMA of first `period` values
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += closes[i];
  }
  const sma = sum / period;
  result[period - 1] = sma;

  const multiplier = 2 / (period + 1);

  for (let i = period; i < closes.length; i++) {
    const prev = result[i - 1] as number;
    result[i] = (closes[i] - prev) * multiplier + prev;
  }

  return result;
}

/**
 * Relative Strength Index using Wilder's smoothing method.
 * First avg gain/loss = simple average of first `period` changes.
 * Subsequent: avg = (prev_avg * (period - 1) + current) / period
 */
export function calcRSI(
  closes: number[],
  period: number = 14
): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);

  if (closes.length < period + 1) return result;

  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  // First average gain and loss from the first `period` changes
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }
  avgGain /= period;
  avgLoss /= period;

  // RSI at index period (changes index period-1 corresponds to closes index period)
  if (avgLoss === 0) {
    result[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    result[period] = 100 - 100 / (1 + rs);
  }

  // Subsequent values using Wilder's smoothing
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result[i + 1] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i + 1] = 100 - 100 / (1 + rs);
    }
  }

  return result;
}

/**
 * MACD (Moving Average Convergence Divergence)
 * DIF = EMA(fast) - EMA(slow)
 * Signal = EMA(signal) of non-null DIF values
 * Histogram = DIF - Signal
 */
export function calcMACD(
  closes: number[],
  fast: number = 12,
  slow: number = 26,
  signal: number = 9
): {
  dif: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
} {
  const emaFast = calcEMA(closes, fast);
  const emaSlow = calcEMA(closes, slow);

  const dif: (number | null)[] = new Array(closes.length).fill(null);

  // DIF = EMA(fast) - EMA(slow), only where both are non-null
  for (let i = 0; i < closes.length; i++) {
    if (emaFast[i] !== null && emaSlow[i] !== null) {
      dif[i] = (emaFast[i] as number) - (emaSlow[i] as number);
    }
  }

  // Collect non-null DIF values and their indices for signal line calculation
  const nonNullDifs: number[] = [];
  const nonNullIndices: number[] = [];
  for (let i = 0; i < dif.length; i++) {
    if (dif[i] !== null) {
      nonNullDifs.push(dif[i] as number);
      nonNullIndices.push(i);
    }
  }

  // Calculate EMA of the non-null DIF values
  const signalRaw = calcEMA(nonNullDifs, signal);

  // Map signal values back to the original indices
  const signalLine: (number | null)[] = new Array(closes.length).fill(null);
  for (let i = 0; i < signalRaw.length; i++) {
    if (signalRaw[i] !== null) {
      signalLine[nonNullIndices[i]] = signalRaw[i];
    }
  }

  // Histogram = DIF - Signal
  const histogram: (number | null)[] = new Array(closes.length).fill(null);
  for (let i = 0; i < closes.length; i++) {
    if (dif[i] !== null && signalLine[i] !== null) {
      histogram[i] = (dif[i] as number) - (signalLine[i] as number);
    }
  }

  return { dif, signal: signalLine, histogram };
}

/**
 * Stochastic Oscillator (KD)
 * RSV = (close - lowest_low) / (highest_high - lowest_low) * 100
 * K = 2/3 * prev_K + 1/3 * RSV (seed K = 50)
 * D = 2/3 * prev_D + 1/3 * K (seed D = 50)
 */
export function calcKD(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 9
): {
  k: (number | null)[];
  d: (number | null)[];
} {
  const len = closes.length;
  const k: (number | null)[] = new Array(len).fill(null);
  const d: (number | null)[] = new Array(len).fill(null);

  if (len < period) return { k, d };

  let prevK = 50;
  let prevD = 50;

  for (let i = period - 1; i < len; i++) {
    // Find highest high and lowest low in the lookback period
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (highs[j] > highestHigh) highestHigh = highs[j];
      if (lows[j] < lowestLow) lowestLow = lows[j];
    }

    // Calculate RSV
    let rsv: number;
    if (highestHigh === lowestLow) {
      rsv = 50; // Avoid division by zero
    } else {
      rsv = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
    }

    // Calculate K and D
    const currentK = (2 / 3) * prevK + (1 / 3) * rsv;
    const currentD = (2 / 3) * prevD + (1 / 3) * currentK;

    k[i] = currentK;
    d[i] = currentD;

    prevK = currentK;
    prevD = currentD;
  }

  return { k, d };
}

/**
 * Bollinger Bands
 * middle = SMA(period)
 * upper = middle + mult * stddev
 * lower = middle - mult * stddev
 */
export function calcBollinger(
  closes: number[],
  period: number = 20,
  mult: number = 2
): {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
} {
  const middle = calcSMA(closes, period);
  const upper: (number | null)[] = new Array(closes.length).fill(null);
  const lower: (number | null)[] = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    const sma = middle[i] as number;

    // Calculate standard deviation of last `period` closes
    let sumSquaredDiff = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = closes[j] - sma;
      sumSquaredDiff += diff * diff;
    }
    const stddev = Math.sqrt(sumSquaredDiff / period);

    upper[i] = sma + mult * stddev;
    lower[i] = sma - mult * stddev;
  }

  return { upper, middle, lower };
}
