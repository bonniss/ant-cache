import { EventEmitter } from 'events';

import { AntCacheEvent, AntCacheValue } from '../types/ant-cache';
import AntCacheConfig from '../types/config';

import { defaultAntCacheConfig } from './config';
import MaxKeysExceedError from './max-keys-exceed-error';

const isDevelopment = process.env.NODE_ENV === 'development';

class AntCacheEventEmitter extends EventEmitter {}

/**
 *
 * ### With ES Module
 *
 * ```js
 * import AntCache from 'ant-cache';
 * ```
 *
 * ### With CommonJS
 *
 * ```js
 * const AntCache = require('ant-cache');
 * ```
 *
 * ### Get started
 *
 * ```js
 * // use default config
 * const cache = new AntCache();
 *
 * // initialize with config
 * const cache = new AntCache({
 *   ttl: 120,  // in seconds
 *   checkPeriod: 10,  // in seconds
 *   maxKeys: 1000,  // could hold maximum 1000 key-value pairs
 * })
 * ```
 */
class AntCache {
  /**
   * The config of the cache
   * Initialized once in the constructor, then read-only
   */
  config: AntCacheConfig;

  /**
   * The main store that interacts with the outside world
   * Methods to get the cache info like, like `size` and `keys`, just take the info from this
   */
  mainCache: Map<string, AntCacheValue>;

  /**
   * Store the created timestamp of every key
   * Must be synced with the main cache every time a new value is set
   */
  createdTsMap: Map<string, number>;

  /**
   * Store the ttl of every key
   * Must be synced with the main cache every time a new value is set
   */
  ttlMap: Map<string, number>;

  // statMap: Map<any, any>;

  /**
   * The interval timer
   */
  timerId: ReturnType<typeof setInterval>;

  /**
   * The event emitter
   */
  emitter: AntCacheEventEmitter;

  /**
   * Constructor
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
    this.createdTsMap = new Map();
    this.ttlMap = new Map();
    this.emitter = new AntCacheEventEmitter();
    this.timerId = setInterval(
      this.handleExpired.bind(this),
      this.config.checkPeriod! * 1000
    );

    // if (this.config.hooks?.init) {
    //   this.config.hooks.init({
    //     ttl: `${this.config.ttl} seconds`,
    //     checkPeriod: `${this.config.checkPeriod} seconds`,
    //     maxKeys: this.config.maxKeys
    //   })
    // }
  }

  /**
   * This method is called every `checkPeriod` second interval
   * to find and handle expired keys
   */
  private handleExpired() {
    // check expired keys
    this.ttlMap.forEach((ttl, key) => {
      const ts = this.createdTsMap.get(key);
      const lifespan = +new Date() - ts;
      if (lifespan > ttl) {
        if (isDevelopment) {
          console.info(`\`${key}\` with ttl=\`${ttl / 1000}\` expired`);
        }
        if (this.emitter.eventNames().includes('expired' as AntCacheEvent)) {
          const value = this.mainCache.get(key);
          this.emitter.emit('expired' as AntCacheEvent, {
            key,
            value,
            ttl,
            del: () => this._del(key),
          });
        } else {
          this.delete(key);
        }
      }
    });
  }

  private _del(key: string) {
    this.mainCache.delete(key);
    this.createdTsMap.delete(key);
    this.ttlMap.delete(key);
  }

  public flushAll() {
    this.mainCache.clear();
    this.createdTsMap.clear();
    this.ttlMap.clear();
  }

  /**
   * Insert or update if `key` exists `value` into map
   * Store `ttl` and `createdDate` for periodically checking
   * @param key
   * @param val
   * @param ttl
   */
  public set(key: string, val: AntCacheValue, ttl = this.config.ttl) {
    const maxKeys = this.config.maxKeys;
    if (maxKeys && this.mainCache.size === maxKeys) {
      throw new MaxKeysExceedError(maxKeys);
    }
    this.emitter.emit('before-set' as AntCacheEvent, key, val);
    const isNewKey = !this.mainCache.has(key);
    this.mainCache.set(key, val);
    if (isNewKey) {
      this.ttlMap.set(key, ttl! * 1000);
      this.createdTsMap.set(key, +new Date());
    }
    this.emitter.emit('after-set' as AntCacheEvent, key, val);
  }

  /**
   * Retrieve value for `key`
   *
   * @param key
   * @returns `undefined` if `key` not found
   */
  public get(key: string) {
    // TODO: update stats
    return this.mainCache.get(key);
  }

  /**
   * Retrieve values of key groups
   *
   * @param key
   * @returns an object contains values of `keys`
   */
  public getMany(...keys: string[]) {
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
    const all: Record<string, any> = {};
    this.mainCache.forEach((val, key) => {
      all[key] = val;
    });
    return all;
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
    this.emitter.emit('before-delete' as AntCacheEvent, key);
    this._del(key);
    this.emitter.emit('after-delete' as AntCacheEvent, key);
  }

  /**
   * Delete multiple keys
   *
   * @param keys an array of keys to delete
   */
  public deleteMany(...keys: string[]) {
    for (const key of keys) {
      this.delete(key);
    }
  }

  /**
   * Adds a listener at the end of the listeners array for the specified event
   *
   * @param eventName an event name comply to `AntCacheEvent`
   * @param callback a callback that will be call when the event emitted
   */
  public on(eventName: AntCacheEvent, callback: (...args: any[]) => void) {
    this.emitter.on(eventName, callback);
  }

  /**
   * Prepare to close the cache.
   * Dispose the timer and the remove all event listeners.
   */
  public dispose() {
    clearInterval(this.timerId);
    this.emitter.removeAllListeners();
  }

  /**
   * Alias for `dispose`
   */
  public readonly close = this.dispose;
}

export default AntCache;
