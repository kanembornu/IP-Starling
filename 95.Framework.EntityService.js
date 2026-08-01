/**
 * =============================================================================
 * FILE        : 95.Framework.EntityService.js
 * VERSION     : 1.0.0
 * DESCRIPTION : Generic Entity Service
 * =============================================================================
 *
 * Layer di atas BaseService.
 *
 * Bertugas menyediakan helper yang umum dipakai oleh seluruh Master Entity.
 *
 * EntityService TIDAK memiliki business rule.
 *
 * Business rule berada pada:
 *   - ProductService
 *   - PartnerService
 *   - dst.
 *
 * =============================================================================
 */

const EntityService = (() => {
  /**
   * ---------------------------------------------------------------------------
   * Factory
   * ---------------------------------------------------------------------------
   */
  function create(schema, hooks = {}) {
    const base = BaseService.create(schema, hooks);

    /**
     * -------------------------------------------------------------------------
     * Find Active
     * -------------------------------------------------------------------------
     */
    function findActive() {
      return base.find({
        [schema.SYSTEM.IS_ACTIVE]: true,
      });
    }

    /**
     * -------------------------------------------------------------------------
     * Find Inactive
     * -------------------------------------------------------------------------
     */
    function findInactive() {
      return base.find({
        [schema.SYSTEM.IS_ACTIVE]: false,
      });
    }

    /**
     * -------------------------------------------------------------------------
     * Toggle Active
     * -------------------------------------------------------------------------
     */
    function toggleActive(id, status = true) {
      return base.update(id, {
        [schema.SYSTEM.IS_ACTIVE]: status,
      });
    }

    /**
     * -------------------------------------------------------------------------
     * Search
     * -------------------------------------------------------------------------
     */
    function search(keyword = "") {
      keyword = String(keyword || "")
        .trim()
        .toLowerCase();

      const response = base.findAll();

      if (!response.success) {
        return response;
      }

      if (keyword === "") {
        return response;
      }

      const fields = schema.SEARCHABLE || [];

      const result = response.data.filter((row) => {
        return fields.some((field) => {
          const value = String(row[field] || "").toLowerCase();

          return value.indexOf(keyword) > -1;
        });
      });

      return Response.success(
        result,

        `${result.length} data ditemukan.`,
      );
    }

    /**
     * -------------------------------------------------------------------------
     * Dropdown
     * -------------------------------------------------------------------------
     */
    function dropdown() {
      const response = findActive();

      if (!response.success) {
        return response;
      }

      const list = response.data.map((row) => ({
        value: row[schema.PRIMARY_KEY],

        label: row[schema.DISPLAY_FIELD],
      }));

      return Response.success(
        list,

        `${list.length} data ditemukan.`,
      );
    }

    /**
     * -------------------------------------------------------------------------
     * Statistics
     * -------------------------------------------------------------------------
     */
    function statistics() {
      const response = base.findAll();

      if (!response.success) {
        return response;
      }

      const data = response.data;

      const active = data.filter(
        (item) => item[schema.SYSTEM.IS_ACTIVE] === true,
      ).length;

      const inactive = data.filter(
        (item) => item[schema.SYSTEM.IS_ACTIVE] === false,
      ).length;

      return Response.success({
        total: data.length,

        active,

        inactive,
      });
    }

    /**
     * -------------------------------------------------------------------------
     * Public API
     * -------------------------------------------------------------------------
     */
    return Object.freeze({
      ...base,

      findActive,

      findInactive,

      toggleActive,

      search,

      dropdown,

      statistics,
    });
  }

  /**
   * ---------------------------------------------------------------------------
   * Public API
   * ---------------------------------------------------------------------------
   */
  return Object.freeze({
    create,
  });
})();
