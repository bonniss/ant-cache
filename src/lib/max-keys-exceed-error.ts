/**
 * Attempting to add a new key
 * while the cache is full
 * (`size()` equals to `maxKeys` in config) will
 * throw this error type
 */
export class MaxKeysExceedError extends Error {
  constructor(maxKeys: number) {
    super(`Allow maximum ${maxKeys} keys.`);
    this.name = 'MaxKeysExceedError';
  }
}
