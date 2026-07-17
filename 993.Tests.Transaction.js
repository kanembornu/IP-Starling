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

function purchasingAuditLog(level, message, data) {
  const suffix = data === undefined ? "" : ` ${JSON.stringify(data)}`;
  Logger.log(`${level}: ${message}${suffix}`);
}

function purchasingAuditBlank(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function purchasingAuditKey(value) {
  if (value instanceof Date) return value.toISOString();
  return purchasingAuditBlank(value) ? "" : String(value).trim();
}

function purchasingAuditStatus(value) {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string" && /^(true|false)$/i.test(value.trim())) {
    return "string-boolean";
  }
  if (typeof value === "number" && (value === 0 || value === 1)) {
    return "numeric-boolean";
  }
  return "other";
}

function purchasingAuditDeleted(value) {
  return value === true || value === 1 || String(value).trim().toLowerCase() === "true";
}

function purchasingAuditInactive(value) {
  return value === false || value === 0 || String(value).trim().toLowerCase() === "false";
}

function purchasingAuditIdPattern(value) {
  if (purchasingAuditBlank(value)) return "blank";
  const id = String(value).trim();
  const prefix = (id.match(/^[A-Za-z]+/) || [""])[0].toUpperCase();
  const suffix = id.slice(prefix.length);
  return `${prefix || "none"}-${/^\d+$/.test(suffix) ? "digits" : "mixed"}-len${id.length}`;
}

function purchasingAuditObjects(sheet) {
  const rowCount = sheet.getLastRow();
  const columnCount = sheet.getLastColumn();
  if (rowCount < 1 || columnCount < 1) {
    return { headers: [], rows: [], formulas: [] };
  }

  const range = sheet.getRange(1, 1, rowCount, columnCount);
  const values = range.getValues();
  const formulas = range.getFormulas();
  const headers = values[0].map((value) => String(value));
  const rows = [];
  values.slice(1).forEach((valuesRow, index) => {
    if (!valuesRow.some((value) => !purchasingAuditBlank(value))) return;
    const object = {};
    headers.forEach((header, column) => {
      if (header && !Object.prototype.hasOwnProperty.call(object, header)) {
        object[header] = valuesRow[column];
      }
    });
    rows.push({ number: index + 2, object, values: valuesRow, formulas: formulas[index + 1] });
  });

  return { headers, rows };
}

function purchasingAuditMaster(spreadsheet, schema) {
  const sheet = spreadsheet.getSheetByName(schema.TABLE);
  if (!sheet) return { available: false, rows: Object.create(null) };

  const data = purchasingAuditObjects(sheet);
  const rows = Object.create(null);
  data.rows.forEach((entry) => {
    const id = purchasingAuditKey(entry.object[schema.PRIMARY_KEY]);
    if (id) rows[id] = entry.object;
  });
  return { available: true, rows };
}

function purchasingAuditHeaders(headers, target) {
  const counts = Object.create(null);
  headers.forEach((header) => {
    if (header) counts[header] = (counts[header] || 0) + 1;
  });
  const missing = target.filter((header) => !counts[header]);
  const extra = headers.filter((header) => header && target.indexOf(header) === -1);
  const duplicated = Object.keys(counts).filter((header) => counts[header] > 1);
  const blank = headers.reduce((count, header) => count + (header === "" ? 1 : 0), 0);
  const reordered =
    missing.length === 0 &&
    extra.length === 0 &&
    duplicated.length === 0 &&
    blank === 0 &&
    JSON.stringify(headers) !== JSON.stringify(target);

  return {
    compatible: JSON.stringify(headers) === JSON.stringify(target),
    missing,
    extra,
    duplicated,
    reordered,
    blank,
  };
}

function purchasingAuditCandidate(sheet, masters, targetHeaders) {
  const data = purchasingAuditObjects(sheet);
  const header = purchasingAuditHeaders(data.headers, targetHeaders);
  const findings = {
    sheet: sheet.getName(),
    rowCount: data.rows.length,
    columnCount: sheet.getLastColumn(),
    headers: data.headers,
    header,
    blankIds: 0,
    duplicateIds: 0,
    invalidPrefix: 0,
    blankRequired: { Tanggal: 0, SupplierID: 0, ProductID: 0, Qty: 0, Harga: 0 },
    invalidQty: { nonnumeric: 0, nonfinite: 0, nonpositive: 0 },
    invalidHarga: { nonnumeric: 0, nonfinite: 0, negative: 0 },
    invalidTotal: { blank: 0, nonnumeric: 0, nonfinite: 0, negative: 0 },
    totalMismatches: 0,
    decimalToleranceUsed: false,
    totalFormulaCells: 0,
    totalMode: "value-only",
    statuses: {
      Deleted: { boolean: 0, "string-boolean": 0, "numeric-boolean": 0, other: 0 },
      IsActive: { boolean: 0, "string-boolean": 0, "numeric-boolean": 0, other: 0 },
    },
    supplier: { missing: 0, deleted: 0, inactive: 0, notSupplier: 0, observedTypes: {} },
    product: { missing: 0, deleted: 0, inactive: 0 },
    grouping: { sameMarkerGroups: 0, explicitHeaders: [], repeatedExplicitGroups: 0, noteSignals: 0, evidence: "NONE" },
    samples: [],
  };
  const ids = Object.create(null);
  const markerGroups = Object.create(null);
  const explicitHeaders = data.headers.filter((headerName) =>
    /^(invoice|invoice(no|number|id)|document|document(no|number|id)|purchase(no|number|id)|groupid)$/i.test(
      headerName.replace(/[\s_-]/g, ""),
    ),
  );
  const noteHeaders = data.headers.filter((headerName) => /^(notes?|keterangan|catatan)$/i.test(headerName));
  const explicitGroups = Object.create(null);
  findings.grouping.explicitHeaders = explicitHeaders;

  data.rows.forEach((entry) => {
    const row = entry.object;
    const id = purchasingAuditKey(row.ID);
    if (!id) findings.blankIds += 1;
    else {
      ids[id] = (ids[id] || 0) + 1;
      if (!/^PC/i.test(id)) findings.invalidPrefix += 1;
    }

    Object.keys(findings.blankRequired).forEach((field) => {
      if (purchasingAuditBlank(row[field])) findings.blankRequired[field] += 1;
    });

    const qty = Number(row.Qty);
    const harga = Number(row.Harga);
    const total = Number(row.Total);
    if (!purchasingAuditBlank(row.Qty) && Number.isNaN(qty)) findings.invalidQty.nonnumeric += 1;
    else if (!purchasingAuditBlank(row.Qty) && !Number.isFinite(qty)) findings.invalidQty.nonfinite += 1;
    else if (!purchasingAuditBlank(row.Qty) && qty <= 0) findings.invalidQty.nonpositive += 1;
    if (!purchasingAuditBlank(row.Harga) && Number.isNaN(harga)) findings.invalidHarga.nonnumeric += 1;
    else if (!purchasingAuditBlank(row.Harga) && !Number.isFinite(harga)) findings.invalidHarga.nonfinite += 1;
    else if (!purchasingAuditBlank(row.Harga) && harga < 0) findings.invalidHarga.negative += 1;
    if (purchasingAuditBlank(row.Total)) findings.invalidTotal.blank += 1;
    else if (Number.isNaN(total)) findings.invalidTotal.nonnumeric += 1;
    else if (!Number.isFinite(total)) findings.invalidTotal.nonfinite += 1;
    else if (total < 0) findings.invalidTotal.negative += 1;

    let totalMatches = false;
    if ([qty, harga, total].every(Number.isFinite)) {
      const expected = qty * harga;
      const decimals = !Number.isInteger(qty) || !Number.isInteger(harga) || !Number.isInteger(total);
      const tolerance = decimals ? 1e-9 * Math.max(1, Math.abs(expected), Math.abs(total)) : 0;
      findings.decimalToleranceUsed = findings.decimalToleranceUsed || decimals;
      totalMatches = Math.abs(total - expected) <= tolerance;
      if (!totalMatches) findings.totalMismatches += 1;
    }

    const totalColumn = data.headers.indexOf("Total");
    if (totalColumn !== -1 && entry.formulas?.[totalColumn]) findings.totalFormulaCells += 1;
    ["Deleted", "IsActive"].forEach((field) => {
      findings.statuses[field][purchasingAuditStatus(row[field])] += 1;
    });

    const supplierId = purchasingAuditKey(row.SupplierID);
    const supplier = supplierId && masters.partners.rows[supplierId];
    let supplierCategory = "ok";
    if (supplierId && !supplier) {
      findings.supplier.missing += 1;
      supplierCategory = "missing";
    } else if (supplier) {
      const type = purchasingAuditKey(supplier[PARTNER_FIELDS.TYPE]) || "(blank)";
      findings.supplier.observedTypes[type] = (findings.supplier.observedTypes[type] || 0) + 1;
      if (purchasingAuditDeleted(supplier[PARTNER_SCHEMA.SYSTEM.IS_DELETED])) {
        findings.supplier.deleted += 1;
        supplierCategory = "deleted";
      }
      if (purchasingAuditInactive(supplier[PARTNER_SCHEMA.SYSTEM.IS_ACTIVE])) {
        findings.supplier.inactive += 1;
        supplierCategory = supplierCategory === "ok" ? "inactive" : supplierCategory;
      }
      if (type.toLowerCase() !== "supplier") {
        findings.supplier.notSupplier += 1;
        supplierCategory = supplierCategory === "ok" ? "not-supplier" : supplierCategory;
      }
    }

    const productId = purchasingAuditKey(row.ProductID);
    const product = productId && masters.products.rows[productId];
    let productCategory = "ok";
    if (productId && !product) {
      findings.product.missing += 1;
      productCategory = "missing";
    } else if (product) {
      if (purchasingAuditDeleted(product[PRODUCT_SCHEMA.SYSTEM.IS_DELETED])) {
        findings.product.deleted += 1;
        productCategory = "deleted";
      }
      if (purchasingAuditInactive(product[PRODUCT_SCHEMA.SYSTEM.IS_ACTIVE])) {
        findings.product.inactive += 1;
        productCategory = productCategory === "ok" ? "inactive" : productCategory;
      }
    }

    const marker = [row.Tanggal, row.SupplierID, row.CreatedAt].map(purchasingAuditKey).join("|");
    if (marker !== "||") markerGroups[marker] = (markerGroups[marker] || 0) + 1;
    explicitHeaders.forEach((field) => {
      const value = purchasingAuditKey(row[field]);
      if (value) explicitGroups[`${field}|${value}`] = (explicitGroups[`${field}|${value}`] || 0) + 1;
    });
    noteHeaders.forEach((field) => {
      if (/\b(multi|multiple|several)\b.{0,30}\b(items?|products?|barang)\b/i.test(String(row[field] || ""))) {
        findings.grouping.noteSignals += 1;
      }
    });

    if (findings.samples.length < 3) {
      findings.samples.push({
        idPattern: purchasingAuditIdPattern(row.ID),
        types: { Tanggal: typeof row.Tanggal, Qty: typeof row.Qty, Harga: typeof row.Harga, Total: typeof row.Total },
        blank: Object.keys(findings.blankRequired).filter((field) => purchasingAuditBlank(row[field])),
        totalMatches,
        supplier: supplierCategory,
        product: productCategory,
      });
    }
  });

  findings.duplicateIds = Object.keys(ids).reduce((count, id) => count + (ids[id] > 1 ? ids[id] : 0), 0);
  findings.grouping.sameMarkerGroups = Object.keys(markerGroups).filter((key) => markerGroups[key] > 1).length;
  findings.grouping.repeatedExplicitGroups = Object.keys(explicitGroups).filter((key) => explicitGroups[key] > 1).length;
  if (findings.grouping.repeatedExplicitGroups > 0 || findings.grouping.noteSignals > 0) {
    findings.grouping.evidence = "STRONG";
  } else if (findings.grouping.sameMarkerGroups > 0 || explicitHeaders.length > 0) {
    findings.grouping.evidence = "WEAK";
  }
  if (findings.totalFormulaCells === findings.rowCount && findings.rowCount > 0) findings.totalMode = "formula-backed";
  else if (findings.totalFormulaCells > 0) findings.totalMode = "mixed";
  return findings;
}

function auditPurchasingData() {
  purchasingAuditLog("START", "Purchasing live-data audit (read-only)");
  try {
    const spreadsheet = Database.spreadsheet();
    const candidateNames = ["Purchases", "Purchasings"];
    const targetHeaders = [
      "ID", "Tanggal", "SupplierID", "ProductID", "Qty", "Harga", "Total",
      "Deleted", "IsActive", "CreatedAt", "CreatedBy", "UpdatedAt", "UpdatedBy",
    ];
    const sheets = candidateNames.map((name) => spreadsheet.getSheetByName(name));
    const found = sheets.filter(Boolean);
    const blocking = [];
    purchasingAuditLog("SECTION", "Sheet discovery");
    candidateNames.forEach((name, index) => {
      const sheet = sheets[index];
      purchasingAuditLog(sheet ? "PASS" : "WARN", `${name}: ${sheet ? "exists" : "missing"}`, sheet ? {
        rowCount: purchasingAuditObjects(sheet).rows.length, columnCount: sheet.getLastColumn(),
      } : undefined);
    });
    if (found.length === 2) blocking.push("Both Purchases and Purchasings exist; canonical sheet is ambiguous.");
    if (found.length === 0) blocking.push("Neither Purchases nor Purchasings exists.");
    if (found.length === 1 && found[0].getName() === "Purchasings") {
      blocking.push("Only Purchasings exists; sheet rename or source configuration requires a decision.");
    }

    purchasingAuditLog("SECTION", "Master relation sources");
    const masters = {
      partners: purchasingAuditMaster(spreadsheet, PARTNER_SCHEMA),
      products: purchasingAuditMaster(spreadsheet, PRODUCT_SCHEMA),
    };
    if (!masters.partners.available) blocking.push(`Partner sheet ${PARTNER_SCHEMA.TABLE} is missing.`);
    if (!masters.products.available) blocking.push(`Product sheet ${PRODUCT_SCHEMA.TABLE} is missing.`);
    purchasingAuditLog(masters.partners.available ? "PASS" : "FAIL", `Partner source ${PARTNER_SCHEMA.TABLE}`);
    purchasingAuditLog(masters.products.available ? "PASS" : "FAIL", `Product source ${PRODUCT_SCHEMA.TABLE}`);

    const audits = [];
    found.forEach((sheet) => {
      purchasingAuditLog("SECTION", `Candidate ${sheet.getName()}`);
      try {
        const audit = purchasingAuditCandidate(sheet, masters, targetHeaders);
        audits.push(audit);
        purchasingAuditLog(audit.header.compatible ? "PASS" : "FAIL", "Header contract", {
          exact: audit.headers, missing: audit.header.missing, extra: audit.header.extra,
          duplicated: audit.header.duplicated, reordered: audit.header.reordered, blank: audit.header.blank,
        });
        purchasingAuditLog("PASS", "Aggregate row audit", {
          rows: audit.rowCount, blankIds: audit.blankIds, duplicateIds: audit.duplicateIds,
          invalidPrefix: audit.invalidPrefix, blankRequired: audit.blankRequired,
          invalidQty: audit.invalidQty, invalidHarga: audit.invalidHarga, invalidTotal: audit.invalidTotal,
        });
        purchasingAuditLog(audit.totalMismatches || audit.totalFormulaCells ? "WARN" : "PASS", "Total behavior", {
          mismatches: audit.totalMismatches, formulaCells: audit.totalFormulaCells, mode: audit.totalMode,
          tolerance: audit.decimalToleranceUsed ? "relative 1e-9 for decimal values" : "exact integer comparison",
        });
        purchasingAuditLog("PASS", "Status variants", audit.statuses);
        purchasingAuditLog("PASS", "Relation integrity", {
          supplier: audit.supplier, product: audit.product,
          masterSourcesAvailable: { partners: masters.partners.available, products: masters.products.available },
        });
        purchasingAuditLog(audit.grouping.evidence === "NONE" ? "PASS" : "WARN", "Header-detail evidence", audit.grouping);
        purchasingAuditLog("PASS", "Safe anonymized row-shape samples", audit.samples);
        if (!audit.header.compatible) blocking.push(`${audit.sheet} headers do not match the source target contract.`);
        if (audit.totalFormulaCells > 0) blocking.push(`${audit.sheet} has formula-backed Total cells; Total authority requires a decision.`);
        if (audit.totalMismatches > 0) blocking.push(`${audit.sheet} has Total values that do not match Qty x Harga.`);
      } catch (error) {
        blocking.push(`${sheet.getName()} could not be fully audited: ${error.message}`);
        purchasingAuditLog("FAIL", `${sheet.getName()} candidate audit`, { error: error.message });
      }
    });

    const canonical = found.length === 1 ? (found[0].getName() === "Purchases" ? "Purchases" : "Purchases (source target; deployed sheet is Purchasings)") : "UNRESOLVED";
    const audit = audits.length === 1 ? audits[0] : null;
    const invalidData = audit && (
      audit.blankIds || audit.duplicateIds || audit.invalidPrefix ||
      Object.values(audit.blankRequired).some(Boolean) ||
      Object.values(audit.invalidQty).some(Boolean) || Object.values(audit.invalidHarga).some(Boolean) ||
      Object.values(audit.invalidTotal).some(Boolean) || audit.totalMismatches ||
      audit.supplier.missing || audit.supplier.notSupplier || audit.product.missing
    );
    const dataMigration = !audit
      ? "UNCERTAIN"
      : (!audit.header.compatible || invalidData ? "YES" : (audit.totalFormulaCells ? "UNCERTAIN" : "NO"));
    const renameRequired = found.length !== 1 ? "UNCERTAIN" : (found[0].getName() === "Purchases" ? "NO" : "YES");
    const relationIssues = audit ? {
      supplier: audit.supplier, product: audit.product,
    } : "UNCERTAIN";
    const safe = Boolean(
      audit && audit.sheet === "Purchases" && audit.header.compatible &&
      audit.totalFormulaCells === 0 && audit.totalMismatches === 0 && blocking.length === 0,
    );
    purchasingAuditLog("SECTION", "Final summary");
    purchasingAuditLog(safe ? "PASS" : "FAIL", "Purchasing audit conclusion", {
      candidateSheetFound: found.map((sheet) => sheet.getName()),
      canonicalSheetRecommendation: canonical,
      headerCompatibility: audit ? (audit.header.compatible ? "COMPATIBLE" : "INCOMPATIBLE") : "UNCERTAIN",
      dataMigrationRequired: dataMigration,
      sheetRenameRequired: renameRequired,
      totalFormulasPresent: audits.some((item) => item.totalFormulaCells > 0) ? "YES" : "NO",
      totalMismatchesCount: audits.reduce((sum, item) => sum + item.totalMismatches, 0),
      relationIssuesSummary: relationIssues,
      headerDetailEvidence: audit ? audit.grouping.evidence : "UNCERTAIN",
      safeToBeginBackendHardening: safe ? "YES" : "NO",
      blockingIssues: blocking,
    });
    purchasingAuditLog("COMPLETE", "Purchasing live-data audit");
    return { success: safe, audits, blockingIssues: blocking };
  } catch (error) {
    purchasingAuditLog("FAIL", "Unexpected Purchasing audit error", { error: error.message });
    purchasingAuditLog("COMPLETE", "Purchasing live-data audit with unexpected error");
    throw error;
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

function purchasingAssertFailure(response, message) {
  if (!response || response.success) throw new Error(message);
}

/**
 * MANUAL ONLY: creates one active Purchasing row for list/detail browser checks.
 * Run cleanupManualPurchasingFixture() after validation.
 */
function createManualPurchasingFixture() {
  const propertyKey = "MANUAL_PURCHASING_FIXTURE_ID";
  const properties = PropertiesService.getUserProperties();
  const existingId = properties.getProperty(propertyKey);

  if (existingId) {
    const existing = PurchasingService().findById(existingId);

    if (existing.success) {
      throw new Error(
        `Manual Purchasing fixture ${existingId} is still active. Run cleanupManualPurchasingFixture() first.`,
      );
    }

    properties.deleteProperty(propertyKey);
  }

  const partners = PartnerService().findAll();

  if (!partners.success || !Array.isArray(partners.data)) {
    throw new Error("Unable to read active Partners for the manual fixture.");
  }

  const supplier = partners.data.find((partner) => {
    return (
      manualPurchasingStatusFalse(partner[PARTNER_SCHEMA.SYSTEM.IS_DELETED]) &&
      manualPurchasingStatusTrue(partner[PARTNER_SCHEMA.SYSTEM.IS_ACTIVE]) &&
      String(partner[PARTNER_FIELDS.TYPE] || "").trim().toLowerCase() ===
        "supplier"
    );
  });

  if (!supplier) {
    throw new Error(
      "Manual Purchasing fixture requires one active, non-deleted Supplier Partner.",
    );
  }

  const products = ProductService().findAll();

  if (!products.success || !Array.isArray(products.data)) {
    throw new Error("Unable to read active Products for the manual fixture.");
  }

  const product = products.data.find((item) => {
    return (
      manualPurchasingStatusFalse(item[PRODUCT_SCHEMA.SYSTEM.IS_DELETED]) &&
      manualPurchasingStatusTrue(item[PRODUCT_SCHEMA.SYSTEM.IS_ACTIVE])
    );
  });

  if (!product) {
    throw new Error(
      "Manual Purchasing fixture requires one active, non-deleted Product.",
    );
  }

  const response = PurchasingService().create({
    [PURCHASING_FIELDS.DATE]: Utilities.formatDate(
      new Date(),
      APP_CONFIG.TIMEZONE,
      "yyyy-MM-dd",
    ),
    [PURCHASING_FIELDS.SUPPLIER_ID]:
      supplier[PARTNER_SCHEMA.PRIMARY_KEY],
    [PURCHASING_FIELDS.PRODUCT_ID]: product[PRODUCT_SCHEMA.PRIMARY_KEY],
    [PURCHASING_FIELDS.QTY]: 2,
    [PURCHASING_FIELDS.PRICE]: 10000,
  });

  if (!response.success || !response.data?.[PURCHASING_SCHEMA.PRIMARY_KEY]) {
    throw new Error(
      `Unable to create manual Purchasing fixture: ${response.message || "unknown error"}`,
    );
  }

  const id = response.data[PURCHASING_SCHEMA.PRIMARY_KEY];

  try {
    properties.setProperty(propertyKey, id);
  } catch (error) {
    PurchasingService().remove(id);
    throw new Error(
      `Manual Purchasing fixture ${id} was rolled back because its cleanup ID could not be stored.`,
    );
  }

  Logger.log(`MANUAL PURCHASING FIXTURE ID: ${id}`);

  return response;
}

/**
 * MANUAL ONLY: soft-deletes only the ID stored by the paired create helper.
 */
function cleanupManualPurchasingFixture() {
  const propertyKey = "MANUAL_PURCHASING_FIXTURE_ID";
  const properties = PropertiesService.getUserProperties();
  const id = properties.getProperty(propertyKey);

  if (!id) {
    const result = {
      success: true,
      message: "No manual Purchasing fixture is registered for cleanup.",
      data: null,
    };

    Logger.log(result.message);

    return result;
  }

  const active = PurchasingService().findById(id);

  if (!active.success) {
    properties.deleteProperty(propertyKey);

    const result = {
      success: true,
      message: `Manual Purchasing fixture ${id} is already absent or inactive; no cleanup was needed.`,
      data: { ID: id },
    };

    Logger.log(result.message);

    return result;
  }

  const response = PurchasingService().remove(id);

  if (!response.success) {
    throw new Error(
      `Unable to clean up manual Purchasing fixture ${id}: ${response.message || "unknown error"}`,
    );
  }

  properties.deleteProperty(propertyKey);
  Logger.log(`CLEANUP: Manual Purchasing fixture ${id} is soft-deleted.`);

  return response;
}

function manualPurchasingStatusTrue(value) {
  return (
    value === true ||
    value === 1 ||
    String(value).trim().toLowerCase() === "true"
  );
}

function manualPurchasingStatusFalse(value) {
  return (
    value === false ||
    value === 0 ||
    String(value).trim().toLowerCase() === "false"
  );
}

function purchasingTestMasterData(partnerType) {
  const suffix = `${new Date().getTime()}_${Math.floor(Math.random() * 100000)}`;
  const partnerResponse = PartnerService().create({
    Nama: `Purchasing Test ${suffix}`,
    Alamat: "Test",
    Telepon: suffix,
    Jenis: partnerType || "Supplier",
  });
  if (!partnerResponse.success) throw new Error("Could not create controlled Partner fixture.");

  const productResponse = ProductService().create({
    Nama: `Purchasing Test ${suffix}`,
    Kategori: "Test",
    Satuan: "Unit",
    Harga: 10,
  });
  if (!productResponse.success) {
    PartnerService().remove(partnerResponse.data.ID);
    throw new Error("Could not create controlled Product fixture.");
  }

  return { partner: partnerResponse.data, product: productResponse.data };
}

function purchasingCleanupMasterData(fixture) {
  if (!fixture) return;
  const partner = RepositoryReader.findById(PARTNER_SCHEMA, fixture.partner.ID);
  const product = RepositoryReader.findById(PRODUCT_SCHEMA, fixture.product.ID);
  if (partner) PartnerService().remove(fixture.partner.ID);
  if (product) ProductService().remove(fixture.product.ID);
}

function purchasingDocument(fixture, changes) {
  return Object.assign({
    Tanggal: "2026-07-17",
    SupplierID: fixture.partner.ID,
    ProductID: fixture.product.ID,
    Qty: 2,
    Harga: 10,
  }, changes || {});
}

function purchasingWithFixture(test, partnerType) {
  const fixture = purchasingTestMasterData(partnerType);
  let purchase = null;
  try {
    test(fixture, (row) => { purchase = row; });
  } finally {
    if (purchase && PurchasingService().findById(purchase.ID).success) {
      PurchasingService().remove(purchase.ID);
    }
    if (purchase) {
      Logger.log(`CLEANUP: Purchasing fixture ${purchase.ID} is soft-deleted.`);
    }
    purchasingCleanupMasterData(fixture);
  }
}

function purchasingCreateFixture(fixture, changes) {
  const response = PurchasingService().create(purchasingDocument(fixture, changes));
  if (!response.success) throw new Error(`Could not create Purchasing fixture: ${response.message}`);
  return response.data;
}

function testPurchasingServicePublicApi() {
  const actual = Object.keys(PurchasingService()).sort();
  const expected = ["create", "findAll", "findById", "findDeleted", "remove", "restore", "statistics", "update"];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("PurchasingService public API is invalid.");
}

function purchasingAssertDeletedResponse(response, context) {
  if (!response?.success || !Array.isArray(response.data)) {
    throw new Error(`${context} must return a successful array response.`);
  }
  if (response.data.some((row) => !purchasingAuditDeleted(row.Deleted) || manualPurchasingStatusTrue(row.IsActive))) {
    throw new Error(`${context} returned an active or nondeleted row.`);
  }
  return response.data;
}

function testPurchasingFindDeletedEmpty() {
  const rows = purchasingAssertDeletedResponse(PurchasingService().findDeleted(), "PurchasingService.findDeleted()");
  if (rows.length) Logger.log("SKIPPED: Empty Purchasing Trash assertion requires no existing deleted rows.");
}

function testPurchasingFindDeletedFiltering() {
  purchasingWithFixture((fixture, remember) => {
    const row = purchasingCreateFixture(fixture); remember(row);
    const activeRows = purchasingAssertDeletedResponse(PurchasingService().findDeleted(), "PurchasingService.findDeleted()");
    if (activeRows.some((item) => item.ID === row.ID)) throw new Error("Active Purchasing fixture appeared in Trash.");
    if (!PurchasingService().remove(row.ID).success) throw new Error("Could not soft-delete Purchasing fixture.");
    const deletedRows = purchasingAssertDeletedResponse(PurchasingService().findDeleted(), "PurchasingService.findDeleted()");
    if (!deletedRows.some((item) => item.ID === row.ID)) throw new Error("Deleted Purchasing fixture did not appear in Trash.");
  });
}

function testPurchasingFindDeletedResponseShape() {
  const response = PurchasingService().findDeleted();
  purchasingAssertControllerResponse(response, "PurchasingService.findDeleted()");
  purchasingAssertDeletedResponse(response, "PurchasingService.findDeleted()");
}

function testPurchasingStatisticsEmpty() {
  const rows = PurchasingService().findAll();
  if (!rows.success) throw new Error("Purchasing findAll failed during empty statistics test.");

  if (rows.data.length !== 0) {
    Logger.log("SKIPPED: Purchasing statistics empty assertion requires no active Purchasing rows.");
    return;
  }

  const response = PurchasingService().statistics();
  if (!response.success || response.data.total !== 0 || response.data.active !== 0 || response.data.inactive !== 0) {
    throw new Error("Empty Purchasing statistics are invalid.");
  }
}

function testPurchasingStatisticsResponseShape() {
  const response = PurchasingService().statistics();
  const data = response && response.data;

  if (
    !response ||
    response.success !== true ||
    !data ||
    typeof data.total !== "number" ||
    typeof data.active !== "number" ||
    typeof data.inactive !== "number" ||
    data.total !== data.active ||
    data.inactive !== 0
  ) {
    throw new Error("Purchasing statistics response shape is invalid.");
  }
}

function testDashboardPurchasingStatisticsCompatibility() {
  const service = PurchasingService();
  if (typeof service.statistics !== "function") {
    throw new Error("Dashboard Purchasing statistics compatibility is missing.");
  }

  const response = service.statistics();
  if (!response || response.success !== true || !response.data) {
    throw new Error("Dashboard Purchasing statistics compatibility response is invalid.");
  }
}

function testPurchasingStatisticsActiveOnly() {
  const fixture = purchasingTestMasterData("Supplier");
  let row = null;

  try {
    const baseline = PurchasingService().statistics();
    if (!baseline.success) throw new Error("Could not read Purchasing statistics baseline.");

    row = purchasingCreateFixture(fixture);

    const active = PurchasingService().statistics();
    if (!active.success || active.data.total !== baseline.data.total + 1 || active.data.active !== active.data.total || active.data.inactive !== 0) {
      throw new Error("Active Purchasing fixture was not counted correctly.");
    }

    if (!RepositoryWriter.update(PURCHASING_SCHEMA, row.ID, {
      [PURCHASING_SCHEMA.SYSTEM.IS_ACTIVE]: false,
    })) {
      throw new Error("Could not make controlled Purchasing fixture inactive.");
    }

    const inactive = PurchasingService().statistics();
    if (!inactive.success || inactive.data.total !== baseline.data.total || inactive.data.active !== baseline.data.active || inactive.data.inactive !== 0) {
      throw new Error("Inactive Purchasing fixture was included in statistics.");
    }

    RepositoryWriter.update(PURCHASING_SCHEMA, row.ID, {
      [PURCHASING_SCHEMA.SYSTEM.IS_ACTIVE]: true,
    });

    if (!PurchasingService().remove(row.ID).success) {
      throw new Error("Could not delete controlled Purchasing fixture.");
    }

    const deleted = PurchasingService().statistics();
    if (!deleted.success || deleted.data.total !== baseline.data.total || deleted.data.active !== baseline.data.active || deleted.data.inactive !== 0) {
      throw new Error("Deleted Purchasing fixture was included in statistics.");
    }
  } finally {
    if (row) {
      const stored = RepositoryBase.mapRows(
        PURCHASING_SCHEMA,
        RepositoryReader.raw(PURCHASING_SCHEMA),
      ).find((item) => item.ID === row.ID);

      if (stored && stored.Deleted !== true) {
        RepositoryWriter.update(PURCHASING_SCHEMA, row.ID, {
          [PURCHASING_SCHEMA.SYSTEM.IS_DELETED]: false,
          [PURCHASING_SCHEMA.SYSTEM.IS_ACTIVE]: true,
        });
        PurchasingService().remove(row.ID);
      }

      Logger.log(`CLEANUP: Purchasing statistics fixture ${row.ID} is soft-deleted.`);
    }

    purchasingCleanupMasterData(fixture);
  }
}

function purchasingAssertControllerResponse(response, context) {
  if (
    !response ||
    typeof response !== "object" ||
    Array.isArray(response) ||
    typeof response.success !== "boolean" ||
    typeof response.message !== "string" ||
    !Object.prototype.hasOwnProperty.call(response, "data") ||
    !Array.isArray(response.errors) ||
    !response.meta ||
    typeof response.meta !== "object"
  ) {
    throw new Error(`${context} must return a Response-compatible object.`);
  }
}

function testPurchasingControllerPublicApi() {
  const functions = [
    getPurchasing,
    getDeletedPurchasing,
    getPurchasingById,
    createPurchasing,
    updatePurchasing,
    deletePurchasing,
    restorePurchasing,
  ];

  if (functions.some((fn) => typeof fn !== "function")) {
    throw new Error("Purchasing Controller public API is invalid.");
  }
}

function testPurchasingDeletedControllerPublicApi() {
  if (typeof getDeletedPurchasing !== "function") {
    throw new Error("getDeletedPurchasing Controller global is missing.");
  }
  const response = getDeletedPurchasing();
  purchasingAssertControllerResponse(response, "getDeletedPurchasing()");
  purchasingAssertDeletedResponse(response, "getDeletedPurchasing()");
}

function testPurchasingDeletedControllerSerialization() {
  const response = getDeletedPurchasing();
  if (typeof response === "string") throw new Error("getDeletedPurchasing() must return a plain object.");
  JSON.stringify(response);
  const values = [response];
  while (values.length) {
    const value = values.pop();
    if (value instanceof Date || typeof value === "function") throw new Error("Deleted Purchasing response contains an unsafe value.");
    if (value && typeof value === "object") Object.keys(value).forEach((key) => values.push(value[key]));
  }
}

function testPurchasingControllerGetAll() {
  const response = getPurchasing();
  purchasingAssertControllerResponse(response, "getPurchasing()");
  if (!response.success || !Array.isArray(response.data)) {
    throw new Error("getPurchasing() response is invalid.");
  }
  JSON.stringify(response);
}

function testPurchasingControllerGetByIdValidation() {
  const response = getPurchasingById("");
  purchasingAssertControllerResponse(response, 'getPurchasingById("")');
  if (response.success || response.data !== null) {
    throw new Error('getPurchasingById("") must return a validation failure.');
  }
}

function testPurchasingControllerCreateValidation() {
  const count = RepositoryReader.count(PURCHASING_SCHEMA);
  const response = createPurchasing(null);
  purchasingAssertControllerResponse(response, "createPurchasing(null)");
  if (response.success || response.data !== null) {
    throw new Error("createPurchasing(null) must return a validation failure.");
  }
  if (RepositoryReader.count(PURCHASING_SCHEMA) !== count) {
    throw new Error("createPurchasing(null) must not write data.");
  }
}

function testPurchasingControllerUpdateValidation() {
  const count = RepositoryReader.count(PURCHASING_SCHEMA);
  const response = updatePurchasing("", null);
  purchasingAssertControllerResponse(response, 'updatePurchasing("", null)');
  if (response.success || response.data !== null) {
    throw new Error('updatePurchasing("", null) must return a validation failure.');
  }
  if (RepositoryReader.count(PURCHASING_SCHEMA) !== count) {
    throw new Error("Invalid Purchasing update must not write data.");
  }
}

function testPurchasingControllerDeleteValidation() {
  const count = RepositoryReader.count(PURCHASING_SCHEMA);
  const response = deletePurchasing("");
  purchasingAssertControllerResponse(response, 'deletePurchasing("")');
  if (response.success || response.data !== null) {
    throw new Error('deletePurchasing("") must return a validation failure.');
  }
  if (RepositoryReader.count(PURCHASING_SCHEMA) !== count) {
    throw new Error("Invalid Purchasing deletion must not change data.");
  }
}

function testPurchasingControllerRestoreValidation() {
  const count = RepositoryReader.count(PURCHASING_SCHEMA);
  const response = restorePurchasing("");
  purchasingAssertControllerResponse(response, 'restorePurchasing("")');
  if (response.success || response.data !== null) {
    throw new Error('restorePurchasing("") must return a validation failure.');
  }
  if (RepositoryReader.count(PURCHASING_SCHEMA) !== count) {
    throw new Error("Invalid Purchasing restoration must not change data.");
  }
}

function testPurchasingControllerSerialization() {
  const response = getPurchasing();
  const values = [response];

  if (typeof response === "string") {
    throw new Error("Purchasing Controller response must not be a JSON string.");
  }

  while (values.length > 0) {
    const value = values.pop();
    if (value instanceof Date || typeof value === "function") {
      throw new Error("Purchasing Controller response contains an unsafe value.");
    }
    if (!value || typeof value !== "object") continue;
    Object.keys(value).forEach((key) => values.push(value[key]));
  }

  try {
    JSON.stringify(response);
  } catch (error) {
    throw new Error("Purchasing Controller response must be JSON serializable.");
  }

  if (response.meta && response.meta.timestamp instanceof Date) {
    throw new Error("Purchasing Controller meta timestamp must be serializable.");
  }
}

function testPurchasingFindAllActiveOnly() {
  const response = PurchasingService().findAll();
  if (!response.success || !Array.isArray(response.data)) throw new Error("Purchasing findAll response is invalid.");
  response.data.forEach((row) => {
    if (!(row.Deleted === false || row.Deleted === 0 || String(row.Deleted).toUpperCase() === "FALSE") ||
        !(row.IsActive === true || row.IsActive === 1 || String(row.IsActive).toUpperCase() === "TRUE")) {
      throw new Error("Purchasing findAll returned a deleted or inactive row.");
    }
  });
}

function testPurchasingFindByIdValidation() {
  purchasingAssertFailure(PurchasingService().findById(" "), "Purchasing findById must require ID.");
}

function purchasingAssertCreateFailure(changes, message, partnerType) {
  purchasingWithFixture((fixture) => {
    purchasingAssertFailure(PurchasingService().create(purchasingDocument(fixture, changes)), message);
  }, partnerType);
}

function testPurchasingCreateRequiresTanggal() { purchasingAssertCreateFailure({ Tanggal: "" }, "Tanggal must be required."); }
function testPurchasingCreateRequiresSupplier() { purchasingAssertCreateFailure({ SupplierID: "" }, "Supplier must be required."); }
function testPurchasingCreateRequiresProduct() { purchasingAssertCreateFailure({ ProductID: "" }, "Product must be required."); }
function testPurchasingCreateRejectsQtyZero() { purchasingAssertCreateFailure({ Qty: 0 }, "Qty zero must be rejected."); }
function testPurchasingCreateRejectsQtyNegative() { purchasingAssertCreateFailure({ Qty: -1 }, "Negative Qty must be rejected."); }
function testPurchasingCreateRejectsQtyInfinity() { purchasingAssertCreateFailure({ Qty: Infinity }, "Infinite Qty must be rejected."); }
function testPurchasingCreateRejectsHargaNegative() { purchasingAssertCreateFailure({ Harga: -1 }, "Negative Harga must be rejected."); }
function testPurchasingCreateRejectsHargaInfinity() { purchasingAssertCreateFailure({ Harga: Infinity }, "Infinite Harga must be rejected."); }
function testPurchasingCreateRejectsNonSupplierPartner() { purchasingAssertCreateFailure({}, "Non-Supplier must be rejected.", "Customer"); }

function testPurchasingCreateRejectsInactiveSupplier() {
  purchasingWithFixture((fixture) => {
    PartnerService().remove(fixture.partner.ID);
    purchasingAssertFailure(PurchasingService().create(purchasingDocument(fixture)), "Inactive Supplier must be rejected.");
  });
}

function testPurchasingCreateRejectsInactiveProduct() {
  purchasingWithFixture((fixture) => {
    ProductService().remove(fixture.product.ID);
    purchasingAssertFailure(PurchasingService().create(purchasingDocument(fixture)), "Inactive Product must be rejected.");
  });
}

function purchasingAssertCreate(changes, assertion) {
  purchasingWithFixture((fixture, remember) => {
    const row = purchasingCreateFixture(fixture, changes);
    remember(row);
    assertion(row);
  });
}

function testPurchasingCreateValid() { purchasingAssertCreate({}, (row) => { if (!row.ID) throw new Error("Purchasing create did not return an ID."); }); }
function testPurchasingCreateDerivesTotal() { purchasingAssertCreate({ Qty: 3, Harga: 7 }, (row) => { if (row.Total !== 21) throw new Error("Total was not derived."); }); }
function testPurchasingCreateIgnoresSuppliedTotal() { purchasingAssertCreate({ Qty: 3, Harga: 7, Total: 999 }, (row) => { if (row.Total !== 21) throw new Error("Caller Total was trusted."); }); }
function testPurchasingCreateAllowsDecimalQty() { purchasingAssertCreate({ Qty: 1.5, Harga: 8 }, (row) => { if (row.Qty !== 1.5 || row.Total !== 12) throw new Error("Decimal Qty failed."); }); }

function purchasingAssertUpdate(changes, assertion) {
  purchasingWithFixture((fixture, remember) => {
    const row = purchasingCreateFixture(fixture);
    remember(row);
    const response = PurchasingService().update(row.ID, changes);
    if (!response.success) throw new Error(`Purchasing update failed: ${response.message}`);
    assertion(response.data, fixture, row);
  });
}

function testPurchasingUpdateValid() {
  purchasingAssertUpdate(
    { Tanggal: "2026-07-18" },
    (row, fixture, original) => {
      const actual = row[PURCHASING_FIELDS.DATE];
      const normalized = normalizeReturnTestDate(actual);

      if (normalized !== "2026-07-18") {
        throw new Error(
          `Purchasing Tanggal assertion failed: actual=${String(actual)}, typeof=${typeof actual}, isDate=${actual instanceof Date}, normalized=${normalized}.`,
        );
      }

      if (
        row[PURCHASING_SCHEMA.PRIMARY_KEY] !== original[PURCHASING_SCHEMA.PRIMARY_KEY] ||
        row[PURCHASING_FIELDS.SUPPLIER_ID] !== fixture.partner.ID ||
        row[PURCHASING_FIELDS.PRODUCT_ID] !== fixture.product.ID ||
        Number(row[PURCHASING_FIELDS.QTY]) !== 2 ||
        Number(row[PURCHASING_FIELDS.PRICE]) !== 10 ||
        Number(row[PURCHASING_FIELDS.TOTAL]) !== 20 ||
        row[PURCHASING_SCHEMA.SYSTEM.IS_DELETED] !== false ||
        row[PURCHASING_SCHEMA.SYSTEM.IS_ACTIVE] !== true
      ) {
        throw new Error("Purchasing update did not preserve fixture fields or active state.");
      }
    },
  );
}
function testPurchasingUpdateRecalculatesTotal() { purchasingAssertUpdate({ Qty: 4, Harga: 6 }, (row) => { if (row.Total !== 24) throw new Error("Update did not recalculate Total."); }); }
function testPurchasingUpdateTotalOnlyDoesNotOverride() { purchasingAssertUpdate({ Total: 999 }, (row) => { if (row.Total !== 20) throw new Error("Total-only update overrode derived Total."); }); }
function testPurchasingUpdateRejectsInfinity() {
  purchasingWithFixture((fixture, remember) => {
    const row = purchasingCreateFixture(fixture); remember(row);
    purchasingAssertFailure(PurchasingService().update(row.ID, { Harga: Infinity }), "Update must reject Infinity.");
  });
}

function purchasingAssertUpdateRelation(field, relation) {
  purchasingWithFixture((fixture, remember) => {
    const row = purchasingCreateFixture(fixture); remember(row);
    if (relation === "supplier") PartnerService().remove(fixture.partner.ID);
    else ProductService().remove(fixture.product.ID);
    purchasingAssertFailure(PurchasingService().update(row.ID, { [field]: field === "SupplierID" ? fixture.partner.ID : fixture.product.ID }), "Update must revalidate relations.");
  });
}

function testPurchasingUpdateRevalidatesSupplier() { purchasingAssertUpdateRelation("SupplierID", "supplier"); }
function testPurchasingUpdateRevalidatesProduct() { purchasingAssertUpdateRelation("ProductID", "product"); }

function testPurchasingRemoveSoftDeleteState() {
  purchasingWithFixture((fixture) => {
    const row = purchasingCreateFixture(fixture);
    if (!PurchasingService().remove(row.ID).success) throw new Error("Purchasing remove failed.");
    const stored = RepositoryBase.mapRows(PURCHASING_SCHEMA, RepositoryReader.raw(PURCHASING_SCHEMA)).find((item) => item.ID === row.ID);
    if (!stored || stored.Deleted !== true || stored.IsActive !== false || PurchasingService().findAll().data.some((item) => item.ID === row.ID)) {
      throw new Error("Purchasing remove did not persist soft-delete state.");
    }
    Logger.log(`CLEANUP: Purchasing fixture ${row.ID} is soft-deleted.`);
  });
}

function purchasingAssertRestore(setup, assertion, partnerType) {
  purchasingWithFixture((fixture, remember) => {
    const row = purchasingCreateFixture(fixture); remember(row);
    if (!PurchasingService().remove(row.ID).success) throw new Error("Could not delete Purchasing fixture.");
    setup(fixture, row);
    const response = PurchasingService().restore(row.ID);
    assertion(response, fixture, row);
  }, partnerType);
}

function testPurchasingRestoreValid() { purchasingAssertRestore(() => {}, (response) => { if (!response.success) throw new Error("Purchasing restore failed."); }); }
function testPurchasingRestoreAlreadyActive() {
  purchasingWithFixture((fixture, remember) => {
    const row = purchasingCreateFixture(fixture); remember(row);
    purchasingAssertFailure(PurchasingService().restore(row.ID), "Restore must reject active rows.");
  });
}
function testPurchasingRestoreRejectsInactiveNonDeleted() {
  purchasingWithFixture((fixture, remember) => {
    const row = purchasingCreateFixture(fixture); remember(row);

    if (!RepositoryWriter.update(PURCHASING_SCHEMA, row.ID, {
      [PURCHASING_SCHEMA.SYSTEM.IS_ACTIVE]: false,
    })) {
      throw new Error("Could not make controlled Purchasing fixture inactive.");
    }

    try {
      purchasingAssertFailure(
        PurchasingService().restore(row.ID),
        "Restore must reject inactive non-deleted rows.",
      );
    } finally {
      RepositoryWriter.update(PURCHASING_SCHEMA, row.ID, {
        [PURCHASING_SCHEMA.SYSTEM.IS_ACTIVE]: true,
      });
    }
  });
}
function testPurchasingRestoreRejectsInactiveSupplier() { purchasingAssertRestore((fixture) => PartnerService().remove(fixture.partner.ID), (response) => purchasingAssertFailure(response, "Restore must reject inactive Supplier.")); }
function testPurchasingRestoreRejectsNonSupplierPartner() {
  purchasingAssertRestore(
    (fixture) => RepositoryWriter.update(PARTNER_SCHEMA, fixture.partner.ID, { Jenis: "Customer" }),
    (response) => purchasingAssertFailure(response, "Restore must reject non-Supplier."),
  );
}
function testPurchasingRestoreRejectsInactiveProduct() { purchasingAssertRestore((fixture) => ProductService().remove(fixture.product.ID), (response) => purchasingAssertFailure(response, "Restore must reject inactive Product.")); }
function testPurchasingRestoreRecalculatesTotal() {
  purchasingAssertRestore((fixture, row) => RepositoryWriter.update(PURCHASING_SCHEMA, row.ID, { Total: 999 }), (response) => {
    if (!response.success || response.data.Total !== 20) throw new Error("Restore did not recalculate Total.");
  });
}
