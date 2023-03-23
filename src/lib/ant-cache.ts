import { EventEmitter } from 'events';

import { AntCacheEvent, AntCacheValue } from '../types/ant-cache';

import AntCacheConfig, { defaultAntCacheConfig } from './config';

const isDevelopment = process.env.NODE_ENV === 'development';

class AntCacheEventEmitter extends EventEmitter {}

class AntCache {
  config: AntCacheConfig;
  mainCache: Map<string, AntCacheValue>;
  createdDateMap: Map<string, Date>;

  // store ttl in millisecs
  ttlMap: Map<string, number>;

  // statMap: Map<any, any>;
  timerId: ReturnType<typeof setInterval>;
  emitter: AntCacheEventEmitter;

  constructor(config?: AntCacheConfig) {
    this.config = { ...defaultAntCacheConfig, ...config };
    this.mainCache = new Map();
    this.createdDateMap = new Map();
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

  private handleExpired() {
    // check expired keys
    this.ttlMap.forEach((ttl, key) => {
      const createdDate = this.createdDateMap.get(key);
      const lifespan = +new Date() - +createdDate!;
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
            createdDate,
            del: () => this._del(key),
          });
        } else {
          this.del(key);
        }
      }
    });
  }

  private _del(key: string) {
    this.mainCache.delete(key);
    this.createdDateMap.delete(key);
    this.ttlMap.delete(key);
  }

  public flushAll() {
    this.mainCache.clear();
    this.createdDateMap.clear();
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
    if (maxKeys && this.mainCache.keys.length === maxKeys) {
      throw new Error('Max keys exceeds');
    }

    this.emitter.emit('before-set' as AntCacheEvent, key, val);
    const isNewKey = !this.mainCache.has(key);
    this.mainCache.set(key, val);
    if (isNewKey) {
      this.ttlMap.set(key, ttl! * 1000);
      this.createdDateMap.set(key, new Date());
    }
    this.emitter.emit('after-set' as AntCacheEvent, key, val);
  }

  /**
   * Retrieve `key` from cache
   * Return `undefined` if not found
   * @param key
   */
  public get(key: string) {
    // TODO: update stats
    return this.mainCache.get(key);
  }

  public mget(...keys: string[]) {
    const results: Record<string, AntCacheValue> = {};

    for (const key of keys) {
      const val = this.mainCache.get(key);
      results[key] = val;
    }

    return results;
  }

  public getAll() {
    const all: Record<string, any> = {};
    this.mainCache.forEach((val, key) => {
      all[key] = val;
    });
    return all;
  }

  public keys() {
    return Array.from(this.mainCache.keys());
  }

  public has(key: string) {
    return this.mainCache.has(key);
  }

  public del(key: string) {
    this.emitter.emit('before-delete' as AntCacheEvent, key);
    this._del(key);
    this.emitter.emit('after-delete' as AntCacheEvent, key);
  }

  public mdel(...keys: string[]) {
    for (const key of keys) {
      this.del(key);
    }
  }

  public on(eventName: AntCacheEvent, callback: (...args: any[]) => void) {
    this.emitter.on(eventName, callback);
  }

  public dispose() {
    clearInterval(this.timerId);
    this.emitter.removeAllListeners();
  }

  public readonly close = this.dispose;
}

export default AntCache;
