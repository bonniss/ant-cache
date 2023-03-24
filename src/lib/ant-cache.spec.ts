import test from 'ava';

import AntCacheConfig from '../types/config';

import AntCache, { MaxKeysExceedError } from './ant-cache';

const defaultConfig: AntCacheConfig = {
  ttl: 4,
  checkPeriod: 2,
  maxKeys: 0,
};

const setup = (config?) => {
  const merged = { ...defaultConfig, ...config };
  return new AntCache(merged);
};

const genKey = (): string =>
  [...Array(30)].map(() => Math.random().toString(36)[2]).join('');
const floodByPrimitives = (instance: AntCache): [string[], any[]] => {
  const vals = [
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
  const keys: string[] = vals.map((_, index) => `key${index.toString()}`);
  keys.forEach((key, index) => {
    const value = vals[index];
    instance.set(key, value);
  });
  return [keys, vals];
};
const floodByObjects = (instance: AntCache): [string[], any[]] => {
  const vals = [
    Object.create(null),
    Object.create({}),
    // Object literals
    { name: 'Liverpool' },
    // bigint
    [],
    [1, 'string', null, true, BigInt(1)],
  ];
  const keys: string[] = vals.map((_, index) => `key${index.toString()}`);
  keys.forEach((key, index) => {
    const value = vals[index];
    instance.set(key, value);
  });
  return [keys, vals];
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
  const [keys, vals] = floodByPrimitives(instance);
  keys.forEach((key, index) => {
    const value = vals[index];
    t.is(instance.get(key), value);
  });
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
  const [keys, vals] = floodByObjects(instance);
  keys.forEach((key, index) => {
    const value = vals[index];
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

  console.error(error);
});

/**
 * Delete
 */
test('It should delete an existing key', (t) => {
  const instance = setup();
  const key = genKey();
  instance.set(key, key);
  instance.del(key);
  t.is(instance.get(key), undefined);
});

test('It should clear all', (t) => {
  const instance = setup();
  floodByPrimitives(instance);
  instance.flushAll();
  t.is(instance.keys.length, 0);
});

// test('Value should be deleted when expires', async (t) => {
//   const key = genKey();
//   instance.set(
//     key,
//     `this value should be expired after ${defaultConfig.ttl} secs`
//   );
//   await new Promise((resolve, reject) => {
//     setTimeout(() => {
//       t.is(instance.get(key), undefined);
//       resolve(true);
//     }, defaultConfig.ttl * 1000);
//   });
// });
