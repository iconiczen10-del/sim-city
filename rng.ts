// rng.ts — Deterministic mulberry32 PRNG stream and seeded simulation helpers

let activeState = 0x6d2b79f5;

export function createRandomSeed(): number {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    return (buf[0] % 900000) + 100000;
  }
  return ((Date.now() ^ 0x9e3779b9) >>> 0) % 900000 + 100000;
}

export function normalizeSeed(seed: number): number {
  const n = Math.floor(Math.abs(seed)) >>> 0;
  return n === 0 ? 48213 : n;
}

export function syncSimRng(state: number): void {
  activeState = state >>> 0 || 48213;
}

export function getSimRngState(): number {
  return activeState >>> 0;
}

export function stepMulberry32(state: number): { value: number; nextState: number } {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = Math.imul(next ^ (next >>> 15), 1 | next);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, nextState: next };
}

export function createSeededRng(seed: number): () => number {
  let s = normalizeSeed(seed);
  return () => {
    const res = stepMulberry32(s);
    s = res.nextState;
    return res.value;
  };
}

export function simRand(): number {
  const res = stepMulberry32(activeState);
  activeState = res.nextState;
  return res.value;
}

export function simRandInt(min: number, max: number): number {
  return Math.floor(simRand() * (max - min + 1)) + min;
}

export function simRandFloat(min: number, max: number): number {
  return min + simRand() * (max - min);
}

export function simPick<T>(arr: readonly T[]): T {
  return arr[Math.floor(simRand() * arr.length)];
}

export function simShuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(simRand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function simIdSuffix(): string {
  return Math.floor(simRand() * 1679616).toString(36).padStart(4, '0');
}
