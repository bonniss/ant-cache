export type AntCacheEvent =
  | 'expired'
  | 'before-set'
  | 'after-set'
  | 'before-delete'
  | 'after-delete';

type Primitive = number | string | boolean | null | bigint;

export type AntCacheValue =
  | Primitive
  | Record<string, Primitive>
  | AntCacheValue[];
