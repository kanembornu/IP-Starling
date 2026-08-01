/** Logs persistence and physical-store diagnostics. */
const LogsRepository = (() => {
  function rows() {
    return RepositoryBase.mapRows(LOG_SCHEMA, RepositoryBase.rows(LOG_SCHEMA));
  }

  function append(record) {
    return RepositoryWriter.insert(LOG_SCHEMA, record);
  }

  function findById(logId) {
    return rows().find((row) => String(row.ID) === String(logId)) || null;
  }

  function inspectPhysicalStore() {
    let sheet;
    try {
      sheet = Database.sheet(LOG_SCHEMA.TABLE);
    } catch (error) {
      return Object.freeze({
        sheetExists: false,
        lastRow: 0,
        lastColumn: 0,
        headers: Object.freeze([]),
        rawRows: Object.freeze([]),
        rows: Object.freeze([]),
        formulas: Object.freeze([]),
      });
    }

    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    const headers = lastColumn
      ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
      : [];
    const rawRows = lastRow > 1
      ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues()
      : [];
    const formulas = rawRows.length
      ? sheet.getRange(2, 1, rawRows.length, lastColumn).getFormulas()
      : [];

    return Object.freeze({
      sheetExists: true,
      lastRow,
      lastColumn,
      headers: Object.freeze(headers),
      rawRows: Object.freeze(rawRows),
      rows: Object.freeze(RepositoryBase.mapRows(LOG_SCHEMA, rawRows)),
      formulas: Object.freeze(formulas),
    });
  }

  return Object.freeze({ rows, append, findById, inspectPhysicalStore });
})();
