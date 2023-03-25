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

export type AntCacheStats = {
  size: number;
  hits: number;
  misses: number;
};

export type OnExpireCallbackInput = {
  key: string;
  value: AntCacheValue;
  ttl: number;
  deleteCurrentKey: () => void;
};
