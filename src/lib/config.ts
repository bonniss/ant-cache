import AntCacheConfig from '../types/config';

/**
 * Default check period: 30 seconds
 */
const DEFAULT_CHECK_PERIOD = 30;

/**
 * Default cache configuration
 */
export const defaultAntCacheConfig: AntCacheConfig = {
  checkPeriod: DEFAULT_CHECK_PERIOD,
  ttl: 2 * DEFAULT_CHECK_PERIOD,
  maxKeys: 0,
  deleteOnExpire: true,
};
