/**
 * =============================================================================
 * FILE        : 65.Repository.Query.gs
 * VERSION     : 1.0.0
 * DESCRIPTION : Repository Query Helper
 * =============================================================================
 *
 * Query bekerja terhadap Object[].
 * Query TIDAK mengakses Spreadsheet.
 *
 * =============================================================================
 */

const RepositoryQuery = (() => {
  /**
   * --------------------------------------------------------------------------
   * Where
   * --------------------------------------------------------------------------
   */
  function where(data, predicate) {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.filter(predicate);
  }

  /**
   * --------------------------------------------------------------------------
   * Search
   * --------------------------------------------------------------------------
   */
  function search(data, keyword, fields) {
    if (!Array.isArray(data)) {
      return [];
    }

    if (!keyword) {
      return data;
    }

    const q = String(keyword).toLowerCase();

    return data.filter((item) => {
      return fields.some((field) => {
        const value = item[field];

        if (value === null || value === undefined) {
          return false;
        }

        return String(value).toLowerCase().includes(q);
      });
    });
  }

  /**
   * --------------------------------------------------------------------------
   * Order By
   * --------------------------------------------------------------------------
   */
  function orderBy(data, field, direction = "asc") {
    if (!Array.isArray(data)) {
      return [];
    }

    const sorted = [...data];

    sorted.sort((a, b) => {
      const left = a[field];

      const right = b[field];

      if (left === right) {
        return 0;
      }

      if (left > right) {
        return direction === "desc" ? -1 : 1;
      }

      return direction === "desc" ? 1 : -1;
    });

    return sorted;
  }

  /**
   * --------------------------------------------------------------------------
   * Limit
   * --------------------------------------------------------------------------
   */
  function limit(data, size) {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.slice(0, size);
  }

  /**
   * --------------------------------------------------------------------------
   * Paginate
   * --------------------------------------------------------------------------
   */
  function paginate(data, page = 1, perPage = null) {
    if (perPage === null || typeof perPage === "undefined" || perPage === "") {
      const configured = SettingsService().getResolved("DEFAULT_PAGE_SIZE");
      perPage = configured && configured.success && configured.data && configured.data.valid !== false
        ? configured.data.value
        : PAGINATION_CONFIG.DEFAULT_LIMIT;
    }
    const requestedSize = Number(perPage);
    perPage = Number.isInteger(requestedSize)
      && requestedSize <= PAGINATION_CONFIG.MAX_LIMIT
      && PAGINATION_CONFIG.ALLOWED_LIMITS.indexOf(requestedSize) >= 0
      ? requestedSize
      : PAGINATION_CONFIG.DEFAULT_LIMIT;
    const requestedPage = Math.floor(Number(page));
    page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : PAGINATION_CONFIG.DEFAULT_PAGE;
    if (!Array.isArray(data)) {
      return {
        data: [],

        page,

        perPage,

        total: 0,

        totalPages: 1,
      };
    }

    const total = data.length;

    const totalPages = Math.max(1, Math.ceil(total / perPage));

    page = Math.min(page, totalPages);

    const start = (page - 1) * perPage;

    return {
      data: data.slice(start, start + perPage),

      page,

      perPage,

      total,

      totalPages,
    };
  }

  /**
   * --------------------------------------------------------------------------
   * Select
   * --------------------------------------------------------------------------
   */
  function select(data, fields) {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item) => {
      return Utils.pick(item, fields);
    });
  }

  /**
   * --------------------------------------------------------------------------
   * Public API
   * --------------------------------------------------------------------------
   */
  return Object.freeze({
    where,

    search,

    orderBy,

    limit,

    paginate,

    select,
  });
})();
