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

function testReturnControllerPublicApi() {
  const functions = [
    getReturns,
    getDeletedReturns,
    getReturn,
    createReturn,
    updateReturn,
    deleteReturn,
    restoreReturn,
  ];

  if (functions.some((fn) => typeof fn !== "function")) {
    throw new Error("Return Controller public API is invalid.");
  }

  Logger.log("Return Controller public API passed.");
}

function testReturnControllerGetReturns() {
  const response = getReturns();

  if (
    !response ||
    typeof response !== "object" ||
    Array.isArray(response) ||
    typeof response.success !== "boolean" ||
    !Array.isArray(response.data)
  ) {
    throw new Error("getReturns() response is invalid.");
  }

  JSON.stringify(response);

  Logger.log(response);
}

function testReturnControllerGetDeletedReturns() {
  const response = getDeletedReturns();

  if (
    !response ||
    typeof response !== "object" ||
    Array.isArray(response) ||
    !response.success ||
    !Array.isArray(response.data)
  ) {
    throw new Error("getDeletedReturns() response is invalid.");
  }

  if (
    response.data.some((row) => {
      return !returnStatusTrue(row.Deleted) || !returnStatusFalse(row.IsActive);
    })
  ) {
    throw new Error("getDeletedReturns() returned a nondeleted or active Return.");
  }

  Logger.log(response);
}

function testReturnControllerGetReturnValidation() {
  const response = getReturn("");

  if (response.success || response.data !== null || !response.message) {
    throw new Error(
      'getReturn("") must return the service validation response.',
    );
  }

  Logger.log(response);
}

function testReturnControllerCreateValidation() {
  const count = RepositoryReader.count(RETURN_SCHEMA);
  const response = createReturn(null);

  if (response.success || response.data !== null) {
    throw new Error("createReturn(null) must return a validation failure.");
  }

  if (RepositoryReader.count(RETURN_SCHEMA) !== count) {
    throw new Error("createReturn(null) must not write data.");
  }

  Logger.log(response);
}

function testReturnControllerUpdateValidation() {
  const count = RepositoryReader.count(RETURN_SCHEMA);
  const response = updateReturn("", null);

  if (response.success || response.data !== null) {
    throw new Error('updateReturn("", null) must return a validation failure.');
  }

  if (RepositoryReader.count(RETURN_SCHEMA) !== count) {
    throw new Error("Invalid return update must not write data.");
  }

  Logger.log(response);
}

function testReturnControllerDeleteValidation() {
  const count = RepositoryReader.count(RETURN_SCHEMA);
  const response = deleteReturn("");

  if (response.success || response.data !== null) {
    throw new Error('deleteReturn("") must return a validation failure.');
  }

  if (RepositoryReader.count(RETURN_SCHEMA) !== count) {
    throw new Error("Invalid return deletion must not change data.");
  }

  Logger.log(response);
}

function testReturnControllerRestoreValidation() {
  const count = RepositoryReader.count(RETURN_SCHEMA);
  const response = restoreReturn("");

  if (response.success || response.data !== null) {
    throw new Error('restoreReturn("") must return a validation failure.');
  }

  if (RepositoryReader.count(RETURN_SCHEMA) !== count) {
    throw new Error("Invalid return restoration must not change data.");
  }

  Logger.log(response);
}

function testReturnControllerSerialization() {
  const response = getReturns();

  assertReturnControllerSerializable(response);

  Logger.log(response);
}

function testReturnControllerDeletedSerialization() {
  const response = getDeletedReturns();

  assertReturnControllerSerializable(response);

  Logger.log(response);
}

function assertReturnControllerSerializable(response) {
  const values = [response];

  if (typeof response === "string") {
    throw new Error("Return Controller response must not be a JSON string.");
  }

  while (values.length > 0) {
    const value = values.pop();

    if (value instanceof Date || typeof value === "function") {
      throw new Error("Return Controller response contains an unsafe value.");
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
    throw new Error("Return Controller response must be JSON serializable.");
  }

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

function returnTestFixture() {
  const detail = RepositoryReader.findAll(PICKUP_DETAIL_SCHEMA).find((row) => {
    return (
      row[PICKUP_DETAIL_SCHEMA.SYSTEM.IS_ACTIVE] === true &&
      Number(row[PICKUP_DETAIL_FIELDS.QTY]) > 0
    );
  });

  if (!detail) {
    Logger.log("SKIPPED: no active Pickup Detail is available for Return tests.");

    return null;
  }

  const header = RepositoryReader.findById(
    PICKUP_HEADER_SCHEMA,
    detail[PICKUP_DETAIL_FIELDS.PICKUP_ID],
  );

  if (!header || header[PICKUP_HEADER_SCHEMA.SYSTEM.IS_ACTIVE] !== true) {
    Logger.log("SKIPPED: Pickup Header for the Return test fixture is inactive.");

    return null;
  }

  const used = RepositoryBase.mapRows(
    RETURN_SCHEMA,
    RepositoryReader.raw(RETURN_SCHEMA),
  )
    .filter((row) => {
      return (
        row[RETURN_SCHEMA.SYSTEM.IS_DELETED] !== true &&
        row[RETURN_SCHEMA.SYSTEM.IS_ACTIVE] === true &&
        row[RETURN_FIELDS.PICKUP_DETAIL_ID] ===
          detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY]
      );
    })
    .reduce((total, row) => total + Number(row[RETURN_FIELDS.QTY] || 0), 0);

  const available = Number(detail[PICKUP_DETAIL_FIELDS.QTY]) - used;

  if (available < 1) {
    Logger.log("SKIPPED: no available Pickup Detail quantity for Return tests.");

    return null;
  }

  return { detail, available };
}

function createReturnTestRow(fixture, qty = 1) {
  const response = ReturnService().create({
    [RETURN_FIELDS.PICKUP_DETAIL_ID]:
      fixture.detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY],

    [RETURN_FIELDS.DATE]: "2026-07-17",

    [RETURN_FIELDS.QTY]: qty,

    [RETURN_FIELDS.NOTE]: "Return test fixture",
  });

  if (!response.success) {
    throw new Error(`Unable to create Return test fixture: ${response.message}`);
  }

  Logger.log(`Return fixture requiring cleanup: ${response.data[RETURN_SCHEMA.PRIMARY_KEY]}`);

  return response.data;
}

function normalizeReturnTestDate(value) {
  const isDate = value instanceof Date;

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parts = value.split("-").map(Number);
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));

    if (
      date.getUTCFullYear() === parts[0] &&
      date.getUTCMonth() === parts[1] - 1 &&
      date.getUTCDate() === parts[2]
    ) {
      return value;
    }
  }

  if (
    !isDate &&
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})$/.test(value)
  ) {
    value = new Date(value);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return Utilities.formatDate(value, APP_CONFIG.TIMEZONE, "yyyy-MM-dd");
  }

  throw new Error(
    `Unable to normalize Return Tanggal: value=${String(value)}, typeof=${typeof value}, isDate=${value instanceof Date}.`,
  );
}

function cleanupReturnTestRow(row) {
  if (!row) return;

  const id = row[RETURN_SCHEMA.PRIMARY_KEY];
  const response = ReturnService().remove(id);

  if (!response.success) {
    Logger.log(`Return fixture requires manual cleanup: ${id}`);
    throw new Error(`Unable to clean up Return test fixture ${id}: ${response.message}`);
  }
}

function testReturnSchemaTableAndPrefix() {
  if (RETURN_SCHEMA.TABLE !== "Returns" || RETURN_SCHEMA.ID_PREFIX !== "RT") {
    throw new Error("Return schema table or ID prefix is invalid.");
  }
}

function testReturnSchemaHeaders() {
  const expected = ["ID", "PickupID", "PickupDetailID", "Tanggal", "Qty", "Keterangan", "Deleted", "IsActive", "CreatedAt", "CreatedBy", "UpdatedAt", "UpdatedBy"];

  if (JSON.stringify(RETURN_SCHEMA.HEADERS) !== JSON.stringify(expected)) {
    throw new Error("Return schema headers are invalid.");
  }
}

function testReturnSchemaFields() {
  if (
    RETURN_FIELDS.PICKUP_DETAIL_ID !== "PickupDetailID" ||
    Object.prototype.hasOwnProperty.call(RETURN_FIELDS, "PRODUCT_ID")
  ) {
    throw new Error("Return schema fields are invalid.");
  }
}

function testReturnSchemaValidationMetadata() {
  const rules = RETURN_SCHEMA.VALIDATION;

  if (
    !rules[RETURN_FIELDS.PICKUP_ID].required ||
    !rules[RETURN_FIELDS.PICKUP_DETAIL_ID].required ||
    !rules[RETURN_FIELDS.DATE].required ||
    !rules[RETURN_FIELDS.QTY].required ||
    !rules[RETURN_FIELDS.QTY].numeric ||
    rules[RETURN_FIELDS.QTY].min !== 1 ||
    rules[RETURN_FIELDS.NOTE].required
  ) {
    throw new Error("Return schema validation metadata is invalid.");
  }
}

function testReturnSchemaRegistry() {
  if (SCHEMA.RETURN !== RETURN_SCHEMA) {
    throw new Error("Return schema registry is invalid.");
  }
}

function testReturnServicePublicApi() {
  const keys = Object.keys(ReturnService()).sort();
  const expected = ["create", "findAll", "findById", "findDeleted", "remove", "restore", "update"];

  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    throw new Error("ReturnService public API is invalid.");
  }
}

function returnStatusTrue(value) {
  return value === true || value === 1 || String(value).trim().toLowerCase() === "true";
}

function returnStatusFalse(value) {
  return value === false || value === 0 || String(value).trim().toLowerCase() === "false";
}

function assertDeletedReturnRows(response) {
  if (!response?.success || !Array.isArray(response.data)) {
    throw new Error("ReturnService.findDeleted() response is invalid.");
  }

  if (
    response.data.some((row) => {
      return (
        !returnStatusTrue(row[RETURN_SCHEMA.SYSTEM.IS_DELETED]) ||
        !returnStatusFalse(row[RETURN_SCHEMA.SYSTEM.IS_ACTIVE])
      );
    })
  ) {
    throw new Error("ReturnService.findDeleted() returned an invalid row.");
  }

  return response.data;
}

function testReturnFindDeletedEmpty() {
  const rows = assertDeletedReturnRows(ReturnService().findDeleted());

  if (rows.length > 0) {
    Logger.log("SKIPPED: deleted Return rows already exist; empty result cannot be isolated safely.");
    return;
  }

  if (rows.length !== 0) {
    throw new Error("ReturnService.findDeleted() must return an empty array when no deleted rows exist.");
  }
}

function testReturnFindDeletedOnlyDeleted() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture);
  let removed = false;

  try {
    const response = ReturnService().remove(row.ID);
    if (!response.success) throw new Error("Return fixture could not be deleted.");
    removed = true;

    const deleted = assertDeletedReturnRows(ReturnService().findDeleted());
    if (!deleted.some((item) => item.ID === row.ID)) {
      throw new Error("Deleted Return was not discoverable.");
    }
  } finally {
    if (!removed) cleanupReturnTestRow(row);
  }
}

function testReturnFindDeletedExcludesActive() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture);

  try {
    const deleted = assertDeletedReturnRows(ReturnService().findDeleted());
    if (deleted.some((item) => item.ID === row.ID)) {
      throw new Error("Active Return was included in deleted results.");
    }
  } finally {
    cleanupReturnTestRow(row);
  }
}

function testReturnFindDeletedStatusCompatibility() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture);
  const variants = [
    { Deleted: true, IsActive: false },
    { Deleted: "TRUE", IsActive: "FALSE" },
    { Deleted: 1, IsActive: 0 },
  ];

  try {
    variants.forEach((status) => {
      if (!RepositoryWriter.update(RETURN_SCHEMA, row.ID, status)) {
        throw new Error("Return status compatibility fixture could not be updated.");
      }

      const deleted = assertDeletedReturnRows(ReturnService().findDeleted());
      if (!deleted.some((item) => item.ID === row.ID)) {
        throw new Error("Deleted Return status compatibility failed.");
      }
    });
  } finally {
    RepositoryWriter.update(RETURN_SCHEMA, row.ID, {
      Deleted: false,
      IsActive: true,
    });
    cleanupReturnTestRow(row);
  }
}

function testReturnCreateMissingDocument() {
  if (ReturnService().create(null).success) throw new Error("Return create must reject a missing document.");
}

function testReturnCreateMissingPickupDetailId() {
  if (ReturnService().create({ Tanggal: "2026-07-17", Qty: 1 }).success) throw new Error("Return create must require PickupDetailID.");
}

function testReturnCreateMissingTanggal() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  if (ReturnService().create({ PickupDetailID: fixture.detail.ID, Qty: 1 }).success) throw new Error("Return create must require Tanggal.");
}

function testReturnCreateInvalidQty() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  if (ReturnService().create({ PickupDetailID: fixture.detail.ID, Tanggal: "2026-07-17", Qty: 0 }).success) throw new Error("Return create must reject invalid Qty.");
}

function testReturnCreateUnknownPickupDetail() {
  if (ReturnService().create({ PickupDetailID: "PD_UNKNOWN", Tanggal: "2026-07-17", Qty: 1 }).success) throw new Error("Return create must reject an unknown Pickup Detail.");
}

function testReturnUpdateMissingId() {
  if (ReturnService().update("", {}).success) throw new Error("Return update must require ID.");
}

function testReturnRemoveMissingId() {
  if (ReturnService().remove("").success) throw new Error("Return remove must require ID.");
}

function testReturnRestoreMissingId() {
  if (ReturnService().restore("").success) throw new Error("Return restore must require ID.");
}

function testReturnRestoreUnknownId() {
  if (ReturnService().restore("RT_TEST_UNKNOWN").success) {
    throw new Error("Return restore must reject an unknown ID.");
  }
}

function testReturnRestoreAlreadyActive() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture);

  try {
    if (ReturnService().restore(row.ID).success) {
      throw new Error("Return restore must reject an already active Return.");
    }
  } finally {
    cleanupReturnTestRow(row);
  }
}

function testReturnRestoreStatusCompatibility() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture);
  const variants = [
    { Deleted: true, IsActive: false },
    { Deleted: "TRUE", IsActive: "FALSE" },
    { Deleted: 1, IsActive: 0 },
  ];

  try {
    variants.forEach((status) => {
      if (!RepositoryWriter.update(RETURN_SCHEMA, row.ID, status)) {
        throw new Error("Return restore status fixture could not be updated.");
      }

      const response = ReturnService().restore(row.ID);
      if (!response.success) {
        throw new Error("Return restore status compatibility failed.");
      }
    });
  } finally {
    if (ReturnService().findById(row.ID).success) {
      cleanupReturnTestRow(row);
    }
  }
}

function assertReturnRestoreRejectsInactiveRelation(relation) {
  const transaction = createPickupUpdateTestTransaction(1);
  if (!transaction) return;
  const detail = transaction.details[0];
  const fixture = { detail, available: Number(detail[PICKUP_DETAIL_FIELDS.QTY]) };
  const row = createReturnTestRow(fixture);
  const schema = relation === "header" ? PICKUP_HEADER_SCHEMA : PICKUP_DETAIL_SCHEMA;
  const id = relation === "header"
    ? transaction.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]
    : detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY];
  let relationDeleted = false;

  try {
    if (!ReturnService().remove(row.ID).success) {
      throw new Error("Return fixture could not be deleted before restore validation.");
    }

    if (!RepositoryWriter.softDelete(schema, id)) {
      throw new Error(`Pickup ${relation} fixture could not be deactivated.`);
    }
    relationDeleted = true;

    if (ReturnService().restore(row.ID).success) {
      throw new Error(`Return restore must reject an inactive Pickup ${relation}.`);
    }
  } finally {
    if (relationDeleted && !RepositoryWriter.restore(schema, id)) {
      throw new Error(`Pickup ${relation} fixture could not be restored after validation.`);
    }

    if (ReturnService().findById(row.ID).success) {
      cleanupReturnTestRow(row);
    }
  }
}

function testReturnRestoreRejectsInactivePickupHeader() {
  assertReturnRestoreRejectsInactiveRelation("header");
}

function testReturnRestoreRejectsInactivePickupDetail() {
  assertReturnRestoreRejectsInactiveRelation("detail");
}

function testReturnCreateValid() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture);

  try {
    if (row[RETURN_SCHEMA.SYSTEM.IS_DELETED] !== false) throw new Error("Created Return must not be deleted.");
    if (row[RETURN_SCHEMA.SYSTEM.IS_ACTIVE] !== true) throw new Error("Created Return must be active.");
    if (!row[RETURN_SCHEMA.PRIMARY_KEY]) throw new Error("Created Return must have an ID.");
    if (row[RETURN_FIELDS.PICKUP_ID] !== fixture.detail[PICKUP_DETAIL_FIELDS.PICKUP_ID]) throw new Error("Created Return has an invalid PickupID.");
    if (row[RETURN_FIELDS.PICKUP_DETAIL_ID] !== fixture.detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY]) throw new Error("Created Return has an invalid PickupDetailID.");
    if (normalizeReturnTestDate(row[RETURN_FIELDS.DATE]) !== "2026-07-17") throw new Error("Created Return has an invalid Tanggal.");
    if (Number(row[RETURN_FIELDS.QTY]) !== 1) throw new Error("Created Return has an invalid Qty.");
  } finally {
    cleanupReturnTestRow(row);
  }
}

function testReturnCreateDerivesPickupId() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture);

  try {
    if (row[RETURN_FIELDS.PICKUP_ID] !== fixture.detail[PICKUP_DETAIL_FIELDS.PICKUP_ID]) throw new Error("Return did not derive PickupID.");
  } finally {
    cleanupReturnTestRow(row);
  }
}

function testReturnCreateRejectsOverQuantity() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const response = ReturnService().create({ PickupDetailID: fixture.detail.ID, Tanggal: "2026-07-17", Qty: fixture.available + 1 });
  if (response.success) throw new Error("Return create must reject over quantity.");
}

function testReturnCreateUsesCumulativeQuantity() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const first = createReturnTestRow(fixture, fixture.available);

  try {
    const response = ReturnService().create({ PickupDetailID: fixture.detail.ID, Tanggal: "2026-07-17", Qty: 1 });
    if (response.success) throw new Error("Return create must enforce cumulative quantity.");
  } finally {
    cleanupReturnTestRow(first);
  }
}

function testReturnUpdateValid() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture);

  try {
    const response = ReturnService().update(row.ID, { Tanggal: "2026-07-18", Qty: 1, Keterangan: "Updated" });
    if (!response.success) throw new Error("Return update should succeed.");
  } finally {
    cleanupReturnTestRow(row);
  }
}

function testReturnUpdatePreservesRelation() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture);

  try {
    const response = ReturnService().update(row.ID, { PickupID: "PH_CHANGED", PickupDetailID: "PD_CHANGED", Qty: 1 });
    if (!response.success || response.data.PickupID !== row.PickupID || response.data.PickupDetailID !== row.PickupDetailID) throw new Error("Return update changed immutable relations.");
  } finally {
    cleanupReturnTestRow(row);
  }
}

function testReturnUpdateExcludesCurrentQty() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture, fixture.available);

  try {
    const response = ReturnService().update(row.ID, { Qty: fixture.available });
    if (!response.success) throw new Error("Return update double-counted its own Qty.");
  } finally {
    cleanupReturnTestRow(row);
  }
}

function testReturnUpdateRejectsOverQuantity() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture);

  try {
    const response = ReturnService().update(row.ID, { Qty: fixture.available + 1 });
    if (response.success) throw new Error("Return update must reject over quantity.");
  } finally {
    cleanupReturnTestRow(row);
  }
}

function testReturnRemoveReleasesQuantity() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture, fixture.available);
  let replacement = null;
  let removed = false;

  try {
    const response = ReturnService().remove(row.ID);
    if (!response.success) throw new Error("Return remove should release quantity.");
    removed = true;
    replacement = createReturnTestRow(fixture, fixture.available);
  } finally {
    cleanupReturnTestRow(replacement);
    if (!removed) cleanupReturnTestRow(row);
  }
}

function testReturnRemoveSoftDeleteState() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture);
  let removed = false;

  try {
    const response = ReturnService().remove(row.ID);
    if (!response.success) throw new Error("Return remove should succeed.");
    removed = true;

    const stored = RepositoryBase.mapRows(
      RETURN_SCHEMA,
      RepositoryReader.raw(RETURN_SCHEMA),
    ).find((item) => item[RETURN_SCHEMA.PRIMARY_KEY] === row.ID);

    if (
      !stored ||
      stored[RETURN_SCHEMA.SYSTEM.IS_DELETED] !== true ||
      stored[RETURN_SCHEMA.SYSTEM.IS_ACTIVE] !== false ||
      ReturnService().findAll().data.some((item) => item.ID === row.ID)
    ) {
      throw new Error("Return remove did not produce the required soft-delete state.");
    }
  } finally {
    if (!removed) cleanupReturnTestRow(row);
  }
}

function testReturnRestoreValid() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture);

  try {
    ReturnService().remove(row.ID);
    const response = ReturnService().restore(row.ID);
    if (!response.success) throw new Error("Return restore should succeed.");
  } finally {
    cleanupReturnTestRow(row);
  }
}

function testReturnRestoreRejectsOverQuantity() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const deleted = createReturnTestRow(fixture, fixture.available);
  let active = null;
  let deletedRowRemoved = false;

  try {
    const removed = ReturnService().remove(deleted.ID);
    if (!removed.success) throw new Error("Return remove should succeed before restore validation.");
    deletedRowRemoved = true;
    active = createReturnTestRow(fixture, fixture.available);
    const response = ReturnService().restore(deleted.ID);
    if (response.success) throw new Error("Return restore must reject over quantity.");
  } finally {
    cleanupReturnTestRow(active);
    if (!deletedRowRemoved) cleanupReturnTestRow(deleted);
  }
}

function testReturnFindByIdResolvedData() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture);

  try {
    const response = ReturnService().findById(row.ID);
    if (!response.success || !response.data.return || !response.data.pickupHeader || !response.data.pickupDetail || typeof response.data.availableQty !== "number") throw new Error("Return findById response is invalid.");
  } finally {
    cleanupReturnTestRow(row);
  }
}
