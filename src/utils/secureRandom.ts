/**
 * Generates a cryptographically secure random integer between min and max (inclusive).
 * Uses window.crypto.getRandomValues to ensure better randomness than Math.random().
 * 
 * @param min The minimum value (inclusive).
 * @param max The maximum value (inclusive).
 * @returns A random integer between min and max.
 */
export function getSecureRandomInt(min: number, max: number): number {
  if (min > max) {
    throw new Error('min must be less than or equal to max');
  }

  const range = max - min + 1;
  const array = new Uint32Array(1);
  
  // To avoid modulo bias, we use a simple rejection sampling method.
  // We only accept values that fall within the largest multiple of 'range' 
  // that fits within the Uint32 space.
  const maxValid = Math.floor(0xFFFFFFFF / range) * range;
  
  let randomValue: number;
  do {
    window.crypto.getRandomValues(array);
    randomValue = array[0];
  } while (randomValue >= maxValid);
  
  return min + (randomValue % range);
}

/**
 * Returns a shuffled copy of the array (Fisher-Yates), without the bias of sort(() => 0.5 - Math.random()).
 */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
