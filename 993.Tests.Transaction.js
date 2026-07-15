function testPickupServicePublicApi() {
  const keys = Object.keys(PickupService()).sort();

  const expectedKeys = [
    "create",
    "findAll",
    "findById",
    "remove",
    "restore",
    "update",
  ];

  if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) {
    throw new Error("PickupService public API is invalid.");
  }

  Logger.log("PickupService public API passed.");
}

function testPickupServiceFindAll() {
  const response = PickupService().findAll();

  if (!response.success || !Array.isArray(response.data)) {
    throw new Error("PickupService.findAll() response is invalid.");
  }

  Logger.log(response);
}

function testPickupServiceFindByIdValidation() {
  const response = PickupService().findById(" ");

  if (response.success || response.data !== null) {
    throw new Error("PickupService.findById() must reject an empty ID.");
  }

  Logger.log(response);
}

function testPickupControllerPublicApi() {
  const functions = [
    getPickups,
    getPickup,
    createPickup,
    updatePickup,
    deletePickup,
    restorePickup,
  ];

  if (functions.some((fn) => typeof fn !== "function")) {
    throw new Error("Pickup Controller public API is invalid.");
  }

  Logger.log("Pickup Controller public API passed.");
}

function testPickupControllerGetPickups() {
  const response = getPickups();

  if (
    !response ||
    typeof response !== "object" ||
    Array.isArray(response) ||
    typeof response.success !== "boolean" ||
    !Array.isArray(response.data)
  ) {
    throw new Error("getPickups() response is invalid.");
  }

  JSON.stringify(response);

  Logger.log(response);
}

function testPickupControllerGetPickupValidation() {
  const response = getPickup("");

  if (response.success || response.data !== null || !response.message) {
    throw new Error(
      'getPickup("") must return the service validation response.',
    );
  }

  Logger.log(response);
}

function testPickupControllerCreateValidation() {
  const headerCount = RepositoryReader.count(PICKUP_HEADER_SCHEMA);
  const detailCount = RepositoryReader.count(PICKUP_DETAIL_SCHEMA);
  const response = createPickup(null);

  if (response.success || response.data !== null) {
    throw new Error("createPickup(null) must return a validation failure.");
  }

  if (
    RepositoryReader.count(PICKUP_HEADER_SCHEMA) !== headerCount ||
    RepositoryReader.count(PICKUP_DETAIL_SCHEMA) !== detailCount
  ) {
    throw new Error("createPickup(null) must not write data.");
  }

  Logger.log(response);
}

function testPickupControllerUpdateValidation() {
  const headerCount = RepositoryReader.count(PICKUP_HEADER_SCHEMA);
  const detailCount = RepositoryReader.count(PICKUP_DETAIL_SCHEMA);
  const response = updatePickup("", null);

  if (response.success || response.data !== null) {
    throw new Error('updatePickup("", null) must return a validation failure.');
  }

  if (
    RepositoryReader.count(PICKUP_HEADER_SCHEMA) !== headerCount ||
    RepositoryReader.count(PICKUP_DETAIL_SCHEMA) !== detailCount
  ) {
    throw new Error("Invalid pickup update must not write data.");
  }

  Logger.log(response);
}

function testPickupControllerDeleteValidation() {
  const headerCount = RepositoryReader.count(PICKUP_HEADER_SCHEMA);
  const detailCount = RepositoryReader.count(PICKUP_DETAIL_SCHEMA);
  const response = deletePickup("");

  if (response.success || response.data !== null) {
    throw new Error('deletePickup("") must return a validation failure.');
  }

  if (
    RepositoryReader.count(PICKUP_HEADER_SCHEMA) !== headerCount ||
    RepositoryReader.count(PICKUP_DETAIL_SCHEMA) !== detailCount
  ) {
    throw new Error("Invalid pickup deletion must not change data.");
  }

  Logger.log(response);
}

function testPickupControllerRestoreValidation() {
  const headerCount = RepositoryReader.count(PICKUP_HEADER_SCHEMA);
  const detailCount = RepositoryReader.count(PICKUP_DETAIL_SCHEMA);
  const response = restorePickup("");

  if (response.success || response.data !== null) {
    throw new Error('restorePickup("") must return a validation failure.');
  }

  if (
    RepositoryReader.count(PICKUP_HEADER_SCHEMA) !== headerCount ||
    RepositoryReader.count(PICKUP_DETAIL_SCHEMA) !== detailCount
  ) {
    throw new Error("Invalid pickup restoration must not change data.");
  }

  Logger.log(response);
}

function testPickupControllerSerialization() {
  const response = getPickups();
  const values = [response];

  while (values.length > 0) {
    const value = values.pop();

    if (value instanceof Date || typeof value === "function") {
      throw new Error("Pickup Controller response contains an unsafe value.");
    }

    if (!value || typeof value !== "object") {
      continue;
    }

    Object.keys(value).forEach((key) => {
      values.push(value[key]);
    });
  }

  try {
    JSON.stringify(response);
  } catch (error) {
    throw new Error("Pickup Controller response must be JSON serializable.");
  }

  Logger.log(response);
}

function testPickupServiceHeaderDetailRead() {
  const service = PickupService();

  const headers = service.findAll();

  if (headers.data.length === 0) {
    Logger.log("No pickup header data available; header-detail test skipped.");

    return;
  }

  const id = headers.data[0][PICKUP_HEADER_SCHEMA.PRIMARY_KEY];

  const response = service.findById(id);

  if (
    !response.success ||
    !response.data ||
    !response.data.header ||
    !Array.isArray(response.data.details)
  ) {
    throw new Error("PickupService header-detail response is invalid.");
  }

  Logger.log(response);
}

function assertPickupCreateFailure(document) {
  const headerCount = RepositoryReader.count(PICKUP_HEADER_SCHEMA);

  const detailCount = RepositoryReader.count(PICKUP_DETAIL_SCHEMA);

  const response = PickupService().create(document);

  if (response.success) {
    throw new Error("Pickup creation should have failed.");
  }

  if (
    RepositoryReader.count(PICKUP_HEADER_SCHEMA) !== headerCount ||
    RepositoryReader.count(PICKUP_DETAIL_SCHEMA) !== detailCount
  ) {
    throw new Error("Invalid pickup creation must not write data.");
  }

  Logger.log(response);
}

function findActivePickupTestPartner() {
  const partner = RepositoryReader.findAll(PARTNER_SCHEMA).find((item) => {
    return item[PARTNER_SCHEMA.SYSTEM.IS_ACTIVE] === true;
  });

  if (!partner) {
    Logger.log(
      "SKIPPED: Active Partner data is required for this Pickup test.",
    );

    return null;
  }

  return partner;
}

function findActivePickupTestProducts(count) {
  const ids = Object.create(null);

  const products = RepositoryReader.findAll(PRODUCT_SCHEMA).filter((item) => {
    const id = item[PRODUCT_SCHEMA.PRIMARY_KEY];

    if (item[PRODUCT_SCHEMA.SYSTEM.IS_ACTIVE] !== true || ids[id]) {
      return false;
    }

    ids[id] = true;

    return true;
  });

  if (products.length < count) {
    Logger.log(
      `SKIPPED: ${count} distinct active Product record(s) are required for this Pickup test.`,
    );

    return null;
  }

  return products;
}

function testPickupCreateMissingDocument() {
  assertPickupCreateFailure(null);
}

function testPickupCreateMissingHeader() {
  assertPickupCreateFailure({
    details: [{}],
  });
}

function testPickupCreateEmptyDetails() {
  assertPickupCreateFailure({
    header: {},

    details: [],
  });
}

function testPickupCreateMissingTanggal() {
  assertPickupCreateFailure({
    header: {
      [PICKUP_HEADER_FIELDS.PARTNER_ID]: "PARTNER_TEST",
    },

    details: [{}],
  });
}

function testPickupCreateMissingPartnerId() {
  assertPickupCreateFailure({
    header: {
      [PICKUP_HEADER_FIELDS.DATE]: new Date(),
    },

    details: [{}],
  });
}

function testPickupCreateInvalidPartnerId() {
  assertPickupCreateFailure({
    header: {
      [PICKUP_HEADER_FIELDS.DATE]: new Date(),

      [PICKUP_HEADER_FIELDS.PARTNER_ID]: "PARTNER_TEST_INVALID",
    },

    details: [{}],
  });
}

function testPickupCreateMissingProductId() {
  const partner = findActivePickupTestPartner();

  if (!partner) {
    return;
  }

  assertPickupCreateFailure({
    header: {
      [PICKUP_HEADER_FIELDS.DATE]: new Date(),

      [PICKUP_HEADER_FIELDS.PARTNER_ID]: partner[PARTNER_SCHEMA.PRIMARY_KEY],
    },

    details: [
      {
        [PICKUP_DETAIL_FIELDS.QTY]: 1,
      },
    ],
  });
}

function testPickupCreateInvalidProductId() {
  const partner = findActivePickupTestPartner();

  if (!partner) {
    return;
  }

  assertPickupCreateFailure({
    header: {
      [PICKUP_HEADER_FIELDS.DATE]: new Date(),

      [PICKUP_HEADER_FIELDS.PARTNER_ID]: partner[PARTNER_SCHEMA.PRIMARY_KEY],
    },

    details: [
      {
        [PICKUP_DETAIL_FIELDS.PRODUCT_ID]: "PRODUCT_TEST_INVALID",

        [PICKUP_DETAIL_FIELDS.QTY]: 1,
      },
    ],
  });
}

function testPickupCreateInvalidQty() {
  const partner = findActivePickupTestPartner();

  if (!partner) {
    return;
  }

  const products = findActivePickupTestProducts(1);

  if (!products) {
    return;
  }

  [0, -1].forEach((qty) => {
    assertPickupCreateFailure({
      header: {
        [PICKUP_HEADER_FIELDS.DATE]: new Date(),

        [PICKUP_HEADER_FIELDS.PARTNER_ID]: partner[PARTNER_SCHEMA.PRIMARY_KEY],
      },

      details: [
        {
          [PICKUP_DETAIL_FIELDS.PRODUCT_ID]:
            products[0][PRODUCT_SCHEMA.PRIMARY_KEY],

          [PICKUP_DETAIL_FIELDS.QTY]: qty,
        },
      ],
    });
  });
}

function testPickupCreateDuplicateProductId() {
  const partner = findActivePickupTestPartner();

  if (!partner) {
    return;
  }

  const products = findActivePickupTestProducts(1);

  if (!products) {
    return;
  }

  assertPickupCreateFailure({
    header: {
      [PICKUP_HEADER_FIELDS.DATE]: new Date(),

      [PICKUP_HEADER_FIELDS.PARTNER_ID]: partner[PARTNER_SCHEMA.PRIMARY_KEY],
    },

    details: [
      {
        [PICKUP_DETAIL_FIELDS.PRODUCT_ID]:
          products[0][PRODUCT_SCHEMA.PRIMARY_KEY],

        [PICKUP_DETAIL_FIELDS.QTY]: 1,
      },

      {
        [PICKUP_DETAIL_FIELDS.PRODUCT_ID]:
          products[0][PRODUCT_SCHEMA.PRIMARY_KEY],

        [PICKUP_DETAIL_FIELDS.QTY]: 1,
      },
    ],
  });
}

function testPickupCreateValidSingleItem() {
  const partner = findActivePickupTestPartner();

  if (!partner) {
    return;
  }

  const products = findActivePickupTestProducts(1);

  if (!products) {
    return;
  }

  const response = PickupService().create({
    header: {
      [PICKUP_HEADER_FIELDS.DATE]: new Date(),

      [PICKUP_HEADER_FIELDS.PARTNER_ID]: partner[PARTNER_SCHEMA.PRIMARY_KEY],

      [PICKUP_HEADER_FIELDS.NOTES]: "[TEST] Pickup single-item manual cleanup",
    },

    details: [
      {
        [PICKUP_DETAIL_FIELDS.PRODUCT_ID]:
          products[0][PRODUCT_SCHEMA.PRIMARY_KEY],

        [PICKUP_DETAIL_FIELDS.QTY]: 2,

        [PICKUP_DETAIL_FIELDS.NOTES]: "[TEST] Pickup single-item detail",
      },
    ],
  });

  if (
    !response.success ||
    !response.data ||
    !response.data.header ||
    response.data.details.length !== 1 ||
    response.data.header[PICKUP_HEADER_FIELDS.NUMBER] !==
      response.data.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY] ||
    response.data.header[PICKUP_HEADER_FIELDS.TOTAL_ITEM] !== 1 ||
    response.data.header[PICKUP_HEADER_FIELDS.TOTAL_QTY] !== 2 ||
    response.data.details[0][PICKUP_DETAIL_FIELDS.PICKUP_ID] !==
      response.data.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]
  ) {
    throw new Error("Single-item pickup creation response is invalid.");
  }

  Logger.log(
    `Pickup test created header ${response.data.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]} and detail ${response.data.details[0][PICKUP_DETAIL_SCHEMA.PRIMARY_KEY]}.`,
  );
}

function testPickupCreateValidMultiItem() {
  const partner = findActivePickupTestPartner();

  if (!partner) {
    return;
  }

  const products = findActivePickupTestProducts(2);

  if (!products) {
    return;
  }

  const response = PickupService().create({
    header: {
      [PICKUP_HEADER_FIELDS.DATE]: new Date(),

      [PICKUP_HEADER_FIELDS.PARTNER_ID]: partner[PARTNER_SCHEMA.PRIMARY_KEY],

      [PICKUP_HEADER_FIELDS.NOTES]: "[TEST] Pickup multi-item manual cleanup",
    },

    details: [
      {
        [PICKUP_DETAIL_FIELDS.PRODUCT_ID]:
          products[0][PRODUCT_SCHEMA.PRIMARY_KEY],

        [PICKUP_DETAIL_FIELDS.QTY]: 2,

        [PICKUP_DETAIL_FIELDS.NOTES]: "[TEST] Pickup multi-item detail one",
      },

      {
        [PICKUP_DETAIL_FIELDS.PRODUCT_ID]:
          products[1][PRODUCT_SCHEMA.PRIMARY_KEY],

        [PICKUP_DETAIL_FIELDS.QTY]: 3,

        [PICKUP_DETAIL_FIELDS.NOTES]: "[TEST] Pickup multi-item detail two",
      },
    ],
  });

  if (
    !response.success ||
    !response.data ||
    !response.data.header ||
    response.data.details.length !== 2 ||
    response.data.header[PICKUP_HEADER_FIELDS.TOTAL_ITEM] !== 2 ||
    response.data.header[PICKUP_HEADER_FIELDS.TOTAL_QTY] !== 5 ||
    !response.data.details.every((detail) => {
      return (
        detail[PICKUP_DETAIL_FIELDS.PICKUP_ID] ===
        response.data.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]
      );
    })
  ) {
    throw new Error("Multi-item pickup creation response is invalid.");
  }

  Logger.log(
    `Pickup test created header ${response.data.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]} and details ${response.data.details.map((detail) => detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY]).join(", ")}.`,
  );
}

function createPickupUpdateTestTransaction(detailCount) {
  const partner = findActivePickupTestPartner();
  const products = findActivePickupTestProducts(detailCount);

  if (!partner || !products) {
    return null;
  }

  const response = PickupService().create({
    header: {
      [PICKUP_HEADER_FIELDS.DATE]: new Date(),
      [PICKUP_HEADER_FIELDS.PARTNER_ID]: partner[PARTNER_SCHEMA.PRIMARY_KEY],
      [PICKUP_HEADER_FIELDS.NOTES]: "[TEST] Pickup update manual cleanup",
    },
    details: products.slice(0, detailCount).map((product, index) => ({
      [PICKUP_DETAIL_FIELDS.PRODUCT_ID]: product[PRODUCT_SCHEMA.PRIMARY_KEY],
      [PICKUP_DETAIL_FIELDS.QTY]: index + 1,
      [PICKUP_DETAIL_FIELDS.NOTES]: "[TEST] Pickup update source detail",
    })),
  });

  if (!response.success) {
    throw new Error("Pickup update test transaction could not be created.");
  }

  Logger.log(
    `Pickup update test created header ${response.data.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]} and details ${response.data.details.map((detail) => detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY]).join(", ")}. Manual cleanup required.`,
  );

  return response.data;
}

function assertPickupUpdateFailure(id, document) {
  const headerCount = RepositoryReader.count(PICKUP_HEADER_SCHEMA);
  const detailCount = RepositoryReader.count(PICKUP_DETAIL_SCHEMA);
  const response = PickupService().update(id, document);

  if (response.success) {
    throw new Error("Pickup update should have failed.");
  }

  if (
    RepositoryReader.count(PICKUP_HEADER_SCHEMA) !== headerCount ||
    RepositoryReader.count(PICKUP_DETAIL_SCHEMA) !== detailCount
  ) {
    throw new Error("Invalid pickup update must not write data.");
  }

  Logger.log(response);
}

function pickupUpdateDocument(partnerId, productId, qty) {
  return {
    header: {
      [PICKUP_HEADER_FIELDS.DATE]: new Date(),
      [PICKUP_HEADER_FIELDS.PARTNER_ID]: partnerId,
      [PICKUP_HEADER_FIELDS.NOTES]: "[TEST] Pickup update replacement",
    },
    details: [
      {
        [PICKUP_DETAIL_FIELDS.PRODUCT_ID]: productId,
        [PICKUP_DETAIL_FIELDS.QTY]: qty,
        [PICKUP_DETAIL_FIELDS.NOTES]: "[TEST] Pickup update replacement detail",
      },
    ],
  };
}

function testPickupUpdateMissingId() {
  assertPickupUpdateFailure(" ", null);
}

function testPickupUpdateUnknownId() {
  assertPickupUpdateFailure("PH_TEST_UNKNOWN", {
    header: {},
    details: [],
  });
}

function testPickupUpdateMissingDocument() {
  const transaction = createPickupUpdateTestTransaction(1);

  if (transaction) {
    assertPickupUpdateFailure(
      transaction.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY],
      null,
    );
  }
}

function testPickupUpdateMissingHeader() {
  const transaction = createPickupUpdateTestTransaction(1);

  if (transaction) {
    assertPickupUpdateFailure(
      transaction.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY],
      {
        details: [{}],
      },
    );
  }
}

function testPickupUpdateEmptyDetails() {
  const transaction = createPickupUpdateTestTransaction(1);

  if (transaction) {
    assertPickupUpdateFailure(
      transaction.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY],
      {
        header: {},
        details: [],
      },
    );
  }
}

function testPickupUpdateMissingTanggal() {
  const transaction = createPickupUpdateTestTransaction(1);

  if (transaction) {
    const detail = transaction.details[0];
    assertPickupUpdateFailure(
      transaction.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY],
      {
        header: {
          [PICKUP_HEADER_FIELDS.PARTNER_ID]:
            transaction.header[PICKUP_HEADER_FIELDS.PARTNER_ID],
        },
        details: [detail],
      },
    );
  }
}

function testPickupUpdateMissingPartnerId() {
  const transaction = createPickupUpdateTestTransaction(1);

  if (transaction) {
    const detail = transaction.details[0];
    assertPickupUpdateFailure(
      transaction.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY],
      {
        header: {
          [PICKUP_HEADER_FIELDS.DATE]: new Date(),
        },
        details: [detail],
      },
    );
  }
}

function testPickupUpdateInvalidPartnerId() {
  const transaction = createPickupUpdateTestTransaction(1);

  if (transaction) {
    const detail = transaction.details[0];
    assertPickupUpdateFailure(
      transaction.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY],
      pickupUpdateDocument(
        "PARTNER_TEST_INVALID",
        detail[PICKUP_DETAIL_FIELDS.PRODUCT_ID],
        1,
      ),
    );
  }
}

function testPickupUpdateMissingProductId() {
  const transaction = createPickupUpdateTestTransaction(1);

  if (transaction) {
    assertPickupUpdateFailure(
      transaction.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY],
      {
        header: {
          [PICKUP_HEADER_FIELDS.DATE]: new Date(),
          [PICKUP_HEADER_FIELDS.PARTNER_ID]:
            transaction.header[PICKUP_HEADER_FIELDS.PARTNER_ID],
        },
        details: [{ [PICKUP_DETAIL_FIELDS.QTY]: 1 }],
      },
    );
  }
}

function testPickupUpdateInvalidProductId() {
  const transaction = createPickupUpdateTestTransaction(1);

  if (transaction) {
    assertPickupUpdateFailure(
      transaction.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY],
      pickupUpdateDocument(
        transaction.header[PICKUP_HEADER_FIELDS.PARTNER_ID],
        "PRODUCT_TEST_INVALID",
        1,
      ),
    );
  }
}

function testPickupUpdateInvalidQty() {
  const transaction = createPickupUpdateTestTransaction(1);

  if (transaction) {
    const detail = transaction.details[0];
    assertPickupUpdateFailure(
      transaction.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY],
      pickupUpdateDocument(
        transaction.header[PICKUP_HEADER_FIELDS.PARTNER_ID],
        detail[PICKUP_DETAIL_FIELDS.PRODUCT_ID],
        0,
      ),
    );
  }
}

function testPickupUpdateDuplicateProductId() {
  const transaction = createPickupUpdateTestTransaction(1);

  if (transaction) {
    const detail = transaction.details[0];
    const document = pickupUpdateDocument(
      transaction.header[PICKUP_HEADER_FIELDS.PARTNER_ID],
      detail[PICKUP_DETAIL_FIELDS.PRODUCT_ID],
      1,
    );
    document.details.push(Object.assign({}, document.details[0]));
    assertPickupUpdateFailure(
      transaction.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY],
      document,
    );
  }
}

function assertPickupUpdateReplacement(initialCount, replacementCount) {
  const transaction = createPickupUpdateTestTransaction(initialCount);
  const products = findActivePickupTestProducts(replacementCount);

  if (!transaction || !products) {
    return;
  }

  const headerId = transaction.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY];
  const pickupNo = transaction.header[PICKUP_HEADER_FIELDS.NUMBER];
  const oldDetailIds = transaction.details.map(
    (detail) => detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY],
  );
  const document = {
    header: {
      [PICKUP_HEADER_FIELDS.DATE]: new Date(),
      [PICKUP_HEADER_FIELDS.PARTNER_ID]:
        transaction.header[PICKUP_HEADER_FIELDS.PARTNER_ID],
      [PICKUP_HEADER_FIELDS.NOTES]:
        "[TEST] Pickup update replacement manual cleanup",
    },
    details: products.slice(0, replacementCount).map((product, index) => ({
      [PICKUP_DETAIL_FIELDS.PRODUCT_ID]: product[PRODUCT_SCHEMA.PRIMARY_KEY],
      [PICKUP_DETAIL_FIELDS.QTY]: index + 2,
      [PICKUP_DETAIL_FIELDS.NOTES]: "[TEST] Pickup update replacement detail",
    })),
  };
  const response = PickupService().update(headerId, document);

  if (!response.success) {
    throw new Error("Pickup update replacement failed.");
  }

  const expectedQty = document.details.reduce((total, detail) => {
    return total + Number(detail[PICKUP_DETAIL_FIELDS.QTY]);
  }, 0);
  const active = PickupService().findById(headerId);
  const newDetailIds = response.data.details.map(
    (detail) => detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY],
  );

  if (
    response.data.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY] !== headerId ||
    response.data.header[PICKUP_HEADER_FIELDS.NUMBER] !== pickupNo ||
    response.data.header[PICKUP_HEADER_FIELDS.TOTAL_ITEM] !==
      replacementCount ||
    response.data.header[PICKUP_HEADER_FIELDS.TOTAL_QTY] !== expectedQty ||
    !active.success ||
    active.data.details.length !== replacementCount ||
    active.data.details.some(
      (detail) =>
        oldDetailIds.indexOf(detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY]) !== -1,
    ) ||
    newDetailIds.some((id) => oldDetailIds.indexOf(id) !== -1)
  ) {
    throw new Error("Pickup update replacement result is invalid.");
  }

  Logger.log(
    `Pickup update test header ${headerId}; old details ${oldDetailIds.join(", ")}; replacement details ${newDetailIds.join(", ")}. Manual cleanup required.`,
  );
}

function testPickupUpdateSingleToMultiItem() {
  assertPickupUpdateReplacement(1, 2);
}

function testPickupUpdateMultiToSingleItem() {
  assertPickupUpdateReplacement(2, 1);
}

function testPickupUpdatePreservesHeaderIdentity() {
  assertPickupUpdateReplacement(1, 1);
}

function testPickupUpdateRecalculatesTotals() {
  assertPickupUpdateReplacement(1, 2);
}

function testPickupUpdateReplacesActiveDetails() {
  assertPickupUpdateReplacement(2, 1);
}

function findPickupRecordIncludingDeleted(schema, id) {
  return (
    RepositoryBase.mapRows(schema, RepositoryReader.raw(schema)).find(
      (item) => {
        return item[schema.PRIMARY_KEY] === id;
      },
    ) || null
  );
}

function findPickupDetailsIncludingDeleted(pickupId) {
  return RepositoryBase.mapRows(
    PICKUP_DETAIL_SCHEMA,
    RepositoryReader.raw(PICKUP_DETAIL_SCHEMA),
  ).filter((detail) => {
    return detail[PICKUP_DETAIL_FIELDS.PICKUP_ID] === pickupId;
  });
}

function assertPickupRemoved(transaction) {
  const headerId = transaction.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY];
  const pickupNo = transaction.header[PICKUP_HEADER_FIELDS.NUMBER];
  const detailIds = transaction.details.map(
    (detail) => detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY],
  );
  const response = PickupService().remove(headerId);
  const storedHeader = findPickupRecordIncludingDeleted(
    PICKUP_HEADER_SCHEMA,
    headerId,
  );
  const storedDetails = findPickupDetailsIncludingDeleted(headerId);

  if (
    !response.success ||
    PickupService().findById(headerId).success ||
    PickupService()
      .findAll()
      .data.some(
        (header) => header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY] === headerId,
      ) ||
    RepositoryReader.find(PICKUP_DETAIL_SCHEMA, {
      [PICKUP_DETAIL_FIELDS.PICKUP_ID]: headerId,
    }).length !== 0 ||
    !storedHeader ||
    storedHeader[PICKUP_HEADER_SCHEMA.PRIMARY_KEY] !== headerId ||
    storedHeader[PICKUP_HEADER_FIELDS.NUMBER] !== pickupNo ||
    storedHeader[PICKUP_HEADER_SCHEMA.SYSTEM.IS_DELETED] !== true ||
    storedDetails.length !== detailIds.length ||
    storedDetails.some(
      (detail) =>
        detail[PICKUP_DETAIL_SCHEMA.SYSTEM.IS_DELETED] !== true ||
        detailIds.indexOf(detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY]) === -1,
    )
  ) {
    throw new Error("Pickup remove result is invalid.");
  }

  return {
    headerId,
    pickupNo,
    detailIds,
  };
}

function assertPickupRestored(identity) {
  const response = PickupService().restore(identity.headerId);
  const active = PickupService().findById(identity.headerId);

  if (
    !response.success ||
    !active.success ||
    active.data.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY] !==
      identity.headerId ||
    active.data.header[PICKUP_HEADER_FIELDS.NUMBER] !== identity.pickupNo ||
    active.data.details.length !== identity.detailIds.length ||
    active.data.details.some(
      (detail) =>
        identity.detailIds.indexOf(detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY]) ===
        -1,
    )
  ) {
    throw new Error("Pickup restore result is invalid.");
  }

  return active.data;
}

function testPickupRemoveMissingId() {
  const response = PickupService().remove(" ");

  if (response.success) {
    throw new Error("Pickup remove must reject an empty ID.");
  }

  Logger.log(response);
}

function testPickupRemoveUnknownId() {
  const response = PickupService().remove("PH_TEST_UNKNOWN");

  if (response.success) {
    throw new Error("Pickup remove must reject an unknown ID.");
  }

  Logger.log(response);
}

function testPickupRemoveHeaderAndDetails() {
  const transaction = createPickupUpdateTestTransaction(1);

  if (transaction) {
    assertPickupRemoved(transaction);
  }
}

function testPickupRemovePreservesIdentity() {
  const transaction = createPickupUpdateTestTransaction(1);

  if (transaction) {
    assertPickupRemoved(transaction);
  }
}

function testPickupRemoveDoesNotAffectOtherPickup() {
  const target = createPickupUpdateTestTransaction(1);
  const other = createPickupUpdateTestTransaction(1);

  if (!target || !other) {
    return;
  }

  assertPickupRemoved(target);

  if (
    !PickupService().findById(other.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY])
      .success
  ) {
    throw new Error("Pickup remove affected another transaction.");
  }
}

function testPickupRemoveAlreadyDeleted() {
  const transaction = createPickupUpdateTestTransaction(1);

  if (!transaction) {
    return;
  }

  const identity = assertPickupRemoved(transaction);
  const response = PickupService().remove(identity.headerId);

  if (
    !response.success ||
    response.data.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY] !== identity.headerId
  ) {
    throw new Error(
      "Pickup remove must follow the idempotent writer convention.",
    );
  }
}

function testPickupRestoreMissingId() {
  const response = PickupService().restore(" ");

  if (response.success) {
    throw new Error("Pickup restore must reject an empty ID.");
  }

  Logger.log(response);
}

function testPickupRestoreUnknownId() {
  const response = PickupService().restore("PH_TEST_UNKNOWN");

  if (response.success) {
    throw new Error("Pickup restore must reject an unknown ID.");
  }

  Logger.log(response);
}

function testPickupRestoreHeaderAndDetails() {
  const transaction = createPickupUpdateTestTransaction(1);

  if (transaction) {
    assertPickupRestored(assertPickupRemoved(transaction));
  }
}

function testPickupRestorePreservesIdentity() {
  const transaction = createPickupUpdateTestTransaction(1);

  if (transaction) {
    assertPickupRestored(assertPickupRemoved(transaction));
  }
}

function testPickupRestoreDoesNotAffectOtherPickup() {
  const target = createPickupUpdateTestTransaction(1);
  const other = createPickupUpdateTestTransaction(1);

  if (!target || !other) {
    return;
  }

  assertPickupRestored(assertPickupRemoved(target));

  if (
    !PickupService().findById(other.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY])
      .success
  ) {
    throw new Error("Pickup restore affected another transaction.");
  }
}

function testPickupRestoreAlreadyActive() {
  const transaction = createPickupUpdateTestTransaction(1);

  if (!transaction) {
    return;
  }

  const response = PickupService().restore(
    transaction.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY],
  );

  if (
    !response.success ||
    response.data.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY] !==
      transaction.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]
  ) {
    throw new Error(
      "Pickup restore must follow the idempotent writer convention.",
    );
  }
}

function testPickupRemoveRestoreRoundTrip() {
  const transaction = createPickupUpdateTestTransaction(2);

  if (transaction) {
    const restored = assertPickupRestored(assertPickupRemoved(transaction));
    Logger.log(
      `Pickup remove-restore test header ${restored.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]} and details ${restored.details.map((detail) => detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY]).join(", ")}. Manual cleanup required.`,
    );
  }
}

function createPickupTransactionServiceForTest() {
  return TransactionService.create({
    headerSchema: PICKUP_HEADER_SCHEMA,

    detailSchema: PICKUP_DETAIL_SCHEMA,

    detailForeignKey: PICKUP_DETAIL_FIELDS.PICKUP_ID,
  });
}

function testTransactionServicePublicApi() {
  const service = createPickupTransactionServiceForTest();

  const factoryKeys = Object.keys(TransactionService);

  const serviceKeys = Object.keys(service).sort();

  const expectedServiceKeys = [
    "create",
    "findAll",
    "findById",
    "remove",
    "restore",
    "update",
  ];

  if (factoryKeys.length !== 1 || factoryKeys[0] !== "create") {
    throw new Error("TransactionService public factory API is invalid.");
  }

  if (JSON.stringify(serviceKeys) !== JSON.stringify(expectedServiceKeys)) {
    throw new Error("TransactionService instance API is invalid.");
  }

  Logger.log("TransactionService public API passed.");
}

function testTransactionServiceFindAll() {
  const service = createPickupTransactionServiceForTest();

  const response = service.findAll();

  if (!response.success || !Array.isArray(response.data)) {
    throw new Error("TransactionService.findAll() response is invalid.");
  }

  Logger.log(response);
}

function testTransactionServiceFindByIdValidation() {
  const service = createPickupTransactionServiceForTest();

  const response = service.findById(" ");

  if (response.success || response.data !== null) {
    throw new Error("TransactionService.findById() must reject an empty ID.");
  }

  Logger.log(response);
}

function testTransactionServiceFindByIdResponseShape() {
  const service = createPickupTransactionServiceForTest();

  const headers = service.findAll();

  if (headers.data.length === 0) {
    Logger.log("No pickup header data available; response shape test skipped.");

    return;
  }

  const id = headers.data[0][PICKUP_HEADER_SCHEMA.PRIMARY_KEY];

  const response = service.findById(id);

  if (
    !response.success ||
    !response.data ||
    !response.data.header ||
    !Array.isArray(response.data.details)
  ) {
    throw new Error("TransactionService.findById() response shape is invalid.");
  }

  Logger.log(response);
}
