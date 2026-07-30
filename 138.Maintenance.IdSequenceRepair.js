/**
 * Repairs current-date Script Properties sequences from physical allocated IDs.
 * Editor-runnable and intentionally does not modify business sheet rows.
 */
function repairCurrentIdSequences() {
  const lock = LockService.getScriptLock();
  const ownsLock = typeof lock.hasLock === "function" && lock.hasLock();
  if (!ownsLock) lock.waitLock(30000);
  try {
    const applicationDate = new Date();
    const results = ID_GENERATOR_SCHEMA_KEYS.map((key) => {
      const schema = SCHEMA[key];
      return Object.assign(
        { schema: key },
        IDGenerator.repairSequence(schema, applicationDate),
      );
    });
    const report = {
      success: results.every((result) => result.status !== "FAIL"),
      storageBackend: "ScriptProperties",
      applicationDate: Utilities.formatDate(
        applicationDate,
        APP_CONFIG.TIMEZONE,
        "yyyy-MM-dd",
      ),
      results,
    };
    Logger.log(JSON.stringify(report, null, 2));
    return report;
  } finally {
    if (!ownsLock) lock.releaseLock();
  }
}
