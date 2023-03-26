export const jsMapToObject = <T = any>(
  map: Map<string, T>
): Record<string, T> => {
  const res: Record<string, T> = {};
  map.forEach((val, key) => {
    res[key] = val;
  });
  return res;
};

export const objectToJsMap = <T = any>(
  obj: Record<string, T>,
  targetMap?: Map<string, T>
): Map<string, T> => {
  const map = targetMap ?? new Map<string, T>();
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      map.set(key, val);
    }
  }
  return map;
};
