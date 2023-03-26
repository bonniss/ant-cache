import test from 'ava';

import {
  AntCacheConfig,
  AntCacheValue,
  OnExpireCallbackInput,
} from '../types/ant-cache';

import { AntCache } from './ant-cache';
import { MaxKeysExceedError } from './max-keys-exceed-error';

const defaultConfig: AntCacheConfig = {
  ttl: 4,
  checkPeriod: 1,
  maxKeys: 0,
  deleteOnExpire: true,
};

const setup = (config?: AntCacheConfig) => {
  const merged = { ...defaultConfig, ...config };
  return new AntCache(merged);
};

const ONE_SECOND_IN_MILLISECS = 1300;
const pSetTimeout = (callback: () => void, timeoutInSeconds: number) =>
  new Promise<void>((resolve) => {
    setTimeout(() => {
      callback();
      void resolve();
    }, timeoutInSeconds * ONE_SECOND_IN_MILLISECS);
  });

const genKey = (): string =>
  [...Array(30)].map(() => Math.random().toString(36)[2]).join('');
const floodByPrimitives = (cache: AntCache): [string[], any[]] => {
  const values = [
    null,
    undefined,
    // string
    'Liverpool',
    // number
    NaN,
    Number.MAX_VALUE,
    Infinity,
    -Infinity,
    // boolean
    true,
    false,
    // bigint
    BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1),
  ];
  const keys: string[] = values.map((_, index) => `key${index.toString()}`);
  keys.forEach((key, index) => {
    const value = values[index];
    cache.set(key, value);
  });
  return [keys, values];
};
const floodByObjects = (cache: AntCache): [string[], any[]] => {
  const values = [
    Object.create(null),
    Object.create({}),
    // Object literals
    { name: 'Liverpool' },
    // bigint
    [],
    [1, 'string', null, true, BigInt(1)],
  ];
  const keys: string[] = values.map((_, index) => `key${index.toString()}`);
  keys.forEach((key, index) => {
    const value = values[index];
    cache.set(key, value);
  });
  return [keys, values];
};

/**
 * Init & Config
 */
test('It should be initialized', async (t) => {
  const cache = setup();
  t.truthy(cache);
});

test('It should be configured', (t) => {
  const cache = setup();
  t.is(cache.config.ttl, defaultConfig.ttl);
  t.is(cache.config.checkPeriod, defaultConfig.checkPeriod);
  t.is(cache.config.maxKeys, defaultConfig.maxKeys);
  t.is(cache.config.deleteOnExpire, true);
});

/**
 * Get/Set
 */
test('It should be able to set primitive values', (t) => {
  const cache = setup();
  const [keys] = floodByPrimitives(cache);
  for (const key of keys) {
    t.is(cache.mainCache.has(key), true);
  }
});

test('It should has the key after set', (t) => {
  const cache = setup();
  const key = genKey();
  cache.set(key, key);
  t.is(cache.has(key), true);
});

test('It should be able to get primitive values', (t) => {
  const cache = setup();
  const [keys, values] = floodByPrimitives(cache);
  keys.forEach((key, index) => {
    const value = values[index];
    t.is(cache.get(key), value);
  });
});

test('It should be able to get a group of keys', (t) => {
  const cache = setup();
  const [keys] = floodByPrimitives(cache);
  const groupSize = Math.ceil(keys.length / 2);
  const keyGroup = keys.slice(0, groupSize);

  const obj = cache.getMany(...keyGroup);

  for (const key of keyGroup) {
    t.is(obj[key], cache.get(key));
  }
});

test('If a key not exist, it should returns `undefined`', (t) => {
  const cache = setup();
  const randomKey = genKey();
  t.is(cache.get(randomKey), undefined);
});

test('It should be able to set objects', (t) => {
  const cache = setup();
  const [keys] = floodByObjects(cache);
  for (const key of keys) {
    t.is(cache.mainCache.has(key), true);
  }
});

test('It should be able to get objects', (t) => {
  const cache = setup();
  const [keys, values] = floodByObjects(cache);
  keys.forEach((key, index) => {
    const value = values[index];
    t.deepEqual(cache.get(key), value);
  });
});

/**
 * Keys
 */
test('It should returns all keys', (t) => {
  const cache = setup();
  const [keys] = floodByPrimitives(cache);
  t.deepEqual(cache.keys(), keys);
});

test('It should throws error when exceed `maxKeys`', (t) => {
  const maxKeys = 2;
  const cache = setup({
    maxKeys,
  });
  const fn = () => {
    for (let index = 0; index < maxKeys + 1; index++) {
      cache.set(genKey(), index);
    }
  };

  const error = t.throws(fn, { instanceOf: MaxKeysExceedError });

  t.log(error);
});

/**
 * Stats
 */
test('It should record stats', (t) => {
  const cache = setup();
  const expectedHits = 10;
  for (let index = 0; index < expectedHits; index++) {
    const key = genKey();
    cache.set(key, key);
    // increase hits
    cache.get(key);
  }

  const expectedMisses = 10;
  for (let index = 0; index < expectedMisses; index++) {
    // increase misses
    cache.get(genKey());
  }

  t.deepEqual(cache.stats(), {
    size: expectedHits,
    hits: expectedHits,
    misses: expectedMisses,
  });
});

/**
 * Delete
 */
test('It should delete an existing key', (t) => {
  const cache = setup();
  const key = genKey();
  cache.set(key, key);
  cache.delete(key);
  t.is(cache.get(key), undefined);
});

test('It should be able to delete multiple keys at once', (t) => {
  const cache = setup();
  const [keys] = floodByPrimitives(cache);
  const groupSize = Math.ceil(keys.length / 2);
  const keyGroup = keys.slice(0, groupSize);

  cache.deleteMany(...keyGroup);
  t.is(cache.size(), keys.length - groupSize);
});

test('It should clear all', (t) => {
  const cache = setup();
  floodByPrimitives(cache);
  cache.flushAll();
  t.is(cache.keys.length, 0);
});

/**
 * TTL
 */
test('Value should be deleted when expires by default ttl', (t) => {
  const cache = setup();
  const key = genKey();
  cache.set(
    key,
    `this value should be expired after ${defaultConfig.ttl} secs`
  );
  return pSetTimeout(() => {
    t.is(cache.get(key), undefined);
  }, defaultConfig.ttl);
});

test('Value should be deleted when expires by custom ttl', (t) => {
  const cache = setup();
  const ttl = 6;
  const key = genKey();
  cache.set(key, `this value should be expired after ${ttl} secs`, ttl);
  return pSetTimeout(() => {
    t.is(cache.get(key), undefined);
  }, ttl);
});

test('Value should exists when not expires', (t) => {
  const cache = setup();
  const timeout = defaultConfig.ttl / 2;
  const key = genKey();
  cache.set(key, `this value should exists after ${timeout} secs`);
  return pSetTimeout(() => {
    t.truthy(cache.get(key));
  }, timeout);
});

test('It should work as an enhanced JS Map if checkPeriod = 0', (t) => {
  const cache = setup({
    checkPeriod: 0,
    ttl: 2,
  });
  const key = genKey();
  cache.set(key, key);

  return pSetTimeout(() => {
    t.is(cache.get(key), key);
  }, 2 * cache.config.ttl);
});

test('It should not delete expired keys automatically when `deleteOnExpire` = false', (t) => {
  const cache = setup({
    ttl: 2,
    deleteOnExpire: false,
  });
  const key = genKey();
  cache.set(key, key);
  return pSetTimeout(() => {
    t.is(cache.get(key), key);
  }, 2 * cache.config.ttl);
});

test('It should not delete expired keys automatically if the key is inserted with `ttl` = 0', (t) => {
  const cache = setup({
    ttl: 2,
  });
  const key = genKey();
  cache.set(key, key, 0);
  return pSetTimeout(() => {
    t.is(cache.get(key), key);
  }, 2 * cache.config.ttl);
});

// Hooks
test('`before-set` and `after-set` hooks should be called', (t) => {
  const cache = setup();
  const key = genKey();
  cache.on('before-set', () => {
    t.is(cache.get(key), undefined);
  });
  cache.on('after-set', () => {
    t.is(cache.get(key), key);
  });
  cache.set(key, key);
});

test('`before-delete` and `after-delete` hooks should be called', (t) => {
  const cache = setup();
  const key = genKey();
  cache.set(key, key);
  cache.on('before-delete', () => {
    t.is(cache.get(key), key);
  });
  cache.on('after-delete', () => {
    t.is(cache.get(key), undefined);
  });
  cache.delete(key);
});

test('`expired` hook should be called and expired key should be delete after `deleteCurrentKey` invoked', (t) => {
  const cache = setup();
  const key = genKey();
  cache.set(key, key);
  cache.on('expired', (inp: OnExpireCallbackInput) => {
    t.log(
      `{ key: ${inp.key}, value: ${inp.value}, ttl: ${inp.ttl} } has expired`
    );
    t.is(inp.key, key);
    t.is(inp.value, key);
    inp.deleteCurrentKey();
  });

  return pSetTimeout(() => {
    t.is(cache.get(key), undefined);
  }, defaultConfig.ttl);
});

test('`expired` hook should be called and expired key should be intact when `deleteCurrentKey` not invoked', (t) => {
  const cache = setup();
  const key = genKey();
  cache.set(key, key);
  cache.on('expired', (inp: OnExpireCallbackInput) => {
    t.log(
      `{ key: ${inp.key}, value: ${inp.value}, ttl: ${inp.ttl} } has expired`
    );
    t.is(inp.key, key);
    t.is(inp.value, key);
  });

  return pSetTimeout(() => {
    t.is(cache.get(key), key);
  }, defaultConfig.ttl);
});

/**
 * Serialization
 */
const floodCacheRealScenario = (cache: AntCache) => {
  cache.set('date', new Date());
  cache.set('bigint', BigInt(1000));
  cache.set('number', 1000);
  cache.set('null', null);
  cache.set('string', '738875b4b2c1c70eff4666a88bd1fc1c9b816d99');
  cache.set('array', ['Jersey Total', null, 123]);
  cache.set(
    'set',
    new Set([
      1,
      null,
      5,
      {
        location: 'Peru',
      },
    ])
  );
  cache.set(
    'map',
    new Map<string, AntCacheValue>([
      ['date', new Date()],
      ['bigint', BigInt(1000)],
      ['number', 1000],
      ['null', null],
      ['string', '738875b4b2c1c70eff4666a88bd1fc1c9b816d99'],
    ])
  );
};

test('It should be serializable', (t) => {
  const cache = setup();
  floodCacheRealScenario(cache);
  t.notThrows(() => {
    const json = cache.serialize();
    t.log(json);
    t.truthy(json);
  });
});

test('It should be deserializable and recover', (t) => {
  const cache = setup();
  floodCacheRealScenario(cache);
  const json = cache.serialize();
  const content = cache.getAll();
  cache.flushAll();
  cache.deserialize(json);
  const newContent = cache.getAll();
  t.deepEqual(newContent, content);
});

test('It should be deserializable and overwritten', (t) => {
  const cache = setup({
    checkPeriod: 1,
    ttl: 2,
  });
  floodCacheRealScenario(cache);
  const oldValue = cache.get('string');
  const json = cache.serialize();
  cache.flushAll();
  cache.set('string', 'Liverpool', 6);
  cache.deserialize(json);
  t.is(cache.get('string'), oldValue);
  return pSetTimeout(() => {
    t.is(cache.get('string'), undefined);
  }, 3);
});
