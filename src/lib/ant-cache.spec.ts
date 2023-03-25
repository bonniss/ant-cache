import test from 'ava';

import { OnExpireCallbackInput } from '../types/ant-cache';
import AntCacheConfig from '../types/config';

import { AntCache } from './ant-cache';
import MaxKeysExceedError from './max-keys-exceed-error';

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

const pSetTimeout = (callback: () => void, timeout: number) =>
  new Promise<void>((resolve) => {
    setTimeout(() => {
      callback();
      void resolve();
    }, timeout);
  });

const genKey = (): string =>
  [...Array(30)].map(() => Math.random().toString(36)[2]).join('');
const floodByPrimitives = (instance: AntCache): [string[], any[]] => {
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
    instance.set(key, value);
  });
  return [keys, values];
};
const floodByObjects = (instance: AntCache): [string[], any[]] => {
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
    instance.set(key, value);
  });
  return [keys, values];
};

/**
 * Init & Config
 */
test('It should be initialized', async (t) => {
  const instance = setup();
  t.truthy(instance);
});

test('It should be configured', (t) => {
  const instance = setup();
  t.is(instance.config.ttl, defaultConfig.ttl);
  t.is(instance.config.checkPeriod, defaultConfig.checkPeriod);
  t.is(instance.config.maxKeys, defaultConfig.maxKeys);
  t.is(instance.config.deleteOnExpire, true);
});

/**
 * Get/Set
 */
test('It should be able to set primitive values', (t) => {
  const instance = setup();
  const [keys] = floodByPrimitives(instance);
  for (const key of keys) {
    t.is(instance.mainCache.has(key), true);
  }
});

test('It should has the key after set', (t) => {
  const instance = setup();
  const key = genKey();
  instance.set(key, key);
  t.is(instance.has(key), true);
});

test('It should be able to get primitive values', (t) => {
  const instance = setup();
  const [keys, values] = floodByPrimitives(instance);
  keys.forEach((key, index) => {
    const value = values[index];
    t.is(instance.get(key), value);
  });
});

test('It should be able to get a group of keys', (t) => {
  const instance = setup();
  const [keys] = floodByPrimitives(instance);
  const groupSize = Math.ceil(keys.length / 2);
  const keyGroup = keys.slice(0, groupSize);

  const obj = instance.getMany(...keyGroup);

  for (const key of keyGroup) {
    t.is(obj[key], instance.get(key));
  }
});

test('If a key not exist, it should returns `undefined`', (t) => {
  const instance = setup();
  const randomKey = genKey();
  t.is(instance.get(randomKey), undefined);
});

test('It should be able to set objects', (t) => {
  const instance = setup();
  const [keys] = floodByObjects(instance);
  for (const key of keys) {
    t.is(instance.mainCache.has(key), true);
  }
});

test('It should be able to get objects', (t) => {
  const instance = setup();
  const [keys, values] = floodByObjects(instance);
  keys.forEach((key, index) => {
    const value = values[index];
    t.deepEqual(instance.get(key), value);
  });
});

/**
 * Keys
 */
test('It should returns all keys', (t) => {
  const instance = setup();
  const [keys] = floodByPrimitives(instance);
  t.deepEqual(instance.keys(), keys);
});

test('It should throws error when exceed `maxKeys`', (t) => {
  const maxKeys = 2;
  const instance = setup({
    maxKeys,
  });
  const fn = () => {
    for (let index = 0; index < maxKeys + 1; index++) {
      instance.set(genKey(), index);
    }
  };

  const error = t.throws(fn, { instanceOf: MaxKeysExceedError });

  t.log(error);
});

/**
 * Stats
 */
test('It should record stats', (t) => {
  const instance = setup();
  const expectedHits = 10;
  for (let index = 0; index < expectedHits; index++) {
    const key = genKey();
    instance.set(key, key);
    // increase hits
    instance.get(key);
  }

  const expectedMisses = 10;
  for (let index = 0; index < expectedMisses; index++) {
    // increase misses
    instance.get(genKey());
  }

  t.deepEqual(instance.stats(), {
    size: expectedHits,
    hits: expectedHits,
    misses: expectedMisses,
  });
});

/**
 * Delete
 */
test('It should delete an existing key', (t) => {
  const instance = setup();
  const key = genKey();
  instance.set(key, key);
  instance.delete(key);
  t.is(instance.get(key), undefined);
});

test('It should be able to delete multiple keys at once', (t) => {
  const instance = setup();
  const [keys] = floodByPrimitives(instance);
  const groupSize = Math.ceil(keys.length / 2);
  const keyGroup = keys.slice(0, groupSize);

  instance.deleteMany(...keyGroup);
  t.is(instance.size(), keys.length - groupSize);
});

test('It should clear all', (t) => {
  const instance = setup();
  floodByPrimitives(instance);
  instance.flushAll();
  t.is(instance.keys.length, 0);
});

/**
 * TTL
 */
const ONE_SECOND_IN_MILLISECS = 1500;
test('Value should be deleted when expires by default ttl', (t) => {
  const instance = setup();
  const key = genKey();
  instance.set(
    key,
    `this value should be expired after ${defaultConfig.ttl} secs`
  );
  return pSetTimeout(() => {
    t.is(instance.get(key), undefined);
  }, defaultConfig.ttl * ONE_SECOND_IN_MILLISECS);
});

test('Value should be deleted when expires by custom ttl', (t) => {
  const instance = setup();
  const ttl = 6;
  const key = genKey();
  instance.set(key, `this value should be expired after ${ttl} secs`, ttl);
  return pSetTimeout(() => {
    t.is(instance.get(key), undefined);
  }, ttl * ONE_SECOND_IN_MILLISECS);
});

test('Value should exists when not expires', (t) => {
  const instance = setup();
  const timeout = defaultConfig.ttl / 2;
  const key = genKey();
  instance.set(key, `this value should exists after ${timeout} secs`);
  return pSetTimeout(() => {
    t.truthy(instance.get(key));
  }, timeout * ONE_SECOND_IN_MILLISECS);
});

test('It should work as an enhanced JS Map if checkPeriod = 0', (t) => {
  const instance = setup({
    checkPeriod: 0,
    ttl: 2,
  });
  const key = genKey();
  instance.set(key, key);

  return pSetTimeout(() => {
    t.is(instance.get(key), key);
  }, 2 * instance.config.ttl * ONE_SECOND_IN_MILLISECS);
});

test('It should not delete expired keys automatically when `deleteOnExpire` = false', (t) => {
  const instance = setup({
    ttl: 2,
    deleteOnExpire: false,
  });
  const key = genKey();
  instance.set(key, key);
  return pSetTimeout(() => {
    t.is(instance.get(key), key);
  }, 2 * instance.config.ttl * ONE_SECOND_IN_MILLISECS);
});

test('It should not delete expired keys automatically if the key is inserted with `ttl` = 0', (t) => {
  const instance = setup({
    ttl: 2,
  });
  const key = genKey();
  instance.set(key, key, 0);
  return pSetTimeout(() => {
    t.is(instance.get(key), key);
  }, 2 * instance.config.ttl * ONE_SECOND_IN_MILLISECS);
});

// Hooks
test('`before-set` and `after-set` hooks should be called', (t) => {
  const instance = setup();
  const key = genKey();
  instance.on('before-set', () => {
    t.is(instance.get(key), undefined);
  });
  instance.on('after-set', () => {
    t.is(instance.get(key), key);
  });
  instance.set(key, key);
});

test('`before-delete` and `after-delete` hooks should be called', (t) => {
  const instance = setup();
  const key = genKey();
  instance.set(key, key);
  instance.on('before-delete', () => {
    t.is(instance.get(key), key);
  });
  instance.on('after-delete', () => {
    t.is(instance.get(key), undefined);
  });
  instance.delete(key);
});

test('`expired` hook should be called and expired key should be delete after `deleteCurrentKey` invoked', (t) => {
  const instance = setup();
  const key = genKey();
  instance.set(key, key);
  instance.on('expired', (inp: OnExpireCallbackInput) => {
    t.log(
      `{ key: ${inp.key}, value: ${inp.value}, ttl: ${inp.ttl} } has expired`
    );
    t.is(inp.key, key);
    t.is(inp.value, key);
    inp.deleteCurrentKey();
  });

  return pSetTimeout(() => {
    t.is(instance.get(key), undefined);
  }, defaultConfig.ttl * ONE_SECOND_IN_MILLISECS);
});

test('`expired` hook should be called and expired key should be intact when `deleteCurrentKey` not invoked', (t) => {
  const instance = setup();
  const key = genKey();
  instance.set(key, key);
  instance.on('expired', (inp: OnExpireCallbackInput) => {
    t.log(
      `{ key: ${inp.key}, value: ${inp.value}, ttl: ${inp.ttl} } has expired`
    );
    t.is(inp.key, key);
    t.is(inp.value, key);
  });

  return pSetTimeout(() => {
    t.is(instance.get(key), key);
  }, defaultConfig.ttl * ONE_SECOND_IN_MILLISECS);
});
