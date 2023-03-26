/**
 * Event name
 */
export type AntCacheEvent =
  | 'expired'
  | 'before-set'
  | 'after-set'
  | 'before-delete'
  | 'after-delete';

/**
 * Value type to store
 *
 * Cover native JSON types, plus Set, Map, Date, bigint
 */
export type AntCacheValue =
  | number
  | string
  | boolean
  | null
  | bigint
  | Date
  | Map<AntCacheValue, AntCacheValue>
  | Set<AntCacheValue>
  | { [key: string]: AntCacheValue }
  | AntCacheValue[];

export type AntCacheStats = {
  size: number;
  hits: number;
  misses: number;
};

export type OnExpireCallbackInput = {
  key: string;
  value: AntCacheValue;
  ttl: number;
  deleteCurrentKey: () => void;
};

export interface AntCacheConfig {
  /**
   * The period in seconds, as a number, used for the automatic delete check interval.
   * 0 = no periodic check.
   *
   * @default: 30
   */
  readonly checkPeriod?: number;

  /**
   * Default TTL in seconds.
   *
   * @default: double the default `checkPeriod`
   */
  readonly ttl?: number;

  /**
   * Specifies a maximum amount of keys that can be stored in the cache. If a new item is set and the cache is full, an error is thrown and the key will not be saved in the cache.
   *
   * `0` disables the key limit.
   *
   * @default: 0
   */
  readonly maxKeys?: number;

  /**
   * whether keys will be deleted automatically when they expire.
   */
  readonly deleteOnExpire?: boolean;
}

export as namespace AntCache;
