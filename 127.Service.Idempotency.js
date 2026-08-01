/** Durable create-request idempotency business rules and orchestration. */
const IdempotencyService = (() => {
  const KEY_PATTERN = /^ips_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const STATUS = Object.freeze({ PENDING: "PENDING", COMMITTED: "COMMITTED", RELEASED: "RELEASED" });
  const PENDING_TIMEOUT_MS = 10 * 60 * 1000;
  const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === "object") {
      return Object.keys(value).sort().reduce((result, key) => {
        result[key] = stableValue(value[key]);
        return result;
      }, {});
    }
    return value;
  }

  function canonicalJson(value) {
    return JSON.stringify(stableValue(value));
  }

  function payloadHash(value) {
    return Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      canonicalJson(value),
      Utilities.Charset.UTF_8,
    ).map((byte) => (byte + 256).toString(16).slice(-2)).join("");
  }

  function validateKey(value) {
    const key = String(value || "").trim().toLowerCase();
    return KEY_PATTERN.test(key)
      ? key
      : Response.error("IdempotencyKey tidak valid.");
  }

  function parseTime(value) {
    const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function replay(record) {
    try {
      const response = JSON.parse(record[IDEMPOTENCY_FIELDS.RESPONSE_PAYLOAD]);
      response.meta = Object.assign({}, response.meta || {}, { idempotentReplay: true });
      return response;
    } catch (error) {
      return Response.error("Respons idempotensi tersimpan tidak valid.");
    }
  }

  function executeLocked(options) {
    const repository = options.repository || IdempotencyRepository;
    const now = options.now || (() => new Date());
    const currentUser = options.currentUser || Utils.currentUser;
    const key = validateKey(options.key);
    if (key && key.success === false) return key;
    const hash = payloadHash(options.normalizedPayload);
    const currentTime = now();
    let record = repository.find(key);

    if (record && (record[IDEMPOTENCY_FIELDS.OPERATION] !== options.operation || record[IDEMPOTENCY_FIELDS.PAYLOAD_HASH] !== hash)) {
      return Response.error("IdempotencyKey telah digunakan dengan payload yang berbeda.");
    }

    if (record && record[IDEMPOTENCY_FIELDS.STATUS] === STATUS.COMMITTED) {
      return replay(record);
    }

    if (record && record[IDEMPOTENCY_FIELDS.RESOURCE_ID]) {
      const recovered = options.recover(record[IDEMPOTENCY_FIELDS.RESOURCE_ID], options.normalizedPayload);
      if (recovered && recovered.success === true) {
        const responsePayload = JSON.stringify(recovered);
        if (!repository.update(key, {
          [IDEMPOTENCY_FIELDS.STATUS]: STATUS.COMMITTED,
          [IDEMPOTENCY_FIELDS.RESPONSE_PAYLOAD]: responsePayload,
          [IDEMPOTENCY_SCHEMA.SYSTEM.UPDATED_AT]: currentTime,
          [IDEMPOTENCY_SCHEMA.SYSTEM.UPDATED_BY]: currentUser(),
        })) return Response.error("Status idempotensi belum dapat dikonfirmasi. Silakan coba lagi.");
        return replay(Object.assign({}, record, { [IDEMPOTENCY_FIELDS.RESPONSE_PAYLOAD]: responsePayload }));
      }
      if (recovered && recovered.success === false) return recovered;
    }

    if (record && record[IDEMPOTENCY_FIELDS.STATUS] === STATUS.PENDING && currentTime.getTime() - parseTime(record[IDEMPOTENCY_SCHEMA.SYSTEM.UPDATED_AT]) < PENDING_TIMEOUT_MS) {
      return Response.error("Permintaan yang sama masih diproses. Silakan coba lagi.");
    }

    const resourceId = record && record[IDEMPOTENCY_FIELDS.RESOURCE_ID]
      ? record[IDEMPOTENCY_FIELDS.RESOURCE_ID]
      : options.generateResourceId();
    const pending = {
      [IDEMPOTENCY_FIELDS.OPERATION]: options.operation,
      [IDEMPOTENCY_FIELDS.PAYLOAD_HASH]: hash,
      [IDEMPOTENCY_FIELDS.STATUS]: STATUS.PENDING,
      [IDEMPOTENCY_FIELDS.RESOURCE_ID]: resourceId,
      [IDEMPOTENCY_FIELDS.RESPONSE_PAYLOAD]: "",
      [IDEMPOTENCY_FIELDS.EXPIRES_AT]: new Date(currentTime.getTime() + RETENTION_MS),
      [IDEMPOTENCY_SCHEMA.SYSTEM.UPDATED_AT]: currentTime,
      [IDEMPOTENCY_SCHEMA.SYSTEM.UPDATED_BY]: currentUser(),
    };

    if (record) {
      if (!repository.update(key, pending)) return Response.error("Gagal memperbarui reservasi idempotensi.");
    } else {
      const created = Object.assign({}, IDEMPOTENCY_SCHEMA.DEFAULT, pending, {
        [IDEMPOTENCY_FIELDS.KEY]: key,
        [IDEMPOTENCY_SCHEMA.SYSTEM.CREATED_AT]: currentTime,
        [IDEMPOTENCY_SCHEMA.SYSTEM.CREATED_BY]: currentUser(),
      });
      if (!repository.insert(created)) return Response.error("Gagal membuat reservasi idempotensi.");
      record = created;
    }

    let result;
    try {
      result = options.execute(resourceId);
    } catch (error) {
      repository.update(key, {
        [IDEMPOTENCY_FIELDS.STATUS]: STATUS.RELEASED,
        [IDEMPOTENCY_SCHEMA.SYSTEM.UPDATED_AT]: now(),
        [IDEMPOTENCY_SCHEMA.SYSTEM.UPDATED_BY]: currentUser(),
      });
      throw error;
    }

    if (!result || result.success !== true) {
      repository.update(key, {
        [IDEMPOTENCY_FIELDS.STATUS]: STATUS.RELEASED,
        [IDEMPOTENCY_SCHEMA.SYSTEM.UPDATED_AT]: now(),
        [IDEMPOTENCY_SCHEMA.SYSTEM.UPDATED_BY]: currentUser(),
      });
      return result || Response.error("Operasi idempotensi gagal.");
    }

    const responsePayload = JSON.stringify(result);
    if (!repository.update(key, {
      [IDEMPOTENCY_FIELDS.STATUS]: STATUS.COMMITTED,
      [IDEMPOTENCY_FIELDS.RESPONSE_PAYLOAD]: responsePayload,
      [IDEMPOTENCY_SCHEMA.SYSTEM.UPDATED_AT]: now(),
      [IDEMPOTENCY_SCHEMA.SYSTEM.UPDATED_BY]: currentUser(),
    })) return Response.error("Permintaan berhasil diproses tetapi status idempotensi belum dapat dikonfirmasi. Silakan ulangi permintaan yang sama.");

    return result;
  }

  function execute(options) {
    const getMutationLock = options.getMutationLock || (() => LockService.getScriptLock());
    const lock = getMutationLock();
    const alreadyOwned = typeof lock.hasLock === "function" && lock.hasLock();
    if (!alreadyOwned && !lock.tryLock(Number(options.lockTimeoutMs) || 10000)) {
      return Response.error("Layanan idempotensi sedang digunakan. Silakan coba lagi.");
    }
    try { return executeLocked(options); }
    finally { if (!alreadyOwned) lock.releaseLock(); }
  }

  function cleanupExpired(options = {}) {
    const repository = options.repository || IdempotencyRepository;
    const now = options.now || new Date();
    const getMutationLock = options.getMutationLock || (() => LockService.getScriptLock());
    const lock = getMutationLock();
    const alreadyOwned = typeof lock.hasLock === "function" && lock.hasLock();
    if (!alreadyOwned && !lock.tryLock(Number(options.lockTimeoutMs) || 10000)) {
      throw new Error("Idempotency cleanup lock timeout.");
    }
    try {
      return repository.rows().reduce((removed, record) => {
        if (
          record[IDEMPOTENCY_FIELDS.STATUS] !== STATUS.PENDING &&
          parseTime(record[IDEMPOTENCY_FIELDS.EXPIRES_AT]) > 0 &&
          parseTime(record[IDEMPOTENCY_FIELDS.EXPIRES_AT]) <= now.getTime() &&
          repository.remove(record[IDEMPOTENCY_FIELDS.KEY])
        ) return removed + 1;
        return removed;
      }, 0);
    } finally { if (!alreadyOwned) lock.releaseLock(); }
  }

  return Object.freeze({ KEY_PATTERN, STATUS, PENDING_TIMEOUT_MS, RETENTION_MS, canonicalJson, payloadHash, validateKey, execute, cleanupExpired });
})();
