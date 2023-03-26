<p align="center">
<img alt="Ant Cache logo" src="https://raw.githubusercontent.com/bonniss/ant-cache/main/logo.svg">
</p>

# Ant Cache

Simply fast in-memory key-value cache that supports TTL for Node.

## Installation

```sh
npm install ant-cache
```

## Use cases

1. When you don't want (or need) to set up a separate service, like Redis or Memcached, for your local newspaper app.
2. When you just need a simple cache working like a mediator between your app and your real Backend.
3. When you just need a simple store for your config.

## Usage

With ES Module

 ```js
 import { AntCache } from 'ant-cache';
 ```

With CommonJS

 ```js
 const { AntCache } = require('ant-cache');
 ```

### Initialize

```js
// use default config
const cache = new AntCache();

// initialize with config
const cache = new AntCache({
  ttl: 120,  // in seconds
  checkPeriod: 10,  // in seconds
  maxKeys: 1000,  // could hold maximum 1000 key-value pairs
})
```

### Insert/Update

```js
// set a value with default ttl
cache.set('a number', 12);

// set a value with specific ttl 10 minutes
cache.set('a mighty commit', {
  id: '0efa4d37c3097bca9c58f4eaf75f86e7efdc518a',
  message: 'skyrocket'
}, 600);

// passing in an existing key to update value, `ttl` has no effect
cache.set('a mighty commit', {
  id: '0efa4d37c3097bca9c58f4eaf75f86e7efdc518a',
  message: 'enhanced skyrocket'
}, 600);

// if a value is inserted with `ttl` = 0, it will live permanently unless deleted manually
cache.set('permanent value', 'Linus Torvald', 0);
```

### Get

```js
// get a single key
cache.get('a number');

// get multiple keys, returns an object
cache.getMany('a mighty commit', 'permanent value');

// also accept array(s)
cache.getMany('a number', ['a mighty commit', 'permanent value']);
```

## Delete

```js
// delete a single key
cache.delete('a number');

// delete multiple keys, returns an object
cache.deleteMany('a mighty commit', 'permanent value');

// also accept array(s)
cache.deleteMany('a number', ['a mighty commit', 'permanent value']);

// clear cache
cache.flushAll();
```

## Stats

```js
cache.stats()
/*
{
  hits: 5,
  misses: 2,
  keys: 3
}
*/
```

## Hooks

By default, `deleteOnExpire` option is `true`, the cache will delete the expired value automatically. If you want to have your own logic, use `expired` hook:

```js
cache.on('expired', ({
  key,
  value,
  ttl,
  deleteCurrentKey,
}) => {
  console.info(`%s is expired`, key);
  deleteCurrentKey();
})
```

AntCache expose several hooks:

- before-delete
- after-delete
- before-set
- after-set
- expired

Exhaustive API reference and examples:

[bonniss.github.io/ant-cache](https://bonniss.github.io/ant-cache/)
