/**
 * =============================================================================
 * FILE        : 50.Repository.Cache.gs
 * VERSION     : 1.1.0
 * DESCRIPTION : Repository Cache
 * =============================================================================
 */

const RepositoryCache = (() => {
  const cache = CacheService.getScriptCache();

  function key(schema) {
    return `IPS:${schema.TABLE}:v1`;
  }

  function get(schema) {
    if (!CACHE_CONFIG.ENABLED) {
      return null;
    }

    const value = cache.get(key(schema));

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch (err) {
      remove(schema);

      return null;
    }
  }

  function put(schema, value) {
    if (!CACHE_CONFIG.ENABLED) {
      return value;
    }

    cache.put(key(schema), JSON.stringify(value), CACHE_CONFIG.EXPIRE_SECONDS);

    return value;
  }

  function remove(schema) {
    cache.remove(key(schema));
  }

  function clear(schema) {
    remove(schema);
  }

  /**
   * --------------------------------------------------------------------------
   * Remember
   * --------------------------------------------------------------------------
   */
  function remember(schema, callback, validator = null) {
    let cached = get(schema);

    if (cached !== null) {
      if (typeof validator === "function") {
        if (validator(cached)) {
          return cached;
        }

        remove(schema);
      } else {
        return cached;
      }
    }

    const value = callback();

    put(schema, value);

    return value;
  }

  return Object.freeze({
    key,

    get,

    put,

    remove,

    clear,

    remember,
  });
})();
