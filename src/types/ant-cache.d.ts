export type AntCacheEvent =
  | 'expired'
  | 'before-set'
  | 'after-set'
  | 'before-delete'
  | 'after-delete';

export type AntCacheValue =
  | number
  | string
  | boolean
  | null
  | bigint
  | Date
  | Map<AntCacheValue, AntCacheValue>
  | Set<AntCacheValue>
  | { [key: string]: AntCacheValue }
  | AntCacheValue[];
