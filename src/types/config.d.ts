/**
 * Ant Cache Configuration
 */
interface AntCacheConfig {
  /**
   * The period in seconds, as a number, used for the automatic delete check interval.
   * 0 = no periodic check.
   *
   * Default: `15 seconds`
   */
  readonly checkPeriod?: number;

  /**
   * Default TTL in seconds.
   *
   * Default: double the default `checkPeriod`
   */
  readonly ttl?: number;

  /**
   * Specifies a maximum amount of keys that can be stored in the cache. If a new item is set and the cache is full, an error is thrown and the key will not be saved in the cache.
   *
   * `0` disables the key limit.
   *
   * Default: `0`
   */
  readonly maxKeys?: number;

  /**
   * whether keys will be deleted automatically when they expire.
   */
  readonly deleteOnExpire?: boolean;
}

export default AntCacheConfig;
