import { EventEmitter } from 'events';

import superjson from 'superjson';

import {
  AntCacheConfig,
  AntCacheEvent,
  AntCacheStats,
  AntCacheValue,
  OnExpireCallbackInput,
} from '../types/ant-cache';

import { MaxKeysExceedError } from './max-keys-exceed-error';
import { jsMapToObject, objectToJsMap } from './utils';

/**
 * Event emitter to listen to specific hooks
 */
export class AntCacheEventEmitter extends EventEmitter {}

const DEFAULT_CHECK_PERIOD = 30;

/**
 * Default cache configuration
 */
export const defaultAntCacheConfig: AntCacheConfig = {
  checkPeriod: DEFAULT_CHECK_PERIOD,
  ttl: 2 * DEFAULT_CHECK_PERIOD,
  maxKeys: 0,
  deleteOnExpire: true,
};

/**
 * ## Get stated
 *
 * ### ES Module
 *
 * ```js
 * import { AntCache } from 'ant-cache';
 * ```
 *
 * ### Common JS
 *
 * ```js
 * const { AntCache } = require('ant-cache');
 * ```
 *
 * ## Usage
 *
 * ### Use cache with TTL
 *
 * ```js
 * // initialize using default config
 * const cache = new AntCache();
 *
 * // initialize with config
 * const cache = new AntCache({
 *   ttl: 120,  // in seconds
 *   checkPeriod: 10,  // in seconds
 *   maxKeys: 1000,  // could hold maximum 1000 key-value pairs
 * })
 * ```
 *
 * ### Use as an enhanced JS `Map` (no TTL)
 *
 * ```js
 * const cache = new AntCache({
 *   checkPeriod: 0
 * });
 * ```
 */
export class AntCache {
  /**
   * The config of the cache
   *
   * Initialized once in the constructor, then read-only
   */
  config: AntCacheConfig;

  /**
   * The main store that interacts with the outside world.
   *
   * Methods to get the cache info, like `size` and `keys`, apply on this.
   */
  mainCache: Map<string, AntCacheValue>;

  /**
   * Store the created timestamp of every key.
   *
   * Must be synced with the main cache every time a new value is set.
   *
   */
  private _createdTsMap: Map<string, number>;

  /**
   * Store the ttl of every key.
   *
   * Must be synced with the main cache every time a new value is set.
   *
   */
  private _ttlMap: Map<string, number>;

  /**
   * The interval timer
   */
  private _timerId: ReturnType<typeof setInterval>;

  /**
   * The event emitter
   */
  private _emitter: AntCacheEventEmitter;

  /**
   * Cache hits
   */
  private _hits = 0;

  /**
   * Cache misses
   */
  private _misses = 0;

  /**
   * `true` if `config.checkPeriod` = 0
   */
  private _checkPeriodDisabled = false;

  /**
   * @param config if no arg passed in, use defaultAntCacheConfig
   *
   * ```ts
   * const DEFAULT_CHECK_PERIOD = 30;
   * export const defaultAntCacheConfig: AntCacheConfig = {
   *    checkPeriod: DEFAULT_CHECK_PERIOD,
   *    ttl: 2 * DEFAULT_CHECK_PERIOD,
   *    maxKeys: 0,
   * };
   * ```
   */
  constructor(config?: AntCacheConfig) {
    this.config = { ...defaultAntCacheConfig, ...config };

    this.mainCache = new Map();
    this._createdTsMap = new Map();
    this._ttlMap = new Map();
    this._emitter = new AntCacheEventEmitter();

    if (this.config.checkPeriod > 0) {
      this._timerId = setInterval(
        this.handleExpired.bind(this),
        this.config.checkPeriod * 1000
      );
    } else {
      this._checkPeriodDisabled = true;
    }
  }

  /**
   * This method is called every `checkPeriod` second interval
   * to find and handle expired keys.
   */
  private handleExpired() {
    // check expired keys
    this._ttlMap.forEach((ttlInMillisecs, key) => {
      const ts = this._createdTsMap.get(key);
      const isExpired = ts !== undefined && +new Date() - ts > ttlInMillisecs;
      if (isExpired) {
        if (this._emitter.eventNames().includes('expired' as AntCacheEvent)) {
          const value = this.mainCache.get(key);
          this._emitter.emit(
            'expired' as AntCacheEvent,
            {
              key,
              value,
              ttl: ttlInMillisecs / 1000,
              deleteCurrentKey: () => this._del(key),
            } as OnExpireCallbackInput
          );
        } else {
          this.config.deleteOnExpire && this.delete(key);
        }
      }
    });
  }

  /**
   * Insert or update a key.
   *
   * ```js
   * const cache = new AntCache({ ttl: 4, checkPeriod: 1 })
   *
   * // use default TTL
   * cache.set('default ttl', 'live for 4 seconds');
   *
   * // use custom TTL
   * cache.set('custom ttl', 'live for 10 seconds', 10);
   *
   * // live permanently
   * cache.set('no ttl', 'this will live forever unless be deleted manually', 0);
   * ```
   *
   * @param key should be `string`
   * @param val
   * @param ttl in seconds, only take effect when inserting a new key. If `ttl` = 0, there is no TTL at all
   */
  public set(key: string, val: AntCacheValue, ttl = this.config.ttl) {
    const maxKeys = this.config.maxKeys;
    if (maxKeys && this.mainCache.size === maxKeys) {
      throw new MaxKeysExceedError(maxKeys);
    }
    this._emitter.emit('before-set' as AntCacheEvent, key, val);
    const isNewKey = !this.mainCache.has(key);
    this.mainCache.set(key, val);
    if (!this._checkPeriodDisabled && isNewKey && ttl) {
      this._ttlMap.set(key, ttl * 1000);
      this._createdTsMap.set(key, +new Date());
    }
    this._emitter.emit('after-set' as AntCacheEvent, key, val);
  }

  /**
   * Retrieve value for `key`
   *
   * @param key
   * @returns `undefined` if `key` not found
   */
  public get(key: string) {
    if (this.mainCache.has(key)) {
      this._hits++;
      return this.mainCache.get(key);
    }

    this._misses++;
    return undefined;
  }

  /**
   * Retrieve cache stats
   */
  public stats(): AntCacheStats {
    return {
      size: this.mainCache.size,
      hits: this._hits,
      misses: this._misses,
    };
  }

  /**
   * Retrieve values of key groups
   *
   * @param key
   * @returns an object contains values of `keys`
   */
  public getMany(...args: (string | string[])[]) {
    const keys = args.flat();
    const results: Record<string, AntCacheValue> = {};

    for (const key of keys) {
      const val = this.mainCache.get(key);
      results[key] = val;
    }

    return results;
  }

  /**
   * Retrieve values of all keys
   *
   * @returns an object of { [key]: value }
   */
  public getAll() {
    return jsMapToObject<AntCacheValue>(this.mainCache);
  }

  /**
   * Get all keys
   *
   * @returns an array contains all keys
   */
  public keys() {
    return Array.from(this.mainCache.keys());
  }

  /**
   * Get all values
   *
   * @returns an array contains all keys
   */
  public values() {
    return Array.from(this.mainCache.values());
  }

  /**
   * Get cache size
   *
   * @returns the size of the cache
   */
  public size() {
    return this.mainCache.size;
  }

  /**
   * Check if the cache contains `key`
   *
   * @param key
   * @returns `true` if `key` in the cache, otherwise `false`
   */
  public has(key: string) {
    return this.mainCache.has(key);
  }

  /**
   * Delete a single `key`
   *
   * Note: this method emits 'before-delete' hook,
   * then deletes the `key`,
   * then emits 'after-delete' hook.
   */
  public delete(key: string) {
    this._emitter.emit('before-delete' as AntCacheEvent, key);
    this._del(key);
    this._emitter.emit('after-delete' as AntCacheEvent, key);
  }

  /**
   * Delete multiple keys
   *
   * @param keys an array of keys to delete
   */
  public deleteMany(...args: (string | string[])[]) {
    const keys = args.flat();
    for (const key of keys) {
      this.delete(key);
    }
  }

  /**
   * Delete a key from maps in sync.
   *
   * For internal use only.
   */
  private _del(key: string) {
    this.mainCache.delete(key);
    this._createdTsMap.delete(key);
    this._ttlMap.delete(key);
  }

  /**
   * Empty the cache
   */
  public flushAll() {
    this.mainCache.clear();
    this._createdTsMap.clear();
    this._ttlMap.clear();
  }

  /**
   * Stringify the cache content and ttl.
   *
   * _Use with caution as the bigger the cache is, the longer it takes to stringify._
   *
   * Leave the logic handling long-running task up to you.
   *
   * @returns JSON string to be consumed in `deserialize`
   */
  public serialize(): string {
    const content = this.getAll();
    const ttls = jsMapToObject<number>(this._ttlMap);
    return superjson.stringify([content, ttls]);
  }

  /**
   * Parse the input JSON string and attempt to upsert into the current cache.
   *
   * __JSON string should be the output of method `serialize`__.
   *
   * _Existing keys will be overwritten both value and TTL_. Created timestamps will be reset.
   *
   * _Use with caution as the bigger the string is, the longer it takes to parse._
   *
   * Leave logic handling long-running task up to you.
   *
   * @returns
   */
  public deserialize(json: string) {
    const [content, ttls]: [
      Record<string, AntCacheValue>,
      Record<string, number>
    ] = superjson.parse(json);

    void objectToJsMap(content, this.mainCache);
    void objectToJsMap(ttls, this._ttlMap);

    for (const key in ttls) {
      this._createdTsMap.set(key, +new Date());
    }
  }

  /**
   * Adds a listener at the end of the listeners array for the specified event
   *
   * @param eventName an event name comply to `AntCacheEvent`
   * @param callback a callback that will be call when the event emitted
   */
  public on(eventName: AntCacheEvent, callback: (...args: any[]) => void) {
    this._emitter.on(eventName, callback);
  }

  /**
   * Prepare to close the cache.
   *
   * Dispose the timer and the remove all event listeners.
   */
  public dispose() {
    clearInterval(this._timerId);
    this._emitter.removeAllListeners();
  }

  /**
   * Alias for `dispose`
   */
  public readonly close = this.dispose;
}

export { MaxKeysExceedError };
export type {
  AntCacheConfig,
  AntCacheEvent,
  AntCacheStats,
  AntCacheValue,
  OnExpireCallbackInput,
};
