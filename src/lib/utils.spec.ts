import test from 'ava';

import { jsMapToObject, objectToJsMap } from './utils';

test('It should convert a map to an object', (t) => {
  const map = new Map<string, any>([
    ['input mobile matrix', 123],
    ['03730409f697554ae7eb1cab284b52845b6ca7a8', [2, 3, 4, 5]],
    [
      'Account',
      {
        en: 'Churchill',
      },
    ],
  ]);
  const obj = jsMapToObject(map);

  t.deepEqual(obj, {
    'input mobile matrix': 123,
    '03730409f697554ae7eb1cab284b52845b6ca7a8': [2, 3, 4, 5],
    Account: {
      en: 'Churchill',
    },
  });
});

test('It should convert an object to a map', (t) => {
  const obj = {
    'input mobile matrix': 123,
    '03730409f697554ae7eb1cab284b52845b6ca7a8': [2, 3, 4, 5],
    Account: {
      en: 'Churchill',
    },
  };
  const map = objectToJsMap(obj);

  t.deepEqual(
    map,
    new Map<string, any>([
      ['input mobile matrix', 123],
      ['03730409f697554ae7eb1cab284b52845b6ca7a8', [2, 3, 4, 5]],
      [
        'Account',
        {
          en: 'Churchill',
        },
      ],
    ])
  );
});

test("It should overwrite target map with object's values", (t) => {
  const obj = {
    'input mobile matrix': 123,
    '03730409f697554ae7eb1cab284b52845b6ca7a8': [2, 3, 4, 5],
    Account: {
      en: 'Churchill',
    },
  };

  const map: Map<any, any> = new Map([
    [
      'Account',
      {
        ja: 'Kozumi',
      },
    ],
  ]);

  const modifiedMap = objectToJsMap(obj, map);
  // same reference
  t.is(map === modifiedMap, true);

  t.deepEqual(map.get('Account'), {
    en: 'Churchill',
  });
});
