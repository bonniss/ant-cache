/**
 * Ant Cache Configuration
 */
interface AntCacheConfig {
  /**
   * The period in seconds, as a number, used for the automatic delete check interval.
   * 0 = no periodic check.
   * default: `15 seconds`
   */
  readonly checkPeriod?: number;

  /**
   * default TTL in seconds.
   * can be overridden when `set` individually
   * default: equals to default checkPeriod
   */
  readonly ttl?: number;

  /**
   * Specifies a maximum amount of keys that can be stored in the cache. If a new item is set and the cache is full, an error is thrown and the key will not be saved in the cache.
   * `0` disables the key limit.
   * default: `0`
   */
  readonly maxKeys?: number;

  /**
   * Handlers to hook into lifecycle methods
   */
  // hooks?: {
  //   init: (...args) => void;
  // };
}

export default AntCacheConfig;
