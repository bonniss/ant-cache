import AntCacheConfig from '../types/config';

const DEFAULT_CHECK_PERIOD = 30;
export const defaultAntCacheConfig: AntCacheConfig = {
  checkPeriod: DEFAULT_CHECK_PERIOD,
  ttl: 2 * DEFAULT_CHECK_PERIOD,
  maxKeys: 0,
};
