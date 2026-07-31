/**
 * =============================================================================
 * FILE        : 50.Repository.Cache.gs
 * VERSION     : 1.1.0
 * DESCRIPTION : Repository Cache
 * =============================================================================
 */

const RepositoryCache = (() => {
  // CacheService documents a 100 KB per-key limit. Keep headroom for service
  // accounting differences and bypass caching before approaching that limit.
  const MAX_CACHE_VALUE_BYTES = 90 * 1024;

  function utf8ByteLength(value) {
    let bytes = 0;

    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);

      if (code < 0x80) bytes += 1;
      else if (code < 0x800) bytes += 2;
      else if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length && value.charCodeAt(i + 1) >= 0xdc00 && value.charCodeAt(i + 1) <= 0xdfff) {
        bytes += 4;
        i += 1;
      } else bytes += 3;
    }

    return bytes;
  }

  function isBypassableCacheError(error) {
    const message = String(error?.message || error || "");

    return /argument too large:\s*value|value[^\n]*too large|cache[^\n]*(?:quota|limit)|(?:quota|limit)[^\n]*cache|service invoked too many times[^\n]*cache/i.test(message);
  }

  function create(cache) {

  function key(schema) {
    return `IPS:${schema.TABLE}:v1`;
  }

  function get(schema) {
    if (!CACHE_CONFIG.ENABLED) {
      return null;
    }

    let value;
    try {
      value = cache.get(key(schema));
    } catch (error) {
      if (isBypassableCacheError(error)) return null;
      throw error;
    }

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch (err) {
      try { remove(schema); }
      catch (error) {
        if (!isBypassableCacheError(error)) throw error;
      }

      return null;
    }
  }

  function put(schema, value) {
    if (!CACHE_CONFIG.ENABLED) {
      return value;
    }

    const serialized = JSON.stringify(value);

    if (utf8ByteLength(serialized) > MAX_CACHE_VALUE_BYTES) {
      return value;
    }

    try {
      cache.put(key(schema), serialized, CACHE_CONFIG.EXPIRE_SECONDS);
    } catch (error) {
      if (!isBypassableCacheError(error)) {
        throw error;
      }
    }

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
  }

  let repositoryCache = null;

  function runtime() {
    if (!repositoryCache) repositoryCache = create(CacheService.getScriptCache());
    return repositoryCache;
  }

  return Object.freeze({
    key(schema) { return runtime().key(schema); },
    get(schema) { return runtime().get(schema); },
    put(schema, value) { return runtime().put(schema, value); },
    remove(schema) { return runtime().remove(schema); },
    clear(schema) { return runtime().clear(schema); },
    remember(schema, callback, validator = null) {
      return runtime().remember(schema, callback, validator);
    },
    createForTesting: create,
  });
})();
