function testPickupServicePublicApi() {
  const keys = Object.keys(PickupService()).sort();

  const expectedKeys = [
    "create",
    "createInternal",
    "evaluateRestoreEligibility",
    "findAll",
    "findAllDetails",
    "findById",
    "listDeleted",
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
    getDeletedPickups,
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
  const startedAt = Date.now();
  const aggregateElapsedBeforeMs = typeof activeAggregateStartedAt === "number"
    ? startedAt - activeAggregateStartedAt
    : null;
  const response = getDeletedReturns();
  const durationMs = Date.now() - startedAt;

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
    throw new Error(
      "getDeletedReturns() returned a nondeleted or active Return.",
    );
  }

  Logger.log(JSON.stringify({
    test: "testReturnControllerGetDeletedReturns",
    durationMs,
    aggregateElapsedBeforeMs,
    deletedRowCount: response.data.length,
  }));
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

  const response = PickupService().createInternal(document);

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

function testPickupCreateInvalidTanggal() {
  [
    "arbitrary",
    "2026-02-30",
    "2026-02-30T00:00:00.000Z",
    "2026-07-20T25:00:00.000Z",
    new Date("invalid"),
    1,
    true,
    {},
    [],
    " ",
  ].forEach((value) => {
    assertPickupCreateFailure({
      header: {
        [PICKUP_HEADER_FIELDS.DATE]: value,
        [PICKUP_HEADER_FIELDS.PARTNER_ID]: "PARTNER_TEST",
      },
      details: [{}],
    });
  });
}

function pickupCalendarDate(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, APP_CONFIG.TIMEZONE, "yyyy-MM-dd");
  }

  return typeof value === "string" ? value : "";
}

function testPickupDateNormalization() {
  const partner = findActivePickupTestPartner();
  const products = findActivePickupTestProducts(1);

  if (!partner || !products) {
    return;
  }

  [
    { input: new Date(2026, 6, 20), expected: "2026-07-20", label: "native Date" },
    { input: "2026-07-20", expected: "2026-07-20", label: "date-only" },
    {
      input: "2026-07-19T17:00:00.000Z",
      expected: "2026-07-20",
      label: "ISO one-day regression",
    },
  ].forEach((sample) => {
    const response = PickupService().createInternal({
      header: {
        [PICKUP_HEADER_FIELDS.DATE]: sample.input,
        [PICKUP_HEADER_FIELDS.PARTNER_ID]: partner[PARTNER_SCHEMA.PRIMARY_KEY],
        [PICKUP_HEADER_FIELDS.NOTES]: `[TEST] Pickup ${sample.label} manual cleanup`,
      },
      details: [
        {
          [PICKUP_DETAIL_FIELDS.PRODUCT_ID]:
            products[0][PRODUCT_SCHEMA.PRIMARY_KEY],
          [PICKUP_DETAIL_FIELDS.QTY]: 1,
          [PICKUP_DETAIL_FIELDS.NOTES]: "[TEST] Pickup date normalization",
        },
      ],
    });

    if (
      !response.success ||
      pickupCalendarDate(response.data.header[PICKUP_HEADER_FIELDS.DATE]) !==
        sample.expected
    ) {
      throw new Error(`Pickup ${sample.label} normalization failed.`);
    }

    recordPickupFixture(1 + response.data.details.length);

    Logger.log(
      `Pickup date test created header ${response.data.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]}. Manual cleanup required.`,
    );
  });
}

function testPickupPresenterDateContract() {
  const source = HtmlService.createHtmlOutputFromFile(
    "974.View.Pickups.Presenter",
  ).getContent();
  const appSource = HtmlService.createHtmlOutputFromFile(
    "994.View.App.Runtime",
  ).getContent();
  const formatSource = HtmlService.createHtmlOutputFromFile(
    "986.View.Format",
  ).getContent();

  const required = [
    "function calendarDateValue(value)",
    "function dateInputValue(value)",
    "function formatPickupDate(value)",
    "formatPickupDate(row[FIELD.DATE])",
    'detailField("Tanggal",formatPickupDate(header.Tanggal))',
    "date.getFullYear()",
    "date.getMonth()",
    "date.getDate()",
  ];

  required.forEach((contract) => {
    if (source.indexOf(contract) === -1) {
      throw new Error(`Pickup presenter date contract is missing: ${contract}`);
    }
  });

  const dateInputSection = source.slice(
    source.indexOf("function dateInputValue(value)"),
    source.indexOf("function formatPickupDate(value)"),
  );
  const sharedDateInputSection = formatSource.slice(
    formatSource.indexOf("function dateInput(value)"),
    formatSource.indexOf("function percent(value"),
  );
  if (!/^function dateInputValue\(value\)\s*\{\s*return Format\.dateInput\(value\);\s*\}$/m.test(dateInputSection.trim())) {
    throw new Error("Pickup date input must delegate directly to canonical Format.dateInput normalization.");
  }
  [
    "value instanceof Date ? value : new Date(value)",
    "Number.isNaN(parsed.getTime())",
    "parsed.getFullYear()",
    "parsed.getMonth() + 1",
    "parsed.getDate()",
  ].forEach((contract) => {
    if (sharedDateInputSection.indexOf(contract) === -1) {
      throw new Error(`Shared date input contract is missing: ${contract}`);
    }
  });
  if (/return\s+value\s*;/.test(dateInputSection) || /return\s+String\(value/.test(dateInputSection)) {
    throw new Error("Pickup date input leaks or directly passes through an unnormalized value.");
  }

  if (/\.slice\(0,\s*10\)/.test(source)) {
    throw new Error("Pickup presenter must not slice ISO date prefixes.");
  }

  if (/new Date\(["']\d{4}-\d{2}-\d{2}["']\)/.test(source)) {
    throw new Error("Pickup presenter must not parse YYYY-MM-DD with new Date().");
  }

  ["function pickupMatch(row,query)","function searchPickups(keyword", "renderPickups();"].forEach((contract) => {
    if (appSource.indexOf(contract) === -1) throw new Error(`Pickup App search contract is missing: ${contract}`);
  });
}

function testPickupFrontendArchitectureContracts() {
  const presenter = HtmlService.createHtmlOutputFromFile("974.View.Pickups.Presenter").getContent();
  const app = HtmlService.createHtmlOutputFromFile("994.View.App.Runtime").getContent();
  const events = HtmlService.createHtmlOutputFromFile("993.View.Events.Runtime").getContent();
  const api = HtmlService.createHtmlOutputFromFile("965.View.API").getContent();
  const view = HtmlService.createHtmlOutputFromFile("930.View.Pickups").getContent();
  ["render","renderLoading","renderError","renderEmpty","renderDetail","renderForm","renderFormDetail","renderFormFooter"].forEach((name)=>{if(presenter.indexOf(name)===-1)throw new Error(`PickupPresenter is missing ${name}.`);});
  ["Api.","PickupAPI","ProductAPI","PartnerAPI","App.","google.script.run","Toast.","Dialog.","Modal.","addEventListener","async function","new Promise","SpreadsheetApp","AuditLogService","Repository","Controller","Service"].forEach((token)=>{if(presenter.indexOf(token)!==-1)throw new Error(`PickupPresenter forbidden ownership: ${token}`);});
  ["pickupMode","deletedPickups","pickupSearch","pickupRequest","pickupDetailRequest","pickupDependencyLoading","pickupForm","openCreatePickup","openEditPickup","viewPickup","deletePickup","restorePickup","submitPickupForm","Api.Pickup.create","Api.Pickup.update","Api.Pickup.remove","Api.Pickup.restore"].forEach((token)=>{if(app.indexOf(token)===-1)throw new Error(`App Pickup ownership is missing ${token}.`);});
  ["bindPickups","App.openCreatePickup","App.openEditPickup","App.viewPickup","App.deletePickup","App.restorePickup","App.submitPickupForm","App.addPickupDetail","App.removePickupDetail"].forEach((token)=>{if(events.indexOf(token)===-1)throw new Error(`Pickup Event delegation is missing ${token}.`);});
  if(/Api\.|PickupsPresenter\./.test(events.match(/function handlePickupClick[\s\S]*?function handlePickupSubmit[\s\S]*?\}/)?.[0]||""))throw new Error("Pickup Event handlers must delegate only to App.");
  ["findAll()","findDeleted(options = {})","findById(id)","create(data)","update(id, data)","remove(id)","restore(id)"].forEach((token)=>{if(api.indexOf(token)===-1)throw new Error(`Pickup API contract is missing ${token}.`);});
  if(/Api\.|google\.script\.run|SpreadsheetApp/.test(view))throw new Error("Pickup View must remain declarative.");
}

function testPickupAcceptancePhaseRegistrationContracts() {
  const phases = PICKUP_ACCEPTANCE_PHASES();
  const expectedMemberships = {
    Read: "testCoreValidator|testCoreResponse|testRepositoryCacheOversizedValueBypass|testTransactionServicePublicApi|testTransactionServiceFindAll|testTransactionServiceFindByIdValidation|testTransactionServiceFindByIdResponseShape|testPickupServicePublicApi|testPickupServiceFindAll|testPickupServiceFindByIdValidation|testPickupServiceHeaderDetailRead|testPickupPresenterDateContract|testPickupFrontendArchitectureContracts|testPickupTrashReadFilteringAndShape|testPickupTrashReadSortingAndSearch|testPickupTrashReadEligibilityResults|testPickupTrashReadBoundedDependencyReads|testPickupTrashReadPerformsZeroWrites|testPickupTrashReadController|testPickupControllerPublicApi|testPickupControllerGetPickups|testPickupControllerGetPickupValidation|testPickupControllerSerialization",
    Validation: "testPickupCreateMissingDocument|testPickupCreateMissingHeader|testPickupCreateEmptyDetails|testPickupCreateMissingTanggal|testPickupCreateInvalidTanggal|testPickupCreateMissingPartnerId|testPickupCreateInvalidPartnerId|testPickupCreateMissingProductId|testPickupCreateInvalidProductId|testPickupCreateInvalidQty|testPickupCreateDuplicateProductId|testPickupUpdateMissingId|testPickupUpdateUnknownId|testPickupUpdateMissingDocument|testPickupUpdateMissingHeader|testPickupUpdateEmptyDetails|testPickupUpdateMissingTanggal|testPickupUpdateMissingPartnerId|testPickupUpdateInvalidPartnerId|testPickupUpdateMissingProductId|testPickupUpdateInvalidProductId|testPickupUpdateInvalidQty|testPickupUpdateDuplicateProductId|testPickupRemoveMissingId|testPickupRemoveUnknownId|testPickupControllerCreateValidation|testPickupControllerUpdateValidation|testPickupControllerDeleteValidation|testPickupControllerRestoreValidation",
    Mutation: "testPickupCreateValidSingleItem|testPickupCreateValidMultiItem|testPickupDateNormalization|testPickupUpdateSingleToMultiItem|testPickupUpdateMultiToSingleItem|testPickupUpdatePreservesHeaderIdentity|testPickupUpdateRecalculatesTotals|testPickupUpdateReplacesActiveDetails|testPickupRemoveHeaderAndDetails|testPickupRemovePreservesIdentity|testPickupRemoveDoesNotAffectOtherPickup|testPickupRemoveAlreadyDeleted",
    Restore: "testPickupRestoreMissingId|testPickupRestoreUnknownId|testPickupIntegrityRestorePreflight|testPickupRestoreEligibilitySafe|testPickupRestoreEligibilityMultipleGenerations|testPickupRestoreEligibilityAmbiguousReturns|testPickupRestoreEligibilityMissingDetail|testPickupRestoreEligibilityRelationshipMismatch|testPickupRestoreEligibilityActivePickup|testPickupRestoreEligibilityMissingPickup|testPickupRestoreEligibilityPerformsZeroWrites|testPickupRestoreEligibilityIsDeterministic",
  };
  const expectedOrder = [
    "runPickupReadAcceptance",
    "runPickupValidationAcceptance",
    "runPickupMutationAcceptance",
    "runPickupRestoreAcceptance",
  ];
  if (!Array.isArray(phases) || phases.map((phase) => phase.runner).join("|") !== expectedOrder.join("|")) {
    throw new Error("Pickup acceptance phase order is invalid.");
  }

  const allTests = [];
  const memberships = Object.create(null);
  phases.forEach((phase) => {
    if (!Array.isArray(phase.tests) || !phase.tests.length) throw new Error(`${phase.name} has no registered tests.`);
    if (phase.expectedCount !== phase.tests.length) throw new Error(`${phase.name} derived phase count is invalid.`);
    if (phase.tests.map((test) => test.name).join("|") !== expectedMemberships[phase.name]) {
      throw new Error(`${phase.name} membership differs from the canonical Pickup acceptance contract.`);
    }
    const withinPhase = new Set();
    phase.tests.forEach((test) => {
      if (typeof test !== "function" || !test.name) throw new Error(`${phase.name} contains a non-callable test.`);
      if (withinPhase.has(test.name)) throw new Error(`${test.name} is duplicated within ${phase.name}.`);
      withinPhase.add(test.name);
      memberships[test.name] = (memberships[test.name] || 0) + 1;
      allTests.push(test);
    });
  });
  const duplicates = Object.keys(memberships).filter((name) => memberships[name] !== 1);
  if (duplicates.length) throw new Error(`Pickup tests must belong to exactly one phase: ${duplicates.join(", ")}`);

  const requiredOnce = [
    testPickupFrontendArchitectureContracts,
    testPickupTrashReadBoundedDependencyReads,
    testPickupTrashReadPerformsZeroWrites,
    testPickupRestoreEligibilityPerformsZeroWrites,
  ];
  requiredOnce.forEach((test) => {
    if (memberships[test.name] !== 1) throw new Error(`${test.name} must be registered exactly once.`);
  });
  PICKUP_RESTORE_ACCEPTANCE_TESTS().forEach((test) => {
    if (!/Restore|Eligibility/.test(test.name)) throw new Error(`Non-restore test is registered in Restore: ${test.name}`);
  });
  phases.filter((phase) => phase.name !== "Restore").forEach((phase) => {
    phase.tests.forEach((test) => {
      if (/RestoreEligibility|IntegrityRestorePreflight|PickupRestoreMissing|PickupRestoreUnknown/.test(test.name)) {
        throw new Error(`Restore test is registered outside Restore: ${test.name}`);
      }
    });
  });

  const phaseRunnerSources = [
    runPickupReadAcceptance,
    runPickupValidationAcceptance,
    runPickupMutationAcceptance,
    runPickupRestoreAcceptance,
  ].map((runner) => runner.toString()).join("\n");
  if (/RepositoryReader|RepositoryWriter|SpreadsheetApp|PickupService\(/.test(phaseRunnerSources)) {
    throw new Error("Pickup phase runners must not access production data directly.");
  }
  if (!/reportTiming:\s*true/.test(runPickupAcceptancePhase.toString()) || !/fixtureCount/.test(runPickupAcceptancePhase.toString())) {
    throw new Error("Pickup phase timing or fixture-count reporting is missing.");
  }

  const deprecatedSource = runPickupModuleAcceptance.toString();
  expectedOrder.concat("runPickupAcceptanceMetaTests").forEach((name) => {
    if (deprecatedSource.indexOf(`${name}()`) === -1) throw new Error(`Deprecated Pickup runner must list ${name}().`);
  });
  if (/runTestSuite|runPickupAcceptancePhase/.test(deprecatedSource)) {
    throw new Error("Deprecated Pickup runner must fail before executing tests.");
  }
  let failedFast = false;
  try {
    runPickupModuleAcceptance();
  } catch (error) {
    failedFast = expectedOrder.every((name) => String(error.message).indexOf(`${name}()`) !== -1);
  }
  if (!failedFast || activeTestRegistry !== null) throw new Error("Deprecated Pickup runner did not fail fast with zero tests.");

  const summary = phases.map((phase) => `${phase.name}=${phase.tests.length}`).join(", ");
  Logger.log(`PICKUP PHASE REGISTRATION: ${summary}; total=${allTests.length}; unique=${Object.keys(memberships).length}`);
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

  const response = PickupService().createInternal({
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

  recordPickupFixture(1 + response.data.details.length);

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

  const response = PickupService().createInternal({
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

  recordPickupFixture(1 + response.data.details.length);

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

  const response = PickupService().createInternal({
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

  recordPickupFixture(1 + response.data.details.length);

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

function pickupRestoreEligibilityFixture(overrides) {
  const headerId = "PH_ELIGIBILITY";
  const detailId = "PD_ELIGIBILITY_1";
  const rows = {
    headers: [{
      [PICKUP_HEADER_SCHEMA.PRIMARY_KEY]: headerId,
      [PICKUP_HEADER_SCHEMA.SYSTEM.IS_ACTIVE]: false,
      [PICKUP_HEADER_SCHEMA.SYSTEM.IS_DELETED]: true,
    }],
    details: [{
      [PICKUP_DETAIL_SCHEMA.PRIMARY_KEY]: detailId,
      [PICKUP_DETAIL_FIELDS.PICKUP_ID]: headerId,
      [PICKUP_DETAIL_FIELDS.PRODUCT_ID]: "PR_ELIGIBILITY",
      [PICKUP_DETAIL_SCHEMA.SYSTEM.IS_ACTIVE]: false,
      [PICKUP_DETAIL_SCHEMA.SYSTEM.IS_DELETED]: true,
    }],
    returns: [],
  };
  Object.keys(overrides || {}).forEach((key) => {
    rows[key] = overrides[key];
  });
  let reads = 0;
  const service = PickupService({
    readPhysicalRows(schema) {
      reads++;
      if (schema === PICKUP_HEADER_SCHEMA) return rows.headers;
      if (schema === PICKUP_DETAIL_SCHEMA) return rows.details;
      if (schema === RETURN_SCHEMA) return rows.returns;
      throw new Error("Unexpected restore eligibility schema.");
    },
  });
  return { headerId, detailId, rows, service, readCount: () => reads };
}

function pickupRestoreEligibilityReturn(pickupId, detailId) {
  return {
    [RETURN_SCHEMA.PRIMARY_KEY]: `RT_${detailId}`,
    [RETURN_FIELDS.PICKUP_ID]: pickupId,
    [RETURN_FIELDS.PICKUP_DETAIL_ID]: detailId,
  };
}

function assertPickupRestoreEligibilityCode(result, code, allowed) {
  if (!result || result.code !== code || result.allowed !== allowed) {
    throw new Error(`Expected ${code} eligibility result.`);
  }
}

function testPickupRestoreEligibilitySafe() {
  const fixture = pickupRestoreEligibilityFixture();
  const result = fixture.service.evaluateRestoreEligibility(fixture.headerId);
  assertPickupRestoreEligibilityCode(result, "SAFE", true);
  if (
    result.facts.detailCount !== 1 ||
    result.facts.deletedDetailCount !== 1 ||
    result.facts.generationCount !== 1
  ) throw new Error("SAFE eligibility facts are invalid.");
}

function testPickupRestoreEligibilityMultipleGenerations() {
  const fixture = pickupRestoreEligibilityFixture();
  fixture.rows.details.push(Object.assign({}, fixture.rows.details[0], {
    [PICKUP_DETAIL_SCHEMA.PRIMARY_KEY]: "PD_ELIGIBILITY_2",
  }));
  const result = fixture.service.evaluateRestoreEligibility(fixture.headerId);
  assertPickupRestoreEligibilityCode(result, "MULTIPLE_DETAIL_GENERATIONS", false);
  if (result.facts.duplicateProducts.join("|") !== "PR_ELIGIBILITY") {
    throw new Error("Duplicate products fact is invalid.");
  }
}

function testPickupRestoreEligibilityAmbiguousReturns() {
  const fixture = pickupRestoreEligibilityFixture();
  fixture.rows.details.push(Object.assign({}, fixture.rows.details[0], {
    [PICKUP_DETAIL_SCHEMA.PRIMARY_KEY]: "PD_FOREIGN",
    [PICKUP_DETAIL_FIELDS.PICKUP_ID]: "PH_FOREIGN",
  }));
  fixture.rows.returns = [
    pickupRestoreEligibilityReturn(fixture.headerId, fixture.detailId),
    pickupRestoreEligibilityReturn(fixture.headerId, "PD_FOREIGN"),
  ];
  assertPickupRestoreEligibilityCode(
    fixture.service.evaluateRestoreEligibility(fixture.headerId),
    "AMBIGUOUS_RETURN_HISTORY",
    false,
  );
}

function testPickupRestoreEligibilityMissingDetail() {
  const fixture = pickupRestoreEligibilityFixture();
  fixture.rows.returns = [
    pickupRestoreEligibilityReturn(fixture.headerId, "PD_MISSING"),
  ];
  assertPickupRestoreEligibilityCode(
    fixture.service.evaluateRestoreEligibility(fixture.headerId),
    "MISSING_PICKUP_DETAIL",
    false,
  );
}

function testPickupRestoreEligibilityRelationshipMismatch() {
  const fixture = pickupRestoreEligibilityFixture();
  fixture.rows.returns = [
    pickupRestoreEligibilityReturn("PH_FOREIGN", fixture.detailId),
  ];
  assertPickupRestoreEligibilityCode(
    fixture.service.evaluateRestoreEligibility(fixture.headerId),
    "RETURN_RELATIONSHIP_MISMATCH",
    false,
  );
}

function testPickupRestoreEligibilityActivePickup() {
  const fixture = pickupRestoreEligibilityFixture();
  fixture.rows.headers[0][PICKUP_HEADER_SCHEMA.SYSTEM.IS_DELETED] = false;
  assertPickupRestoreEligibilityCode(
    fixture.service.evaluateRestoreEligibility(fixture.headerId),
    "NOT_DELETED",
    false,
  );
}

function testPickupRestoreEligibilityMissingPickup() {
  const fixture = pickupRestoreEligibilityFixture({ headers: [] });
  assertPickupRestoreEligibilityCode(
    fixture.service.evaluateRestoreEligibility(fixture.headerId),
    "NOT_FOUND",
    false,
  );
}

function testPickupRestoreEligibilityPerformsZeroWrites() {
  const fixture = pickupRestoreEligibilityFixture();
  const before = JSON.stringify(fixture.rows);
  fixture.service.evaluateRestoreEligibility(fixture.headerId);
  if (JSON.stringify(fixture.rows) !== before || fixture.readCount() !== 3) {
    throw new Error("Restore eligibility evaluation must only read each dataset once.");
  }
}

function testPickupRestoreEligibilityIsDeterministic() {
  const fixture = pickupRestoreEligibilityFixture();
  const first = fixture.service.evaluateRestoreEligibility(fixture.headerId);
  const second = fixture.service.evaluateRestoreEligibility(fixture.headerId);
  if (JSON.stringify(first) !== JSON.stringify(second)) {
    throw new Error("Repeated restore eligibility evaluation changed its result.");
  }
}

function pickupTrashReadFixture(overrides) {
  const rows = {
    headers: [
      {
        ID: "PH_TRASH_B",
        PickupNo: "PH_TRASH_B",
        Tanggal: "2026-07-20",
        PartnerID: "PA_TRASH_DELETED",
        TotalQty: 999,
        Status: "Posted",
        Notes: "blocked pickup",
        Deleted: true,
        IsActive: false,
      },
      {
        ID: "PH_TRASH_A",
        PickupNo: "PH_TRASH_A",
        Tanggal: "2026-07-20",
        PartnerID: "PA_TRASH_ACTIVE",
        TotalQty: 999,
        Status: "Posted",
        Notes: "safe pickup",
        Deleted: true,
        IsActive: false,
      },
      {
        ID: "PH_TRASH_OLD",
        PickupNo: "PH_TRASH_OLD",
        Tanggal: "2026-07-19",
        PartnerID: "PA_TRASH_ACTIVE",
        Status: "Posted",
        Notes: "older pickup",
        Deleted: true,
        IsActive: false,
      },
      {
        ID: "PH_TRASH_ACTIVE",
        PickupNo: "PH_TRASH_ACTIVE",
        Tanggal: "2026-07-21",
        PartnerID: "PA_TRASH_ACTIVE",
        Status: "Posted",
        Notes: "active pickup",
        Deleted: false,
        IsActive: true,
      },
    ],
    details: [
      {
        ID: "PD_TRASH_A",
        PickupID: "PH_TRASH_A",
        ProductID: "PR_TRASH_ACTIVE",
        Qty: 1.25,
        Deleted: true,
        IsActive: false,
      },
      {
        ID: "PD_TRASH_B1",
        PickupID: "PH_TRASH_B",
        ProductID: "PR_TRASH_DELETED",
        Qty: 2,
        Deleted: true,
        IsActive: false,
      },
      {
        ID: "PD_TRASH_B2",
        PickupID: "PH_TRASH_B",
        ProductID: "PR_TRASH_DELETED",
        Qty: 0.5,
        Deleted: true,
        IsActive: false,
      },
    ],
    returns: [],
    partners: [
      { ID: "PA_TRASH_ACTIVE", Nama: "Partner Active", Deleted: false, IsActive: true },
      { ID: "PA_TRASH_DELETED", Nama: "Partner Deleted", Deleted: true, IsActive: false },
    ],
    products: [
      { ID: "PR_TRASH_ACTIVE", Nama: "Product Active", Deleted: false, IsActive: true },
      { ID: "PR_TRASH_DELETED", Nama: "Product Deleted", Deleted: true, IsActive: false },
    ],
  };
  Object.keys(overrides || {}).forEach((key) => {
    rows[key] = overrides[key];
  });
  let reads = 0;
  const service = PickupService({
    readPhysicalRows(schema) {
      reads++;
      if (schema === PICKUP_HEADER_SCHEMA) return rows.headers;
      if (schema === PICKUP_DETAIL_SCHEMA) return rows.details;
      if (schema === RETURN_SCHEMA) return rows.returns;
      if (schema === PARTNER_SCHEMA) return rows.partners;
      if (schema === PRODUCT_SCHEMA) return rows.products;
      throw new Error("Unexpected Pickup Trash schema.");
    },
  });
  return { rows, service, readCount: () => reads };
}

function pickupTrashRows(response) {
  if (!response || !response.success || !Array.isArray(response.data)) {
    throw new Error("PickupService.listDeleted() response is invalid.");
  }
  return response.data;
}

function canonicalPickupTrashResponse(response) {
  const transported = JSON.parse(JSON.stringify(response));

  return JSON.stringify({
    success: transported.success,
    message: transported.message,
    data: transported.data,
    errors: transported.errors,
    meta: {
      version: transported.meta && transported.meta.version,
    },
  });
}

function testPickupTrashReadFilteringAndShape() {
  const rows = pickupTrashRows(pickupTrashReadFixture().service.listDeleted());
  if (rows.length !== 3 || rows.some((row) => row.Deleted !== true)) {
    throw new Error("Pickup Trash filtering failed.");
  }
  if (rows.some((row) => row.ID === "PH_TRASH_ACTIVE")) {
    throw new Error("Active Pickup appeared in Pickup Trash.");
  }
  const safe = rows.find((row) => row.ID === "PH_TRASH_A");
  if (
    safe.partnerName !== "Partner Active" ||
    safe.details[0].productName !== "Product Active" ||
    safe.details[0].Qty !== 1.25 ||
    safe.TotalQty !== 1.25 ||
    !safe.detailSummary.includes("Product Active")
  ) {
    throw new Error("Pickup Trash display data or decimal Qty is invalid.");
  }
  const blocked = rows.find((row) => row.ID === "PH_TRASH_B");
  if (
    blocked.partnerName !== "Partner Deleted" ||
    blocked.details.some((detail) => detail.productName !== "Product Deleted") ||
    blocked.TotalQty !== 2.5
  ) {
    throw new Error("Deleted master-data display handling is invalid.");
  }
}

function testPickupTrashReadSortingAndSearch() {
  const fixture = pickupTrashReadFixture();
  const rows = pickupTrashRows(fixture.service.listDeleted());
  if (rows.map((row) => row.ID).join("|") !== "PH_TRASH_A|PH_TRASH_B|PH_TRASH_OLD") {
    throw new Error("Pickup Trash sort order is invalid.");
  }
  const searched = pickupTrashRows(
    fixture.service.listDeleted({ search: "blocked pickup" }),
  );
  if (searched.length !== 1 || searched[0].ID !== "PH_TRASH_B") {
    throw new Error("Pickup Trash search does not follow the Pickup list contract.");
  }
  if (fixture.service.listDeleted({ search: 1 }).success) {
    throw new Error("Pickup Trash accepted an invalid search option.");
  }
  const empty = pickupTrashReadFixture({ headers: [] });
  if (pickupTrashRows(empty.service.listDeleted()).length !== 0) {
    throw new Error("Empty Pickup Trash must return a successful empty list.");
  }
}

function testPickupTrashReadEligibilityResults() {
  const rows = pickupTrashRows(pickupTrashReadFixture().service.listDeleted());
  const safe = rows.find((row) => row.ID === "PH_TRASH_A");
  const blocked = rows.find((row) => row.ID === "PH_TRASH_B");
  assertPickupRestoreEligibilityCode(safe.restoreEligibility, "SAFE", true);
  assertPickupRestoreEligibilityCode(
    blocked.restoreEligibility,
    "MULTIPLE_DETAIL_GENERATIONS",
    false,
  );
  if (rows.length !== 3) {
    throw new Error("Blocked eligibility failed the full Pickup Trash list.");
  }
}

function testPickupTrashReadBoundedDependencyReads() {
  const fixture = pickupTrashReadFixture();
  const startedAt = Date.now();
  const rows = pickupTrashRows(fixture.service.listDeleted());
  const durationMs = Date.now() - startedAt;
  if (rows.length !== 3 || fixture.readCount() !== 5) {
    throw new Error("Pickup Trash must read Header, Detail, Return, Partner, and Product once per request.");
  }
  if (rows.some((row) => !row.restoreEligibility || !row.restoreEligibility.code)) {
    throw new Error("Pickup Trash bounded reads lost restore eligibility metadata.");
  }
  Logger.log(`PICKUP DELETED PERFORMANCE: rows=${rows.length}, dependencyReads=${fixture.readCount()}, durationMs=${durationMs}`);
}

function testPickupTrashReadPerformsZeroWrites() {
  const fixture = pickupTrashReadFixture();
  const before = JSON.stringify(fixture.rows);
  const first = fixture.service.listDeleted();
  const between = JSON.stringify(fixture.rows);
  const second = fixture.service.listDeleted();
  const after = JSON.stringify(fixture.rows);
  const firstRows = pickupTrashRows(first);
  const secondRows = pickupTrashRows(second);

  if (between !== before || after !== before) {
    throw new Error("Pickup Trash read changed physical fixture data.");
  }
  if (
    firstRows.length !== secondRows.length ||
    firstRows.map((row) => row.ID).join("|") !==
      secondRows.map((row) => row.ID).join("|") ||
    canonicalPickupTrashResponse(first) !== canonicalPickupTrashResponse(second)
  ) {
    throw new Error("Repeated Pickup Trash reads are not deterministic.");
  }
  const timestampVariant = JSON.parse(JSON.stringify(first));
  timestampVariant.meta.timestamp = "different-runtime-timestamp";
  if (canonicalPickupTrashResponse(first) !== canonicalPickupTrashResponse(timestampVariant)) {
    throw new Error("Runtime response metadata leaked into Pickup Trash semantic comparison.");
  }
  const dataVariant = JSON.parse(JSON.stringify(first));
  dataVariant.data[0].Notes = "different-semantic-value";
  if (canonicalPickupTrashResponse(first) === canonicalPickupTrashResponse(dataVariant)) {
    throw new Error("Pickup Trash semantic comparison ignored a row value change.");
  }
  if (
    firstRows.some((row, index) =>
      typeof row.Tanggal !== typeof secondRows[index].Tanggal ||
      JSON.stringify(row.restoreEligibility) !==
        JSON.stringify(secondRows[index].restoreEligibility),
    )
  ) {
    throw new Error("Pickup Trash transport types or restore eligibility changed between reads.");
  }
  if (fixture.readCount() === 0) {
    throw new Error("Pickup Trash test did not exercise physical reads.");
  }
}

function testPickupTrashReadController() {
  const beforeHeaders = RepositoryReader.count(PICKUP_HEADER_SCHEMA);
  const beforeDetails = RepositoryReader.count(PICKUP_DETAIL_SCHEMA);
  const response = getDeletedPickups({ search: "" });
  if (!response || !response.success || !Array.isArray(response.data)) {
    throw new Error("getDeletedPickups() response is invalid.");
  }
  JSON.stringify(response);
  if (
    RepositoryReader.count(PICKUP_HEADER_SCHEMA) !== beforeHeaders ||
    RepositoryReader.count(PICKUP_DETAIL_SCHEMA) !== beforeDetails
  ) {
    throw new Error("getDeletedPickups() must perform zero writes.");
  }
}

function pickupIntegrityDocument(transaction, details) {
  return {
    header: {
      [PICKUP_HEADER_FIELDS.DATE]: "2026-07-20",
      [PICKUP_HEADER_FIELDS.PARTNER_ID]:
        transaction.header[PICKUP_HEADER_FIELDS.PARTNER_ID],
      [PICKUP_HEADER_FIELDS.NOTES]: "[TEST] integrity header update",
    },
    details: details.map((detail) => ({
      [PICKUP_DETAIL_FIELDS.PRODUCT_ID]:
        detail[PICKUP_DETAIL_FIELDS.PRODUCT_ID],
      [PICKUP_DETAIL_FIELDS.QTY]: detail[PICKUP_DETAIL_FIELDS.QTY],
      [PICKUP_DETAIL_FIELDS.NOTES]: detail[PICKUP_DETAIL_FIELDS.NOTES],
    })),
  };
}

function createPickupIntegrityFixture(detailCount) {
  const transaction = createPickupUpdateTestTransaction(detailCount);
  if (!transaction) return null;
  const detail = transaction.details[0];
  const row = createReturnTestRow({
    detail,
    available: Number(detail[PICKUP_DETAIL_FIELDS.QTY]),
  });

  Logger.log(
    `Pickup-Return integrity fixture requires manual cleanup: Pickup ${transaction.header.ID}, Return ${row.ID}.`,
  );
  return { transaction, row };
}

function assertPickupIntegrityUnchanged(transaction, before) {
  const after = PickupService().findById(transaction.header.ID);
  if (!after.success || JSON.stringify(after.data) !== JSON.stringify(before)) {
    throw new Error("Blocked Pickup mutation changed persisted data.");
  }
}

function testPickupIntegrityHeaderOnlyAndReorder() {
  const fixture = createPickupIntegrityFixture(2);
  if (!fixture) return;
  const transaction = fixture.transaction;
  const originalIds = transaction.details.map((detail) => detail.ID).sort();
  const document = pickupIntegrityDocument(
    transaction,
    transaction.details.slice().reverse(),
  );
  const response = PickupService().update(transaction.header.ID, document);
  const active = PickupService().findById(transaction.header.ID);

  if (
    !response.success ||
    !active.success ||
    active.data.details.length !== transaction.details.length ||
    active.data.details.map((detail) => detail.ID).sort().join("|") !==
      originalIds.join("|")
  ) {
    throw new Error("Equivalent header-only Pickup update did not preserve details.");
  }

  const numericDocument = pickupIntegrityDocument(transaction, transaction.details);
  numericDocument.details[0][PICKUP_DETAIL_FIELDS.QTY] =
    String(numericDocument.details[0][PICKUP_DETAIL_FIELDS.QTY]);
  if (!PickupService().update(transaction.header.ID, numericDocument).success) {
    throw new Error("Equivalent numeric Qty representation was treated as changed.");
  }

  const alternatePartner = RepositoryReader.findAll(PARTNER_SCHEMA).find((partner) => {
    return (
      partner[PARTNER_SCHEMA.SYSTEM.IS_ACTIVE] === true &&
      partner[PARTNER_SCHEMA.PRIMARY_KEY] !==
        transaction.header[PICKUP_HEADER_FIELDS.PARTNER_ID]
    );
  });
  if (alternatePartner) {
    const partnerDocument = pickupIntegrityDocument(transaction, transaction.details);
    partnerDocument.header[PICKUP_HEADER_FIELDS.PARTNER_ID] =
      alternatePartner[PARTNER_SCHEMA.PRIMARY_KEY];
    const partnerResponse = PickupService().update(transaction.header.ID, partnerDocument);
    if (
      !partnerResponse.success ||
      partnerResponse.data.details.map((detail) => detail.ID).sort().join("|") !==
        originalIds.join("|")
    ) {
      throw new Error("Partner-only Pickup update did not preserve detail identity.");
    }
  } else {
    Logger.log("SKIPPED: no alternate active Partner for header-only guard test.");
  }

  const beforeDelete = PickupService().findById(transaction.header.ID).data;
  if (PickupService().remove(transaction.header.ID).success) {
    throw new Error("Active Return history must block Pickup delete.");
  }
  assertPickupIntegrityUnchanged(transaction, beforeDelete);
}

function testPickupIntegrityBlocksDetailMutations() {
  const fixture = createPickupIntegrityFixture(2);
  if (!fixture) return;
  const transaction = fixture.transaction;
  const mutations = [
    (details) => {
      details[0][PICKUP_DETAIL_FIELDS.QTY] =
        Number(details[0][PICKUP_DETAIL_FIELDS.QTY]) + 0.5;
    },
    (details) => {
      const first = details[0][PICKUP_DETAIL_FIELDS.PRODUCT_ID];
      details[0][PICKUP_DETAIL_FIELDS.PRODUCT_ID] =
        details[1][PICKUP_DETAIL_FIELDS.PRODUCT_ID];
      details[1][PICKUP_DETAIL_FIELDS.PRODUCT_ID] = first;
    },
    (details) => details.pop(),
    (details) => {
      details[0][PICKUP_DETAIL_FIELDS.NOTES] = "changed";
    },
  ];

  mutations.forEach((mutate) => {
    const beforeResponse = PickupService().findById(transaction.header.ID);
    const before = beforeResponse.data;
    const document = pickupIntegrityDocument(transaction, transaction.details);
    mutate(document.details);
    const response = PickupService().update(transaction.header.ID, document);
    if (response.success) throw new Error("Pickup detail mutation must be blocked.");
    assertPickupIntegrityUnchanged(transaction, before);
  });

  const usedProductIds = transaction.details.map(
    (detail) => detail[PICKUP_DETAIL_FIELDS.PRODUCT_ID],
  );
  const additionalProduct = RepositoryReader.findAll(PRODUCT_SCHEMA).find(
    (product) => {
      return (
        product[PRODUCT_SCHEMA.SYSTEM.IS_ACTIVE] === true &&
        usedProductIds.indexOf(product[PRODUCT_SCHEMA.PRIMARY_KEY]) === -1
      );
    },
  );

  if (additionalProduct) {
    const before = PickupService().findById(transaction.header.ID).data;
    const document = pickupIntegrityDocument(transaction, transaction.details);
    document.details.push({
      [PICKUP_DETAIL_FIELDS.PRODUCT_ID]:
        additionalProduct[PRODUCT_SCHEMA.PRIMARY_KEY],
      [PICKUP_DETAIL_FIELDS.QTY]: 1,
      [PICKUP_DETAIL_FIELDS.NOTES]: "added detail",
    });
    if (PickupService().update(transaction.header.ID, document).success) {
      throw new Error("Pickup detail addition must be blocked.");
    }
    assertPickupIntegrityUnchanged(transaction, before);
  } else {
    Logger.log("SKIPPED: no third active Product for detail-addition guard test.");
  }
}

function testPickupIntegrityDeletedReturnAndDeleteGuards() {
  const fixture = createPickupIntegrityFixture(1);
  if (!fixture) return;
  const transaction = fixture.transaction;
  if (!ReturnService().remove(fixture.row.ID).success) {
    throw new Error("Return fixture could not be soft-deleted.");
  }
  if (!RepositoryWriter.update(RETURN_SCHEMA, fixture.row.ID, {
    [RETURN_FIELDS.PICKUP_ID]: "",
  })) {
    throw new Error("Malformed deleted Return fixture could not be prepared.");
  }

  const headerOnly = PickupService().update(
    transaction.header.ID,
    pickupIntegrityDocument(transaction, transaction.details),
  );
  if (!headerOnly.success) {
    throw new Error("Deleted Return history must allow equivalent header update.");
  }

  const before = PickupService().findById(transaction.header.ID).data;
  const changed = pickupIntegrityDocument(transaction, transaction.details);
  changed.details[0][PICKUP_DETAIL_FIELDS.QTY] =
    Number(changed.details[0][PICKUP_DETAIL_FIELDS.QTY]) + 1;
  if (PickupService().update(transaction.header.ID, changed).success) {
    throw new Error("Deleted Return history must block detail mutation.");
  }
  if (PickupService().remove(transaction.header.ID).success) {
    throw new Error("Deleted Return history must block Pickup delete.");
  }
  assertPickupIntegrityUnchanged(transaction, before);
}

function testPickupIntegrityRestorePreflight() {
  const transaction = createPickupUpdateTestTransaction(1);
  if (!transaction) return;
  const identity = assertPickupRemoved(transaction);
  const response = PickupService().restore(identity.headerId);
  if (!response.success) {
    throw new Error("A Pickup with one unambiguous detail must restore safely.");
  }

  const removedAgain = PickupService().remove(identity.headerId);
  if (!removedAgain.success) throw new Error("Safe restore fixture cleanup failed.");

  const originalDetail = findPickupDetailsIncludingDeleted(identity.headerId)[0];
  const duplicate = Object.assign({}, originalDetail, {
    [PICKUP_DETAIL_SCHEMA.PRIMARY_KEY]: IDGenerator.generate(PICKUP_DETAIL_SCHEMA),
    [PICKUP_DETAIL_SCHEMA.SYSTEM.IS_DELETED]: true,
    [PICKUP_DETAIL_SCHEMA.SYSTEM.IS_ACTIVE]: false,
  });
  if (!RepositoryWriter.insert(PICKUP_DETAIL_SCHEMA, duplicate)) {
    throw new Error("Duplicate restore-risk fixture could not be created.");
  }
  recordPickupFixture(1);

  const beforeHeader = findPickupRecordIncludingDeleted(PICKUP_HEADER_SCHEMA, identity.headerId);
  const beforeDetails = findPickupDetailsIncludingDeleted(identity.headerId);
  const blocked = PickupService().restore(identity.headerId);
  const afterHeader = findPickupRecordIncludingDeleted(PICKUP_HEADER_SCHEMA, identity.headerId);
  const afterDetails = findPickupDetailsIncludingDeleted(identity.headerId);
  if (blocked.success || JSON.stringify(beforeHeader) !== JSON.stringify(afterHeader) || JSON.stringify(beforeDetails) !== JSON.stringify(afterDetails)) {
    throw new Error("Ambiguous Pickup restore must fail before mutating rows.");
  }
}

function testReturnIntegrityRejectsMismatchedPair() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture);
  let deleted = false;

  try {
    if (!RepositoryWriter.update(RETURN_SCHEMA, row.ID, {
      [RETURN_FIELDS.PICKUP_ID]: "PH_TEST_MISMATCH",
    })) {
      throw new Error("Return mismatch fixture could not be prepared.");
    }
    if (ReturnService().findById(row.ID).success) {
      throw new Error("Return findById must reject a mismatched relation pair.");
    }
    if (ReturnService().update(row.ID, { [RETURN_FIELDS.DATE]: row.Tanggal }).success) {
      throw new Error("Return date-only update must reject a mismatched relation pair.");
    }
    if (ReturnService().update(row.ID, { [RETURN_FIELDS.QTY]: row.Qty }).success) {
      throw new Error("Return Qty update must reject a mismatched relation pair.");
    }
    if (!ReturnService().remove(row.ID).success) {
      throw new Error("Return remove must remain available for invalid history.");
    }
    deleted = true;
    if (ReturnService().restore(row.ID).success) {
      throw new Error("Return restore must reject a mismatched relation pair.");
    }
  } finally {
    RepositoryWriter.update(RETURN_SCHEMA, row.ID, {
      [RETURN_FIELDS.PICKUP_ID]: row[RETURN_FIELDS.PICKUP_ID],
    });
    if (!deleted) cleanupReturnTestRow(row);
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
    Logger.log(
      "SKIPPED: no active Pickup Detail is available for Return tests.",
    );

    return null;
  }

  const header = RepositoryReader.findById(
    PICKUP_HEADER_SCHEMA,
    detail[PICKUP_DETAIL_FIELDS.PICKUP_ID],
  );

  if (!header || header[PICKUP_HEADER_SCHEMA.SYSTEM.IS_ACTIVE] !== true) {
    Logger.log(
      "SKIPPED: Pickup Header for the Return test fixture is inactive.",
    );

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
    Logger.log(
      "SKIPPED: no available Pickup Detail quantity for Return tests.",
    );

    return null;
  }

  return { detail, available };
}

function createReturnTestRow(fixture, qty = 1) {
  const response = ReturnService().createInternal({
    [RETURN_FIELDS.PICKUP_DETAIL_ID]:
      fixture.detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY],

    [RETURN_FIELDS.DATE]: "2026-07-17",

    [RETURN_FIELDS.QTY]: qty,

    [RETURN_FIELDS.NOTE]: "Return test fixture",
  });

  if (!response.success) {
    throw new Error(
      `Unable to create Return test fixture: ${response.message}`,
    );
  }

  Logger.log(
    `Return fixture requiring cleanup: ${response.data[RETURN_SCHEMA.PRIMARY_KEY]}`,
  );

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
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})$/.test(
      value,
    )
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
    throw new Error(
      `Unable to clean up Return test fixture ${id}: ${response.message}`,
    );
  }
}

function testReturnSchemaTableAndPrefix() {
  if (RETURN_SCHEMA.TABLE !== "Returns" || RETURN_SCHEMA.ID_PREFIX !== "RT") {
    throw new Error("Return schema table or ID prefix is invalid.");
  }
}

function testReturnSchemaHeaders() {
  const expected = [
    "ID",
    "PickupID",
    "PickupDetailID",
    "Tanggal",
    "Qty",
    "Keterangan",
    "Deleted",
    "IsActive",
    "CreatedAt",
    "CreatedBy",
    "UpdatedAt",
    "UpdatedBy",
  ];

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
  const expected = [
    "create",
    "createInternal",
    "findAll",
    "findById",
    "findDeleted",
    "remove",
    "restore",
    "update",
  ];

  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    throw new Error("ReturnService public API is invalid.");
  }
}

function returnStatusTrue(value) {
  return (
    value === true ||
    value === 1 ||
    String(value).trim().toLowerCase() === "true"
  );
}

function returnStatusFalse(value) {
  return (
    value === false ||
    value === 0 ||
    String(value).trim().toLowerCase() === "false"
  );
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
    Logger.log(
      "SKIPPED: deleted Return rows already exist; empty result cannot be isolated safely.",
    );
    return;
  }

  if (rows.length !== 0) {
    throw new Error(
      "ReturnService.findDeleted() must return an empty array when no deleted rows exist.",
    );
  }
}

function testReturnFindDeletedOnlyDeleted() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture);
  let removed = false;

  try {
    const response = ReturnService().remove(row.ID);
    if (!response.success)
      throw new Error("Return fixture could not be deleted.");
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
        throw new Error(
          "Return status compatibility fixture could not be updated.",
        );
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

function returnDisplayFixtureOptions(overrides) {
  const fixture = Object.assign(
    {
      returns: [
        {
          ID: "RT-DISPLAY-1",
          PickupID: "PH-DISPLAY-1",
          PickupDetailID: "PD-DISPLAY-1",
          Tanggal: "2026-07-21",
          Qty: 1.25,
          Keterangan: "Display fixture",
          Deleted: false,
          IsActive: true,
        },
      ],
      pickupDetails: [
        {
          ID: "PD-DISPLAY-1",
          PickupID: "PH-DISPLAY-1",
          ProductID: "PR-DISPLAY-1",
          Qty: 3.5,
          Deleted: true,
          IsActive: false,
        },
      ],
      pickupHeaders: [
        {
          ID: "PH-DISPLAY-1",
          Tanggal: "2026-07-20",
          PartnerID: "PT-DISPLAY-1",
          Deleted: true,
          IsActive: false,
        },
      ],
      products: [
        {
          ID: "PR-DISPLAY-1",
          Nama: "Produk historis",
          Deleted: true,
          IsActive: false,
        },
      ],
      partners: [
        {
          ID: "PT-DISPLAY-1",
          Nama: "Mitra historis",
          Deleted: true,
          IsActive: false,
        },
      ],
    },
    overrides || {},
  );
  const reads = Object.create(null);

  return {
    fixture,
    reads,
    options: {
      readActiveReturns() {
        return fixture.returns;
      },
      readPhysicalRows(schema) {
        reads[schema.NAME] = (reads[schema.NAME] || 0) + 1;

        if (schema === RETURN_SCHEMA) return fixture.returns;
        if (schema === PICKUP_DETAIL_SCHEMA) return fixture.pickupDetails;
        if (schema === PICKUP_HEADER_SCHEMA) return fixture.pickupHeaders;
        if (schema === PRODUCT_SCHEMA) return fixture.products;
        if (schema === PARTNER_SCHEMA) return fixture.partners;
        throw new Error(`Unexpected display fixture schema: ${schema.NAME}`);
      },
    },
  };
}

function assertReturnDisplayFields(row) {
  if (
    row.ProductID !== "PR-DISPLAY-1" ||
    row.ProductName !== "Produk historis" ||
    row.PartnerID !== "PT-DISPLAY-1" ||
    row.PartnerName !== "Mitra historis"
  ) {
    throw new Error("Return relationship display fields were not resolved.");
  }
}

function testReturnDisplayActiveAndHistoricalResolution() {
  const setup = returnDisplayFixtureOptions();
  const active = ReturnService(setup.options).findAll();

  if (!active.success || active.data.length !== 1) {
    throw new Error("Active Return display response is invalid.");
  }

  const activeRow = active.data[0];
  assertReturnDisplayFields(activeRow);

  if (
    activeRow.ID !== "RT-DISPLAY-1" ||
    activeRow.PickupID !== "PH-DISPLAY-1" ||
    activeRow.PickupDetailID !== "PD-DISPLAY-1" ||
    activeRow.Qty !== 1.25 ||
    activeRow.PickupDate !== "2026-07-20" ||
    activeRow.PickupDetailQty !== 3.5
  ) {
    throw new Error("Return source fields changed during display enrichment.");
  }

  setup.fixture.returns[0].Deleted = true;
  setup.fixture.returns[0].IsActive = false;
  const deleted = ReturnService(setup.options).findDeleted();

  if (!deleted.success || deleted.data.length !== 1) {
    throw new Error("Deleted Return disappeared during display enrichment.");
  }

  assertReturnDisplayFields(deleted.data[0]);
}

function testReturnDisplayMissingRelationshipFallbacks() {
  const missingMaster = returnDisplayFixtureOptions({
    products: [],
    partners: [],
  });
  const masterRow = ReturnService(missingMaster.options).findAll().data[0];

  if (
    masterRow.ProductName !== "Produk tidak ditemukan" ||
    masterRow.PartnerName !== "Mitra tidak ditemukan"
  ) {
    throw new Error("Missing Product or Partner fallback is invalid.");
  }

  const missingRelations = returnDisplayFixtureOptions({
    pickupDetails: [],
    pickupHeaders: [],
  });
  missingRelations.fixture.returns[0].Deleted = true;
  missingRelations.fixture.returns[0].IsActive = false;
  const relationRows = ReturnService(missingRelations.options).findDeleted();
  const relationRow = relationRows.data[0];

  if (
    relationRows.data.length !== 1 ||
    relationRow.ProductID !== "" ||
    relationRow.PartnerID !== "" ||
    relationRow.ProductName !==
      "Produk tidak tersedia karena detail Pickup tidak ditemukan" ||
    relationRow.PartnerName !==
      "Mitra tidak tersedia karena Pickup tidak ditemukan"
  ) {
    throw new Error("Missing historical relationship fallback is invalid.");
  }
}

function testReturnDisplayMismatchPreservesStoredRelationship() {
  const setup = returnDisplayFixtureOptions();
  setup.fixture.pickupDetails[0].PickupID = "PH-OTHER";
  setup.fixture.returns[0].Deleted = true;
  setup.fixture.returns[0].IsActive = false;
  const response = ReturnService(setup.options).findDeleted();

  if (
    !response.success ||
    response.data.length !== 1 ||
    response.data[0].PickupID !== "PH-DISPLAY-1" ||
    response.data[0].PickupDetailID !== "PD-DISPLAY-1"
  ) {
    throw new Error("Return relationship mismatch changed or hid the row.");
  }
}

function testReturnDisplayBatchReadsAndDeterminism() {
  const setup = returnDisplayFixtureOptions();
  setup.fixture.returns.push(
    Object.assign({}, setup.fixture.returns[0], { ID: "RT-DISPLAY-2" }),
  );
  const first = ReturnService(setup.options).findAll();

  ["PickupDetail", "PickupHeader", "Product", "Partner"].forEach((name) => {
    if (setup.reads[name] !== 1) {
      throw new Error(`${name} must be physically read once per list request.`);
    }
  });

  const secondSetup = returnDisplayFixtureOptions({
    returns: setup.fixture.returns,
  });
  const second = ReturnService(secondSetup.options).findAll();

  if (JSON.stringify(first.data) !== JSON.stringify(second.data)) {
    throw new Error("Return display enrichment is not deterministic.");
  }
}

function testReturnDeletedBatchEligibilityReads() {
  const setup = returnDisplayFixtureOptions();
  setup.fixture.returns[0].Deleted = true;
  setup.fixture.returns[0].IsActive = false;
  setup.fixture.returns.push(Object.assign({}, setup.fixture.returns[0], { ID: "RT-DISPLAY-2" }));
  setup.fixture.pickupDetails[0].Deleted = false;
  setup.fixture.pickupDetails[0].IsActive = true;
  setup.fixture.pickupHeaders[0].Deleted = false;
  setup.fixture.pickupHeaders[0].IsActive = true;

  const before = JSON.stringify(setup.fixture);
  const response = ReturnService(setup.options).findDeleted();

  if (!response.success || response.data.length !== 2 || response.data.some((row) => row.canRestore !== true)) {
    throw new Error("Shared safe Pickup dependencies did not produce restorable deleted Returns.");
  }
  ["Return", "PickupDetail", "PickupHeader", "Product", "Partner"].forEach((name) => {
    if (setup.reads[name] !== 1) throw new Error(`${name} must be physically read once per deleted Return request.`);
  });
  if (JSON.stringify(setup.fixture) !== before) throw new Error("Deleted Return batch eligibility mutated source rows.");
  if (response.data.some((row) => !Array.isArray(row.restoreIssues) || row.restoreReason !== "Aman direstore karena seluruh referensi tersedia.")) {
    throw new Error("Deleted Return eligibility response shape changed.");
  }

  const missing = returnDisplayFixtureOptions({ pickupHeaders: [] });
  missing.fixture.returns[0].Deleted = true;
  missing.fixture.returns[0].IsActive = false;
  const missingRow = ReturnService(missing.options).findDeleted().data[0];
  if (missingRow.canRestore !== false || missingRow.restoreIssues[0] !== "Pickup terkait tidak ditemukan.") throw new Error("Missing Pickup must block Return restore deterministically.");

  const deleted = returnDisplayFixtureOptions();
  deleted.fixture.returns[0].Deleted = true;
  deleted.fixture.returns[0].IsActive = false;
  const deletedRow = ReturnService(deleted.options).findDeleted().data[0];
  if (deletedRow.canRestore !== false || deletedRow.restoreIssues[0] !== "Pickup terkait masih berada di data terhapus.") throw new Error("Deleted Pickup must block Return restore deterministically.");
}

function testPickupReturnAggregatePhaseRegistration() {
  const pickup = PICKUP_ACCEPTANCE_PHASES().map((phase) => phase.runner)
    .concat("runPickupAcceptanceMetaTests");
  const returns = runReturnModuleAcceptance.toString();
  const expectedPickup = ["runPickupReadAcceptance", "runPickupValidationAcceptance", "runPickupMutationAcceptance", "runPickupRestoreAcceptance", "runPickupAcceptanceMetaTests"];
  const expectedReturn = ["runReturnSchemaTests", "runReturnValidationTests", "runReturnControllerTests", "runReturnDisplayEnrichmentTests", "runReturnDeletedListTests", "runReturnRestoreValidationTests", "runReturnWriteTests", "runReturnConcurrencyGuardTests", "runPickupReturnIntegrityGuardTests", "runPickupReturnIntegrityDiagnosticTests"];

  if (pickup.join("|") !== expectedPickup.join("|")) throw new Error(`Pickup acceptance registration/order mismatch: ${pickup.join(", ")}.`);
  if (new Set(pickup).size !== pickup.length) throw new Error("Pickup acceptance contains duplicate phase registration.");
  expectedReturn.forEach((name) => {
    if ((returns.match(new RegExp(`${name}\\(\\)`, "g")) || []).length !== 1) throw new Error(`${name} must be registered once in Return acceptance.`);
  });
}

function testReturnDisplayEmptyListsAndReadOnlyStructure() {
  const setup = returnDisplayFixtureOptions({ returns: [] });
  const active = ReturnService(setup.options).findAll();
  const deleted = ReturnService(setup.options).findDeleted();

  if (
    !active.success ||
    active.data.length !== 0 ||
    !deleted.success ||
    deleted.data.length !== 0
  ) {
    throw new Error("Empty Return display lists must succeed.");
  }

  const source = ReturnService.toString();
  const readSection = source.slice(
    source.indexOf("function findAll"),
    source.indexOf("function create(document)"),
  );

  if (/RepositoryWriter|RepositoryCache\.clear|\.update\(|\.insert\(/.test(readSection)) {
    throw new Error("Return display read paths must perform zero writes.");
  }

  if (!/resolvePickup\([\s\S]*storedPickupId !== pickupId/.test(source)) {
    throw new Error("Return findById relationship mismatch guard was weakened.");
  }
}

function testReturnCreateMissingDocument() {
  if (ReturnService().create(null).success)
    throw new Error("Return create must reject a missing document.");
}

function testReturnCreateMissingPickupDetailId() {
  if (ReturnService().createInternal({ Tanggal: "2026-07-17", Qty: 1 }).success)
    throw new Error("Return create must require PickupDetailID.");
}

function testReturnCreateMissingTanggal() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  if (
    ReturnService().createInternal({ PickupDetailID: fixture.detail.ID, Qty: 1 })
      .success
  )
    throw new Error("Return create must require Tanggal.");
}

function testReturnCreateInvalidQty() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  if (
    ReturnService().createInternal({
      PickupDetailID: fixture.detail.ID,
      Tanggal: "2026-07-17",
      Qty: 0,
    }).success
  )
    throw new Error("Return create must reject invalid Qty.");
}

function testReturnCreateUnknownPickupDetail() {
  if (
    ReturnService().createInternal({
      PickupDetailID: "PD_UNKNOWN",
      Tanggal: "2026-07-17",
      Qty: 1,
    }).success
  )
    throw new Error("Return create must reject an unknown Pickup Detail.");
}

function testReturnUpdateMissingId() {
  if (ReturnService().update("", {}).success)
    throw new Error("Return update must require ID.");
}

function testReturnRemoveMissingId() {
  if (ReturnService().remove("").success)
    throw new Error("Return remove must require ID.");
}

function testReturnRestoreMissingId() {
  if (ReturnService().restore("").success)
    throw new Error("Return restore must require ID.");
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

function expenseTestDocument(changes) {
  return Object.assign(
    {
      Tanggal: "2026-07-18",
      Kategori: `Expense Test ${new Date().getTime()}_${Math.floor(Math.random() * 100000)}`,
      Keterangan: "Controlled Expense fixture",
      Nominal: 10,
    },
    changes || {},
  );
}

function expenseRawById(id) {
  return (
    RepositoryBase.mapRows(
      EXPENSE_SCHEMA,
      RepositoryReader.raw(EXPENSE_SCHEMA),
    ).find((row) => row.ID === id) || null
  );
}

function expenseAssertFailure(response, message) {
  if (!response || response.success !== false || response.data !== null)
    throw new Error(message);
}

function expenseCalendarDate(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, APP_CONFIG.TIMEZONE, "yyyy-MM-dd");
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? ""
    : Utilities.formatDate(timestamp, APP_CONFIG.TIMEZONE, "yyyy-MM-dd");
}

function expenseWithFixture(test, document) {
  let row = null;
  try {
    const response = ExpenseService().create(document || expenseTestDocument());
    if (!response.success)
      throw new Error(`Could not create Expense fixture: ${response.message}`);
    row = response.data;
    test(row);
  } finally {
    if (row) {
      const stored = expenseRawById(row.ID);
      if (stored) {
        RepositoryWriter.update(EXPENSE_SCHEMA, row.ID, {
          Tanggal: row.Tanggal,
          Kategori: row.Kategori,
          Keterangan: row.Keterangan,
          Nominal: row.Nominal,
          Deleted: false,
          IsActive: true,
        });
        ExpenseService().remove(row.ID);
      }
      Logger.log(`CLEANUP: Expense fixture ${row.ID} is soft-deleted.`);
    }
  }
}

function testExpenseServicePublicApi() {
  const actual = Object.keys(ExpenseService()).sort();
  const expected = [
    "create",
    "findAll",
    "findById",
    "findDeleted",
    "remove",
    "restore",
    "statistics",
    "update",
  ].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error("ExpenseService public API is invalid.");
}

function testExpenseValidationAndNormalization() {
  expenseAssertFailure(
    ExpenseService().create(null),
    "Expense create must require an object.",
  );
  [NaN, Infinity, -Infinity, -1].forEach((value) =>
    expenseAssertFailure(
      ExpenseService().create(expenseTestDocument({ Nominal: value })),
      "Invalid Nominal must be rejected.",
    ),
  );
  expenseAssertFailure(
    ExpenseService().create(expenseTestDocument({ Tanggal: "2026-02-30" })),
    "Invalid date must fail.",
  );
  expenseAssertFailure(
    ExpenseService().create(expenseTestDocument({ Tanggal: "invalid date" })),
    "Invalid date text must fail.",
  );
  expenseAssertFailure(
    ExpenseService().create(
      expenseTestDocument({ Tanggal: "2026-02-30T00:00:00.000Z" }),
    ),
    "Invalid ISO calendar date must fail.",
  );
  expenseAssertFailure(
    ExpenseService().create(expenseTestDocument({ Tanggal: new Date("invalid") })),
    "Invalid Date object must fail.",
  );
  expenseAssertFailure(
    ExpenseService().create(expenseTestDocument({ Kategori: "  " })),
    "Blank Kategori must fail.",
  );
  expenseAssertFailure(
    ExpenseService().create(expenseTestDocument({ Keterangan: "  " })),
    "Blank Keterangan must fail.",
  );

  [
    { input: "2026-07-20", expected: "2026-07-20", label: "date-only" },
    {
      input: new Date(2026, 6, 20),
      expected: "2026-07-20",
      label: "native Date",
    },
    {
      input: "2026-07-19T17:00:00.000Z",
      expected: "2026-07-20",
      label: "ISO timestamp",
    },
  ].forEach((sample) => {
    expenseWithFixture((row) => {
      if (expenseCalendarDate(row.Tanggal) !== sample.expected) {
        throw new Error(`Expense ${sample.label} normalization failed.`);
      }
    }, expenseTestDocument({ Tanggal: sample.input }));
  });
}

function testExpenseCreateNormalization() {
  [
    { input: 0, expected: 0 },
    { input: 10.75, expected: 10.75 },
    { input: "12.5", expected: 12.5 },
  ].forEach((sample) =>
    expenseWithFixture(
      (row) => {
        if (row.Nominal !== sample.expected || typeof row.Nominal !== "number")
          throw new Error("Nominal normalization failed.");
      },
      expenseTestDocument({ Nominal: sample.input }),
    ),
  );
}

function testExpenseUpdateValidationAndNormalization() {
  expenseAssertFailure(
    ExpenseService().update("", {}),
    "Expense update must require ID.",
  );
  expenseWithFixture((row) => {
    expenseAssertFailure(
      ExpenseService().update(row.ID, { ID: "EX_OTHER" }),
      "Update must require an editable field.",
    );
    const response = ExpenseService().update(row.ID, {
      Kategori: " Updated ",
      Nominal: "17.25",
    });
    if (
      !response.success ||
      response.data.Kategori !== "Updated" ||
      response.data.Nominal !== 17.25 ||
      typeof response.data.Nominal !== "number"
    ) {
      throw new Error("Expense update normalization failed.");
    }
  });
}

function testExpenseSoftDeleteAndActiveReads() {
  expenseWithFixture((row) => {
    RepositoryWriter.update(EXPENSE_SCHEMA, row.ID, { IsActive: false });
    if (
      ExpenseService()
        .findAll()
        .data.some((item) => item.ID === row.ID) ||
      ExpenseService().findById(row.ID).success
    ) {
      throw new Error("Inactive Expense appeared in active reads.");
    }
    expenseAssertFailure(
      ExpenseService().remove(row.ID),
      "Inactive Expense remove must fail.",
    );
    RepositoryWriter.update(EXPENSE_SCHEMA, row.ID, { IsActive: true });
    if (!ExpenseService().remove(row.ID).success)
      throw new Error("Expense soft delete failed.");
    const stored = expenseRawById(row.ID);
    if (!stored || stored.Deleted !== true || stored.IsActive !== false)
      throw new Error("Soft-delete state is invalid.");
  });
}

function testExpenseFindDeleted() {
  const emptyShape = ExpenseService().findDeleted();
  if (!emptyShape.success || !Array.isArray(emptyShape.data))
    throw new Error("findDeleted response is invalid.");
  expenseWithFixture((row) => {
    if (
      ExpenseService()
        .findDeleted()
        .data.some((item) => item.ID === row.ID)
    )
      throw new Error("Active Expense appeared in Trash.");
    ExpenseService().remove(row.ID);
    const deleted = ExpenseService().findDeleted().data;
    if (
      !deleted.some((item) => item.ID === row.ID) ||
      deleted.some((item) => item.Deleted !== true)
    )
      throw new Error("findDeleted filtering failed.");
  });
}

function testExpenseRestoreValid() {
  [
    { input: new Date(2026, 6, 20), label: "native Date" },
    { input: "2026-07-20", label: "date-only string" },
  ].forEach((sample) => {
    expenseWithFixture((row) => {
      const before = expenseRawById(row.ID);
      const expectedDate = expenseCalendarDate(before.Tanggal);
      const expectedCategory = before.Kategori;
      const expectedDescription = before.Keterangan;
      const expectedAmount = before.Nominal;

      ExpenseService().remove(row.ID);
      const response = ExpenseService().restore(row.ID);
      const restored = expenseRawById(row.ID);

      if (
        !response.success ||
        response.data.Deleted !== false ||
        response.data.IsActive !== true
      ) {
        throw new Error(`Expense restore failed for ${sample.label}.`);
      }

      if (
        expenseCalendarDate(restored.Tanggal) !== expectedDate ||
        restored.Kategori !== expectedCategory ||
        restored.Keterangan !== expectedDescription ||
        restored.Nominal !== expectedAmount
      ) {
        throw new Error(
          `Expense restore changed business fields for ${sample.label}.`,
        );
      }
    }, expenseTestDocument({ Tanggal: sample.input }));
  });
}

function testExpenseRestoreRejectsInvalidStates() {
  expenseWithFixture((row) => {
    expenseAssertFailure(
      ExpenseService().restore(row.ID),
      "Restore must reject active Expense.",
    );
    RepositoryWriter.update(EXPENSE_SCHEMA, row.ID, { IsActive: false });
    expenseAssertFailure(
      ExpenseService().restore(row.ID),
      "Restore must reject inactive non-deleted Expense.",
    );
  });
}

function testExpenseRestoreRejectsInvalidStoredRow() {
  expenseWithFixture((row) => {
    ExpenseService().remove(row.ID);
    RepositoryWriter.update(EXPENSE_SCHEMA, row.ID, { Nominal: "invalid" });
    expenseAssertFailure(
      ExpenseService().restore(row.ID),
      "Restore must reject invalid stored Expense.",
    );
  });
}

function testExpenseStatisticsAndDashboardCompatibility() {
  const response = ExpenseService().statistics();
  const data = response && response.data;
  if (
    !response ||
    !response.success ||
    !data ||
    [data.total, data.active, data.inactive].some(
      (value) => typeof value !== "number",
    ) ||
    data.total !== data.active + data.inactive
  ) {
    throw new Error("Expense statistics shape is invalid.");
  }
  expenseWithFixture((row) => {
    const baseline = ExpenseService().statistics().data;
    RepositoryWriter.update(EXPENSE_SCHEMA, row.ID, { IsActive: false });
    const inactive = ExpenseService().statistics().data;
    if (
      inactive.total !== baseline.total ||
      inactive.active !== baseline.active - 1 ||
      inactive.inactive !== baseline.inactive + 1
    )
      throw new Error("Inactive statistics failed.");
    RepositoryWriter.update(EXPENSE_SCHEMA, row.ID, { IsActive: true });
    ExpenseService().remove(row.ID);
    if (ExpenseService().statistics().data.total !== baseline.total - 1)
      throw new Error("Deleted Expense was counted.");
  });
}

function assertReturnRestoreRejectsInactiveRelation(relation) {
  const transaction = createPickupUpdateTestTransaction(1);
  if (!transaction) return;
  const detail = transaction.details[0];
  const fixture = {
    detail,
    available: Number(detail[PICKUP_DETAIL_FIELDS.QTY]),
  };
  const row = createReturnTestRow(fixture);
  const schema =
    relation === "header" ? PICKUP_HEADER_SCHEMA : PICKUP_DETAIL_SCHEMA;
  const id =
    relation === "header"
      ? transaction.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]
      : detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY];
  let relationDeleted = false;

  try {
    if (!ReturnService().remove(row.ID).success) {
      throw new Error(
        "Return fixture could not be deleted before restore validation.",
      );
    }

    if (!RepositoryWriter.softDelete(schema, id)) {
      throw new Error(`Pickup ${relation} fixture could not be deactivated.`);
    }
    relationDeleted = true;

    if (ReturnService().restore(row.ID).success) {
      throw new Error(
        `Return restore must reject an inactive Pickup ${relation}.`,
      );
    }
  } finally {
    if (relationDeleted && !RepositoryWriter.restore(schema, id)) {
      throw new Error(
        `Pickup ${relation} fixture could not be restored after validation.`,
      );
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
    if (row[RETURN_SCHEMA.SYSTEM.IS_DELETED] !== false)
      throw new Error("Created Return must not be deleted.");
    if (row[RETURN_SCHEMA.SYSTEM.IS_ACTIVE] !== true)
      throw new Error("Created Return must be active.");
    if (!row[RETURN_SCHEMA.PRIMARY_KEY])
      throw new Error("Created Return must have an ID.");
    if (
      row[RETURN_FIELDS.PICKUP_ID] !==
      fixture.detail[PICKUP_DETAIL_FIELDS.PICKUP_ID]
    )
      throw new Error("Created Return has an invalid PickupID.");
    if (
      row[RETURN_FIELDS.PICKUP_DETAIL_ID] !==
      fixture.detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY]
    )
      throw new Error("Created Return has an invalid PickupDetailID.");
    if (normalizeReturnTestDate(row[RETURN_FIELDS.DATE]) !== "2026-07-17")
      throw new Error("Created Return has an invalid Tanggal.");
    if (Number(row[RETURN_FIELDS.QTY]) !== 1)
      throw new Error("Created Return has an invalid Qty.");
  } finally {
    cleanupReturnTestRow(row);
  }
}

function testReturnCreateDerivesPickupId() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture);

  try {
    if (
      row[RETURN_FIELDS.PICKUP_ID] !==
      fixture.detail[PICKUP_DETAIL_FIELDS.PICKUP_ID]
    )
      throw new Error("Return did not derive PickupID.");
  } finally {
    cleanupReturnTestRow(row);
  }
}

function testReturnCreateRejectsOverQuantity() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const response = ReturnService().createInternal({
    PickupDetailID: fixture.detail.ID,
    Tanggal: "2026-07-17",
    Qty: fixture.available + 1,
  });
  if (response.success)
    throw new Error("Return create must reject over quantity.");
}

function testReturnCreateUsesCumulativeQuantity() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const first = createReturnTestRow(fixture, fixture.available);

  try {
    const response = ReturnService().createInternal({
      PickupDetailID: fixture.detail.ID,
      Tanggal: "2026-07-17",
      Qty: 1,
    });
    if (response.success)
      throw new Error("Return create must enforce cumulative quantity.");
  } finally {
    cleanupReturnTestRow(first);
  }
}

function testReturnUpdateValid() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture);

  try {
    const response = ReturnService().update(row.ID, {
      Tanggal: "2026-07-18",
      Qty: 1,
      Keterangan: "Updated",
    });
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
    const response = ReturnService().update(row.ID, {
      PickupID: "PH_CHANGED",
      PickupDetailID: "PD_CHANGED",
      Qty: 1,
    });
    if (
      !response.success ||
      response.data.PickupID !== row.PickupID ||
      response.data.PickupDetailID !== row.PickupDetailID
    )
      throw new Error("Return update changed immutable relations.");
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
    if (!response.success)
      throw new Error("Return update double-counted its own Qty.");
  } finally {
    cleanupReturnTestRow(row);
  }
}

function testReturnUpdateRejectsOverQuantity() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture);

  try {
    const response = ReturnService().update(row.ID, {
      Qty: fixture.available + 1,
    });
    if (response.success)
      throw new Error("Return update must reject over quantity.");
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
    if (!response.success)
      throw new Error("Return remove should release quantity.");
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
      ReturnService()
        .findAll()
        .data.some((item) => item.ID === row.ID)
    ) {
      throw new Error(
        "Return remove did not produce the required soft-delete state.",
      );
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
    if (!removed.success)
      throw new Error(
        "Return remove should succeed before restore validation.",
      );
    deletedRowRemoved = true;
    active = createReturnTestRow(fixture, fixture.available);
    const response = ReturnService().restore(deleted.ID);
    if (response.success)
      throw new Error("Return restore must reject over quantity.");
  } finally {
    cleanupReturnTestRow(active);
    if (!deletedRowRemoved) cleanupReturnTestRow(deleted);
  }
}

function testReturnMutationLockTimeoutIsControlledAndWriteFree() {
  let released = false;
  let timeout = null;
  const before = JSON.stringify(RepositoryReader.raw(RETURN_SCHEMA));
  const service = ReturnService({
    getMutationLock() {
      return {
        tryLock(value) {
          timeout = value;
          return false;
        },
        releaseLock() {
          released = true;
        },
      };
    },
  });
  const response = service.restore("RT_LOCK_TIMEOUT_TEST");
  const after = JSON.stringify(RepositoryReader.raw(RETURN_SCHEMA));

  if (
    response.success ||
    response.message !== "Proses retur sedang digunakan. Silakan coba lagi."
  ) {
    throw new Error("Return lock timeout must return a controlled failure.");
  }
  if (timeout !== 10000 || released) {
    throw new Error("Return lock timeout behavior is invalid.");
  }
  if (before !== after) {
    throw new Error("Return lock timeout must perform zero writes.");
  }
}

function testReturnSequentialRestoresRevalidateCumulativeQty() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const first = createReturnTestRow(fixture, fixture.available);
  let second = null;
  let firstRestored = false;

  try {
    if (!ReturnService().remove(first.ID).success) {
      throw new Error("First Return concurrency fixture could not be deleted.");
    }
    second = createReturnTestRow(fixture, fixture.available);
    if (!ReturnService().remove(second.ID).success) {
      throw new Error("Second Return concurrency fixture could not be deleted.");
    }

    const firstResponse = ReturnService().restore(first.ID);
    firstRestored = firstResponse.success;
    const secondResponse = ReturnService().restore(second.ID);

    if (!firstResponse.success || secondResponse.success) {
      throw new Error("Sequential restores reused a stale quantity snapshot.");
    }
  } finally {
    if (firstRestored) cleanupReturnTestRow(first);
  }
}

function testReturnCreateThenRestoreRevalidatesCumulativeQty() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const deleted = createReturnTestRow(fixture, fixture.available);
  let active = null;

  try {
    if (!ReturnService().remove(deleted.ID).success) {
      throw new Error("Return restore fixture could not be deleted.");
    }
    active = createReturnTestRow(fixture, fixture.available);

    if (ReturnService().restore(deleted.ID).success) {
      throw new Error("Create plus restore exceeded cumulative Return Qty.");
    }
  } finally {
    cleanupReturnTestRow(active);
  }
}

function testReturnUpdateThenRestoreRevalidatesCumulativeQty() {
  const fixture = returnTestFixture();
  if (!fixture || fixture.available < 2) return;
  const deleted = createReturnTestRow(fixture, 1);
  let active = null;

  try {
    if (!ReturnService().remove(deleted.ID).success) {
      throw new Error("Return restore fixture could not be deleted.");
    }
    active = createReturnTestRow(fixture, 1);
    const updated = ReturnService().update(active.ID, {
      Qty: fixture.available,
    });

    if (!updated.success || ReturnService().restore(deleted.ID).success) {
      throw new Error("Qty update plus restore exceeded cumulative Return Qty.");
    }
  } finally {
    cleanupReturnTestRow(active);
  }
}

function testReturnConcurrencyLockStructure() {
  const source = ReturnService.toString();
  const helper = source.slice(
    source.indexOf("function withReturnMutationLock"),
    source.indexOf("function createLocked"),
  );
  const create = source.slice(source.indexOf("function create(document)"), source.indexOf("function update(id, document)"));
  const update = source.slice(source.indexOf("function update(id, document)"), source.indexOf("function remove(id)"));
  const remove = source.slice(source.indexOf("function remove(id)"), source.indexOf("function restore(id)"));
  const restore = source.slice(source.indexOf("function restore(id)"), source.indexOf("return Object.freeze", source.indexOf("function restore(id)")));
  const createLocked = source.slice(source.indexOf("function createLocked"), source.indexOf("const base ="));
  const updateValidation = source.slice(source.indexOf("beforeUpdate(id, data)"), source.indexOf("afterUpdate(data)"));
  const restoreValidation = source.slice(source.indexOf("beforeRestore(id)"), source.indexOf("afterRestore(id)"));

  if (
    !/tryLock\(RETURN_MUTATION_LOCK_TIMEOUT_MS\)/.test(helper) ||
    !/try\s*\{[\s\S]*callback\(\)[\s\S]*\}\s*finally\s*\{[\s\S]*releaseLock\(\)/.test(helper) ||
    helper.indexOf("RepositoryCache.clear(RETURN_SCHEMA)") >
      helper.indexOf("releaseLock()")
  ) {
    throw new Error("Return mutation lock structure is invalid.");
  }

  const paths = [
    { name: "create", source: create, reread: /createLocked\(/, mutation: /createLocked\(/ },
    { name: "update", source: update, reread: /activeReturn\(id\)/, mutation: /base\.update\(/ },
    { name: "delete", source: remove, reread: /activeReturn\(id\)/, mutation: /base\.remove\(id\)/ },
    { name: "restore", source: restore, reread: /deletedReturn\(id\)/, mutation: /base\.restore\(id\)/ },
  ];
  const unlocked = paths.filter((path) => {
    const lockIndex = path.source.indexOf("withReturnMutationLock(() => {");
    const reread = path.source.search(path.reread);
    const mutation = path.source.search(path.mutation);
    return lockIndex < 0 || reread < lockIndex || mutation < reread;
  });

  if (unlocked.length) {
    throw new Error("Return quantity mutation paths are not all locked.");
  }

  function precedes(section, validation, mutation) {
    const validationIndex = section.indexOf(validation);
    const mutationIndex = section.indexOf(mutation);
    return validationIndex >= 0 && mutationIndex >= 0 && validationIndex < mutationIndex;
  }

  if (
    !precedes(createLocked, "resolvePickup(", "RepositoryWriter.insert(") ||
    !precedes(createLocked, "validateAvailableQty(", "RepositoryWriter.insert(") ||
    !precedes(updateValidation, "activeReturn(id)", "validateAvailableQty(") ||
    !precedes(restoreValidation, "deletedReturn(id)", "validateAvailableQty(")
  ) {
    throw new Error("Return quantity validation is not based on authoritative in-lock state.");
  }
}

function testReturnFindByIdResolvedData() {
  const fixture = returnTestFixture();
  if (!fixture) return;
  const row = createReturnTestRow(fixture);

  try {
    const response = ReturnService().findById(row.ID);
    if (
      !response.success ||
      !response.data.return ||
      !response.data.pickupHeader ||
      !response.data.pickupDetail ||
      typeof response.data.availableQty !== "number"
    )
      throw new Error("Return findById response is invalid.");
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
      String(partner[PARTNER_FIELDS.TYPE] || "")
        .trim()
        .toLowerCase() === "supplier"
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
    [PURCHASING_FIELDS.SUPPLIER_ID]: supplier[PARTNER_SCHEMA.PRIMARY_KEY],
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
  const startedAt = Date.now();
  if (typeof activePurchasingFixtureCount === "number") {
    activePurchasingFixtureCount++;
  }
  const suffix = `${new Date().getTime()}_${Math.floor(Math.random() * 100000)}`;
  const partnerResponse = PartnerService().create({
    Nama: `Purchasing Test ${suffix}`,
    Alamat: "Test",
    Telepon: suffix,
    Jenis: partnerType || "Supplier",
  });
  if (!partnerResponse.success)
    throw new Error("Could not create controlled Partner fixture.");

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

  if (typeof activePurchasingFixtureCount === "number") {
    Logger.log(`PURCHASING FIXTURE SETUP: ${Date.now() - startedAt} ms`);
  }
  return { partner: partnerResponse.data, product: productResponse.data };
}

function purchasingCleanupMasterData(fixture) {
  if (!fixture) return;
  const startedAt = Date.now();
  const partner = RepositoryReader.findById(PARTNER_SCHEMA, fixture.partner.ID);
  const product = RepositoryReader.findById(PRODUCT_SCHEMA, fixture.product.ID);
  if (partner) PartnerService().remove(fixture.partner.ID);
  if (product) ProductService().remove(fixture.product.ID);
  if (typeof activePurchasingFixtureCount === "number") {
    Logger.log(`PURCHASING DEPENDENCY CLEANUP: ${Date.now() - startedAt} ms`);
  }
}

function purchasingDocument(fixture, changes) {
  return Object.assign(
    {
      Tanggal: "2026-07-17",
      SupplierID: fixture.partner.ID,
      ProductID: fixture.product.ID,
      Qty: 2,
      Harga: 10,
    },
    changes || {},
  );
}

function purchasingWithFixture(test, partnerType) {
  const fixture = purchasingTestMasterData(partnerType);
  let purchase = null;
  try {
    test(fixture, (row) => {
      purchase = row;
    });
  } finally {
    const cleanupStartedAt = Date.now();
    if (purchase && PurchasingService().findById(purchase.ID).success) {
      PurchasingService().remove(purchase.ID);
    }
    if (purchase) {
      Logger.log(`CLEANUP: Purchasing fixture ${purchase.ID} is soft-deleted.`);
    }
    purchasingCleanupMasterData(fixture);
    if (typeof activePurchasingFixtureCount === "number") {
      Logger.log(`PURCHASING FIXTURE CLEANUP: ${Date.now() - cleanupStartedAt} ms`);
    }
  }
}

function purchasingCreateFixture(fixture, changes) {
  const response = PurchasingService().create(
    purchasingDocument(fixture, changes),
  );
  if (!response.success)
    throw new Error(`Could not create Purchasing fixture: ${response.message}`);
  return response.data;
}

function testPurchasingServicePublicApi() {
  const actual = Object.keys(PurchasingService()).sort();
  const expected = [
    "create",
    "findAll",
    "findById",
    "findDeleted",
    "remove",
    "restore",
    "statistics",
    "update",
  ];
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error("PurchasingService public API is invalid.");
}

function purchasingAssertDeletedResponse(response, context) {
  if (!response?.success || !Array.isArray(response.data)) {
    throw new Error(`${context} must return a successful array response.`);
  }
  if (
    response.data.some(
      (row) =>
        !purchasingAuditDeleted(row.Deleted) ||
        manualPurchasingStatusTrue(row.IsActive),
    )
  ) {
    throw new Error(`${context} returned an active or nondeleted row.`);
  }
  return response.data;
}

function testPurchasingFindDeletedEmpty() {
  const rows = purchasingAssertDeletedResponse(
    PurchasingService().findDeleted(),
    "PurchasingService.findDeleted()",
  );
  if (rows.length)
    Logger.log(
      "SKIPPED: Empty Purchasing Trash assertion requires no existing deleted rows.",
    );
}

function testPurchasingFindDeletedFiltering() {
  purchasingWithFixture((fixture, remember) => {
    const row = purchasingCreateFixture(fixture);
    remember(row);
    const activeRows = purchasingAssertDeletedResponse(
      PurchasingService().findDeleted(),
      "PurchasingService.findDeleted()",
    );
    if (activeRows.some((item) => item.ID === row.ID))
      throw new Error("Active Purchasing fixture appeared in Trash.");
    if (!PurchasingService().remove(row.ID).success)
      throw new Error("Could not soft-delete Purchasing fixture.");
    const deletedRows = purchasingAssertDeletedResponse(
      PurchasingService().findDeleted(),
      "PurchasingService.findDeleted()",
    );
    if (!deletedRows.some((item) => item.ID === row.ID))
      throw new Error("Deleted Purchasing fixture did not appear in Trash.");
  });
}

function testPurchasingFindDeletedResponseShape() {
  const response = PurchasingService().findDeleted();
  purchasingAssertControllerResponse(
    response,
    "PurchasingService.findDeleted()",
  );
  purchasingAssertDeletedResponse(response, "PurchasingService.findDeleted()");
}

function testPurchasingFindDeletedBoundedDependencyReads() {
  const reads = { purchasing: 0, products: 0, partners: 0 };
  const purchases = Array.from({ length: 287 }, (_, index) => ({
    ID: `PC-PERF-${String(index + 1).padStart(3, "0")}`,
    Tanggal: "2026-07-24",
    SupplierID: "PT-PERF-1",
    ProductID: "PR-PERF-1",
    Qty: 1,
    Harga: 1000,
    Total: 1000,
    Deleted: true,
    IsActive: false,
  }));
  const service = PurchasingService({
    readPhysicalRows(schema) {
      if (schema === PURCHASING_SCHEMA) {
        reads.purchasing++;
        return purchases;
      }
      if (schema === PRODUCT_SCHEMA) {
        reads.products++;
        return [{ ID: "PR-PERF-1", Deleted: false, IsActive: true }];
      }
      if (schema === PARTNER_SCHEMA) {
        reads.partners++;
        return [{ ID: "PT-PERF-1", Jenis: "Supplier", Deleted: false, IsActive: true }];
      }
      throw new Error("Unexpected Purchasing performance schema.");
    },
  });
  const startedAt = Date.now();
  const response = service.findDeleted();
  const durationMs = Date.now() - startedAt;
  if (!response.success || response.data.length !== 287) {
    throw new Error("Controlled 287-row Purchasing Deleted fixture was not returned completely.");
  }
  if (reads.purchasing !== 1 || reads.products !== 1 || reads.partners !== 1) {
    throw new Error("Purchasing Deleted must read Purchasing, Product, and Partner once per request.");
  }
  if (response.data.some((row) => row.canRestore !== true || row.restoreIssues.length !== 0)) {
    throw new Error("Purchasing Deleted batching changed safe restore eligibility.");
  }
  Logger.log(`PURCHASING DELETED PERFORMANCE: rows=${response.data.length}, purchasingReads=${reads.purchasing}, productReads=${reads.products}, partnerReads=${reads.partners}, durationMs=${durationMs}`);
}

function testPurchasingStatisticsEmpty() {
  const rows = PurchasingService().findAll();
  if (!rows.success)
    throw new Error("Purchasing findAll failed during empty statistics test.");

  if (rows.data.length !== 0) {
    Logger.log(
      "SKIPPED: Purchasing statistics empty assertion requires no active Purchasing rows.",
    );
    return;
  }

  const response = PurchasingService().statistics();
  if (
    !response.success ||
    response.data.total !== 0 ||
    response.data.active !== 0 ||
    response.data.inactive !== 0
  ) {
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
    throw new Error(
      "Dashboard Purchasing statistics compatibility is missing.",
    );
  }

  const response = service.statistics();
  if (!response || response.success !== true || !response.data) {
    throw new Error(
      "Dashboard Purchasing statistics compatibility response is invalid.",
    );
  }
}

function testPurchasingStatisticsActiveOnly() {
  const fixture = purchasingTestMasterData("Supplier");
  let row = null;

  try {
    const baseline = PurchasingService().statistics();
    if (!baseline.success)
      throw new Error("Could not read Purchasing statistics baseline.");

    row = purchasingCreateFixture(fixture);

    const active = PurchasingService().statistics();
    if (
      !active.success ||
      active.data.total !== baseline.data.total + 1 ||
      active.data.active !== active.data.total ||
      active.data.inactive !== 0
    ) {
      throw new Error("Active Purchasing fixture was not counted correctly.");
    }

    if (
      !RepositoryWriter.update(PURCHASING_SCHEMA, row.ID, {
        [PURCHASING_SCHEMA.SYSTEM.IS_ACTIVE]: false,
      })
    ) {
      throw new Error("Could not make controlled Purchasing fixture inactive.");
    }

    const inactive = PurchasingService().statistics();
    if (
      !inactive.success ||
      inactive.data.total !== baseline.data.total ||
      inactive.data.active !== baseline.data.active ||
      inactive.data.inactive !== 0
    ) {
      throw new Error(
        "Inactive Purchasing fixture was included in statistics.",
      );
    }

    RepositoryWriter.update(PURCHASING_SCHEMA, row.ID, {
      [PURCHASING_SCHEMA.SYSTEM.IS_ACTIVE]: true,
    });

    if (!PurchasingService().remove(row.ID).success) {
      throw new Error("Could not delete controlled Purchasing fixture.");
    }

    const deleted = PurchasingService().statistics();
    if (
      !deleted.success ||
      deleted.data.total !== baseline.data.total ||
      deleted.data.active !== baseline.data.active ||
      deleted.data.inactive !== 0
    ) {
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

      Logger.log(
        `CLEANUP: Purchasing statistics fixture ${row.ID} is soft-deleted.`,
      );
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
  if (typeof response === "string")
    throw new Error("getDeletedPurchasing() must return a plain object.");
  JSON.stringify(response);
  const values = [response];
  while (values.length) {
    const value = values.pop();
    if (value instanceof Date || typeof value === "function")
      throw new Error("Deleted Purchasing response contains an unsafe value.");
    if (value && typeof value === "object")
      Object.keys(value).forEach((key) => values.push(value[key]));
  }
}

function purchasingApiSource() {
  return HtmlService.createHtmlOutputFromFile("965.View.API").getContent();
}

function testPurchasingApiPublicApi() {
  const source = purchasingApiSource();
  const purchasingBlock = source.match(
    /const Purchasing = Object\.freeze\(\{([\s\S]*?)\n\s*\}\);/,
  );

  if (!purchasingBlock) throw new Error("Api.Purchasing namespace was not found.");

  const methods = {
    findAll: 'run("getPurchasing")',
    findDeleted: 'run("getDeletedPurchasing")',
    findById: 'run("getPurchasingById", id)',
    create: 'run("createPurchasing", data)',
    update: 'run("updatePurchasing", id, data)',
    remove: 'run("deletePurchasing", id)',
    restore: 'run("restorePurchasing", id)',
    list: "this.findAll()",
  };

  Object.keys(methods).forEach((name) => {
    const definitions =
      purchasingBlock[1].match(new RegExp(`(?:^|\\n)\\s*${name}\\s*\\(`, "g")) || [];
    if (definitions.length !== 1 || !purchasingBlock[1].includes(methods[name])) {
      throw new Error(`Api.Purchasing.${name} is missing, duplicated, or invalid.`);
    }
  });
}

function testPurchasingApiPromiseTransportBoundary() {
  const source = purchasingApiSource();

  if (
    !/function run\(fn, \.\.\.args\)[\s\S]*return new Promise/.test(source) ||
    !/withSuccessHandler\(\(result\) => \{[\s\S]*resolve\(result\)/.test(source) ||
    !/withFailureHandler\(\(error\) => \{[\s\S]*reject\(error\)/.test(source)
  ) {
    throw new Error("Purchasing browser API transport boundary is invalid.");
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
    throw new Error(
      'updatePurchasing("", null) must return a validation failure.',
    );
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
    throw new Error(
      "Purchasing Controller response must not be a JSON string.",
    );
  }

  while (values.length > 0) {
    const value = values.pop();
    if (value instanceof Date || typeof value === "function") {
      throw new Error(
        "Purchasing Controller response contains an unsafe value.",
      );
    }
    if (!value || typeof value !== "object") continue;
    Object.keys(value).forEach((key) => values.push(value[key]));
  }

  try {
    JSON.stringify(response);
  } catch (error) {
    throw new Error(
      "Purchasing Controller response must be JSON serializable.",
    );
  }

  if (response.meta && response.meta.timestamp instanceof Date) {
    throw new Error(
      "Purchasing Controller meta timestamp must be serializable.",
    );
  }
}

function testPurchasingFindAllActiveOnly() {
  const response = PurchasingService().findAll();
  if (!response.success || !Array.isArray(response.data))
    throw new Error("Purchasing findAll response is invalid.");
  response.data.forEach((row) => {
    if (
      !(
        row.Deleted === false ||
        row.Deleted === 0 ||
        String(row.Deleted).toUpperCase() === "FALSE"
      ) ||
      !(
        row.IsActive === true ||
        row.IsActive === 1 ||
        String(row.IsActive).toUpperCase() === "TRUE"
      )
    ) {
      throw new Error("Purchasing findAll returned a deleted or inactive row.");
    }
  });
}

function testPurchasingFindByIdValidation() {
  purchasingAssertFailure(
    PurchasingService().findById(" "),
    "Purchasing findById must require ID.",
  );
}

function purchasingAssertCreateFailure(changes, message, partnerType) {
  purchasingWithFixture((fixture) => {
    purchasingAssertFailure(
      PurchasingService().create(purchasingDocument(fixture, changes)),
      message,
    );
  }, partnerType);
}

function testPurchasingCreateRequiresTanggal() {
  purchasingAssertCreateFailure({ Tanggal: "" }, "Tanggal must be required.");
}
function testPurchasingCreateRequiresSupplier() {
  purchasingAssertCreateFailure(
    { SupplierID: "" },
    "Supplier must be required.",
  );
}
function testPurchasingCreateRequiresProduct() {
  purchasingAssertCreateFailure({ ProductID: "" }, "Product must be required.");
}
function testPurchasingCreateRejectsQtyZero() {
  purchasingAssertCreateFailure({ Qty: 0 }, "Qty zero must be rejected.");
}
function testPurchasingCreateRejectsQtyNegative() {
  purchasingAssertCreateFailure({ Qty: -1 }, "Negative Qty must be rejected.");
}
function testPurchasingCreateRejectsQtyInfinity() {
  purchasingAssertCreateFailure(
    { Qty: Infinity },
    "Infinite Qty must be rejected.",
  );
}
function testPurchasingCreateRejectsHargaNegative() {
  purchasingAssertCreateFailure(
    { Harga: -1 },
    "Negative Harga must be rejected.",
  );
}
function testPurchasingCreateRejectsHargaInfinity() {
  purchasingAssertCreateFailure(
    { Harga: Infinity },
    "Infinite Harga must be rejected.",
  );
}
function testPurchasingCreateRejectsNonSupplierPartner() {
  purchasingAssertCreateFailure(
    {},
    "Non-Supplier must be rejected.",
    "Customer",
  );
}

function testPurchasingCreateRejectsInactiveSupplier() {
  purchasingWithFixture((fixture) => {
    PartnerService().remove(fixture.partner.ID);
    purchasingAssertFailure(
      PurchasingService().create(purchasingDocument(fixture)),
      "Inactive Supplier must be rejected.",
    );
  });
}

function testPurchasingCreateRejectsInactiveProduct() {
  purchasingWithFixture((fixture) => {
    ProductService().remove(fixture.product.ID);
    purchasingAssertFailure(
      PurchasingService().create(purchasingDocument(fixture)),
      "Inactive Product must be rejected.",
    );
  });
}

function purchasingAssertCreate(changes, assertion) {
  purchasingWithFixture((fixture, remember) => {
    const row = purchasingCreateFixture(fixture, changes);
    remember(row);
    assertion(row);
  });
}

function testPurchasingCreateValid() {
  purchasingAssertCreate({}, (row) => {
    if (!row.ID) throw new Error("Purchasing create did not return an ID.");
  });
}
function testPurchasingCreateDerivesTotal() {
  purchasingAssertCreate({ Qty: 3, Harga: 7 }, (row) => {
    if (row.Total !== 21) throw new Error("Total was not derived.");
  });
}
function testPurchasingCreateIgnoresSuppliedTotal() {
  purchasingAssertCreate({ Qty: 3, Harga: 7, Total: 999 }, (row) => {
    if (row.Total !== 21) throw new Error("Caller Total was trusted.");
  });
}
function testPurchasingCreateAllowsDecimalQty() {
  purchasingAssertCreate({ Qty: 1.5, Harga: 8 }, (row) => {
    if (row.Qty !== 1.5 || row.Total !== 12)
      throw new Error("Decimal Qty failed.");
  });
}

function purchasingAssertUpdate(changes, assertion) {
  purchasingWithFixture((fixture, remember) => {
    const row = purchasingCreateFixture(fixture);
    remember(row);
    const response = PurchasingService().update(row.ID, changes);
    if (!response.success)
      throw new Error(`Purchasing update failed: ${response.message}`);
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
        row[PURCHASING_SCHEMA.PRIMARY_KEY] !==
          original[PURCHASING_SCHEMA.PRIMARY_KEY] ||
        row[PURCHASING_FIELDS.SUPPLIER_ID] !== fixture.partner.ID ||
        row[PURCHASING_FIELDS.PRODUCT_ID] !== fixture.product.ID ||
        Number(row[PURCHASING_FIELDS.QTY]) !== 2 ||
        Number(row[PURCHASING_FIELDS.PRICE]) !== 10 ||
        Number(row[PURCHASING_FIELDS.TOTAL]) !== 20 ||
        row[PURCHASING_SCHEMA.SYSTEM.IS_DELETED] !== false ||
        row[PURCHASING_SCHEMA.SYSTEM.IS_ACTIVE] !== true
      ) {
        throw new Error(
          "Purchasing update did not preserve fixture fields or active state.",
        );
      }
    },
  );
}
function testPurchasingUpdateRecalculatesTotal() {
  purchasingAssertUpdate({ Qty: 4, Harga: 6 }, (row) => {
    if (row.Total !== 24) throw new Error("Update did not recalculate Total.");
  });
}
function testPurchasingUpdateTotalOnlyDoesNotOverride() {
  purchasingAssertUpdate({ Total: 999 }, (row) => {
    if (row.Total !== 20)
      throw new Error("Total-only update overrode derived Total.");
  });
}
function testPurchasingUpdateRejectsInfinity() {
  purchasingWithFixture((fixture, remember) => {
    const row = purchasingCreateFixture(fixture);
    remember(row);
    purchasingAssertFailure(
      PurchasingService().update(row.ID, { Harga: Infinity }),
      "Update must reject Infinity.",
    );
  });
}

function purchasingAssertUpdateRelation(field, relation) {
  purchasingWithFixture((fixture, remember) => {
    const row = purchasingCreateFixture(fixture);
    remember(row);
    if (relation === "supplier") PartnerService().remove(fixture.partner.ID);
    else ProductService().remove(fixture.product.ID);
    purchasingAssertFailure(
      PurchasingService().update(row.ID, {
        [field]:
          field === "SupplierID" ? fixture.partner.ID : fixture.product.ID,
      }),
      "Update must revalidate relations.",
    );
  });
}

function testPurchasingUpdateRevalidatesSupplier() {
  purchasingAssertUpdateRelation("SupplierID", "supplier");
}
function testPurchasingUpdateRevalidatesProduct() {
  purchasingAssertUpdateRelation("ProductID", "product");
}

function testPurchasingRemoveSoftDeleteState() {
  purchasingWithFixture((fixture) => {
    const row = purchasingCreateFixture(fixture);
    if (!PurchasingService().remove(row.ID).success)
      throw new Error("Purchasing remove failed.");
    const stored = RepositoryBase.mapRows(
      PURCHASING_SCHEMA,
      RepositoryReader.raw(PURCHASING_SCHEMA),
    ).find((item) => item.ID === row.ID);
    if (
      !stored ||
      stored.Deleted !== true ||
      stored.IsActive !== false ||
      PurchasingService()
        .findAll()
        .data.some((item) => item.ID === row.ID)
    ) {
      throw new Error("Purchasing remove did not persist soft-delete state.");
    }
    Logger.log(`CLEANUP: Purchasing fixture ${row.ID} is soft-deleted.`);
  });
}

function purchasingAssertRestore(setup, assertion, partnerType) {
  purchasingWithFixture((fixture, remember) => {
    const row = purchasingCreateFixture(fixture);
    remember(row);
    if (!PurchasingService().remove(row.ID).success)
      throw new Error("Could not delete Purchasing fixture.");
    setup(fixture, row);
    const response = PurchasingService().restore(row.ID);
    assertion(response, fixture, row);
  }, partnerType);
}

function testPurchasingRestoreValid() {
  purchasingAssertRestore(
    () => {},
    (response) => {
      if (!response.success) throw new Error("Purchasing restore failed.");
    },
  );
}
function testPurchasingRestoreAlreadyActive() {
  purchasingWithFixture((fixture, remember) => {
    const row = purchasingCreateFixture(fixture);
    remember(row);
    purchasingAssertFailure(
      PurchasingService().restore(row.ID),
      "Restore must reject active rows.",
    );
  });
}
function testPurchasingRestoreRejectsInactiveNonDeleted() {
  purchasingWithFixture((fixture, remember) => {
    const row = purchasingCreateFixture(fixture);
    remember(row);

    if (
      !RepositoryWriter.update(PURCHASING_SCHEMA, row.ID, {
        [PURCHASING_SCHEMA.SYSTEM.IS_ACTIVE]: false,
      })
    ) {
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
function testPurchasingRestoreRejectsInactiveSupplier() {
  purchasingAssertRestore(
    (fixture) => PartnerService().remove(fixture.partner.ID),
    (response) =>
      purchasingAssertFailure(
        response,
        "Restore must reject inactive Supplier.",
      ),
  );
}
function testPurchasingRestoreRejectsNonSupplierPartner() {
  purchasingAssertRestore(
    (fixture) =>
      RepositoryWriter.update(PARTNER_SCHEMA, fixture.partner.ID, {
        Jenis: "Customer",
      }),
    (response) =>
      purchasingAssertFailure(response, "Restore must reject non-Supplier."),
  );
}
function testPurchasingRestoreRejectsInactiveProduct() {
  purchasingAssertRestore(
    (fixture) => ProductService().remove(fixture.product.ID),
    (response) =>
      purchasingAssertFailure(
        response,
        "Restore must reject inactive Product.",
      ),
  );
}
function testPurchasingRestoreRecalculatesTotal() {
  purchasingAssertRestore(
    (fixture, row) =>
      RepositoryWriter.update(PURCHASING_SCHEMA, row.ID, { Total: 999 }),
    (response) => {
      if (!response.success || response.data.Total !== 20)
        throw new Error("Restore did not recalculate Total.");
    },
  );
}

function testReturnUxConsistencySourceContracts() {
  const view = HtmlService.createHtmlOutputFromFile("935.View.Returns").getContent();
  const presenter = HtmlService.createHtmlOutputFromFile("979.View.Returns.Presenter").getContent();
  const app = HtmlService.createHtmlOutputFromFile("994.View.App.Runtime").getContent();
  const events = HtmlService.createHtmlOutputFromFile("993.View.Events.Runtime").getContent();
  const ui = `${view}\n${presenter}\n${app}\n${events}`;

  ["btn-return-add", "inp-return-search", "btn-return-refresh", "tbl-returns", "return-pagination"].forEach((id) => {
    if (view.indexOf(`id="${id}"`) < 0) throw new Error(`Return UX control ${id} is missing.`);
  });
  const headerStart = view.indexOf("data-return-page-header");
  const toolbarStart = view.indexOf("data-return-toolbar");
  const headerActions = /<div[^>]*data-return-header-actions[^>]*>([\s\S]*?)<\/div>/.exec(view)?.[1] || "";
  if (headerStart < 0 || toolbarStart <= headerStart || !/id="btn-return-add"/.test(headerActions) || !/bg-blue-600/.test(headerActions) || !/text-white/.test(headerActions)) throw new Error("Create Return is not the primary header action.");
  if (!/data-return-mode="active"[^>]*>[^<]*<i[^>]*fa-circle-check[^>]*><\/i>Active</.test(view) || !/data-return-mode="deleted"[^>]*>[^<]*<i[^>]*fa-trash-can[^>]*><\/i>Deleted</.test(view) || />Aktif<|>Terhapus</.test(view)) throw new Error("Return Active/Deleted mode selector is invalid.");
  if (/btn-return-trash|return-trash|openReturnTrash|renderReturnTrash|returnTrash/.test(ui)) throw new Error("Obsolete Return Deleted modal path remains.");
  if (!/overflow-x-auto/.test(view) || !/sm:flex-row/.test(view)) throw new Error("Return active page is not narrow-screen safe.");
  if (!/min-w-\[20rem\][^"']*whitespace-normal[^"']*break-words/.test(presenter)) throw new Error("Deleted Return reason column is cramped or truncated.");
  if (!/Status Restore/.test(presenter) || !/Keterangan/.test(presenter) || !/row\?\.restoreReason/.test(presenter)) throw new Error("Deleted Return eligibility explanation is not visible.");
  if (!/row\?\.canRestore===true&&!busy/.test(presenter) || !/data-return-action="restore"/.test(presenter)) throw new Error("Blocked Return Restore is not disabled from server eligibility.");
  if (!/rows\.map\(\(row\) => mode === "deleted" \? renderDeletedRow/.test(presenter)) throw new Error("Return Deleted rows do not render inline.");
  if (!/resetPagination\("returns", next\)/.test(app) || !/request !== returnRequest[^\n]+mode !== state\.returnMode/.test(app)) throw new Error("Return mode reset or stale-response guard is missing.");
  if (/<tr[^>]*\bh-\[/.test(presenter) || /restoreReason[^\n]{0,160}\btruncate\b/.test(presenter)) throw new Error("Return inline rows have a height or reason-truncation regression.");
  if (/data-[^=\s]*(?:purge|hard-delete|permanent-delete)/i.test(ui)) throw new Error("Permanent Return delete UX was introduced.");
  if (/SpreadsheetApp|RepositoryWriter|AuditLogService|AppLogService/.test(ui)) throw new Error("Return UI accesses spreadsheet or audit writers directly.");
  if (/Api\.|google\.script\.run/.test(view)) throw new Error("Return View markup introduced orchestration.");
  if (/Api\.|google\.script\.run|\basync\b|\bawait\b|\bPromise\b|addEventListener|\bToast\.|\bDialog\.|\bModal\.|\bApp\.|\b(?:Service|Controller|Repository|SpreadsheetApp)\b/.test(presenter)) throw new Error("ReturnsPresenter contains orchestration, state ownership, or forbidden access.");
  ["returnMode", "returns", "deletedReturns", "returnSearch", "returnRequest", "returnSubmitting"].forEach((owner) => { if (app.indexOf(owner) < 0) throw new Error(`App does not own Return ${owner}.`); });
  ["Api.Return.list", "Api.Return.findDeleted", "Api.Return.findById", "Api.Return.create", "Api.Return.update", "Api.Return.remove", "Api.Return.restore", "Api.Pickup.findAll", "Api.Pickup.findById"].forEach((call) => { if (app.indexOf(call) < 0) throw new Error(`App Return workflow is missing ${call}.`); });
  if (/\bApi\.|ReturnsPresenter\./.test(events)) throw new Error("Return Events bypass App ownership.");
  ["App.setReturnMode", "App.searchReturns", "App.refreshReturns", "App.openCreateReturn", "App.openEditReturn", "App.viewReturn", "App.deleteReturn", "App.restoreReturn", "App.submitReturnForm"].forEach((intent) => { if (events.indexOf(intent) < 0) throw new Error(`Return Event delegation is missing ${intent}.`); });
}

function testPurchasingUxConsistencySourceContracts() {
  const view = HtmlService.createHtmlOutputFromFile("940.View.Purchasing").getContent();
  const presenter = HtmlService.createHtmlOutputFromFile("978.View.Purchasing.Presenter").getContent();
  const app = HtmlService.createHtmlOutputFromFile("994.View.App.Runtime").getContent();
  const events = HtmlService.createHtmlOutputFromFile("993.View.Events.Runtime").getContent();
  const ui = `${view}\n${presenter}\n${app}\n${events}`;

  ["btn-purchasing-add", "inp-purchasing-search", "btn-purchasing-refresh", "tbl-purchasing", "purchasing-pagination"].forEach((id) => {
    if (view.indexOf(`id="${id}"`) < 0) throw new Error(`Purchasing UX control ${id} is missing.`);
  });
  const headerStart = view.indexOf("data-purchasing-page-header");
  const toolbarStart = view.indexOf("data-purchasing-toolbar");
  const headerActions = /<div[^>]*data-purchasing-header-actions[^>]*>([\s\S]*?)<\/div>/.exec(view)?.[1] || "";
  if (headerStart < 0 || toolbarStart <= headerStart || !/id="btn-purchasing-add"/.test(headerActions) || !/bg-blue-600/.test(headerActions) || !/text-white/.test(headerActions)) throw new Error("Create Purchasing is not the primary header action.");
  if (!/data-purchasing-mode="active"[^>]*>[^<]*<i[^>]*fa-circle-check[^>]*><\/i>Active</.test(view) || !/data-purchasing-mode="deleted"[^>]*>[^<]*<i[^>]*fa-trash-can[^>]*><\/i>Deleted</.test(view) || />Aktif<|>Terhapus</.test(view)) throw new Error("Purchasing Active/Deleted mode selector is invalid.");
  if (/btn-purchasing-trash|purchasing-trash|openTrash|renderTrash|trashRows|trashRequest|loadDeleted|pendingRestore/.test(ui)) throw new Error("Obsolete Purchasing Deleted modal path remains.");
  if (!/overflow-x-auto/.test(view) || !/sm:flex-row/.test(view)) throw new Error("Purchasing active page is not narrow-screen safe.");
  if (!/min-w-\[22rem\][^"']*whitespace-normal[^"']*break-words/.test(presenter)) throw new Error("Deleted Purchasing reason column is cramped or truncated.");
  ["Unit Price", "Total", "Status Restore", "Keterangan"].forEach((label) => { if (presenter.indexOf(label) < 0) throw new Error(`Deleted Purchasing column ${label} is missing.`); });
  if (!/row\?\.canRestore === true && !busy/.test(presenter) || !/row\?\.restoreReason/.test(presenter)) throw new Error("Purchasing Restore eligibility is not rendered from the server contract.");
  if (!/rows\.map\(\(row\) => mode === "deleted" \? renderDeletedRow/.test(presenter) || !/data-purchasing-action="restore"/.test(presenter)) throw new Error("Purchasing Deleted rows do not render inline.");
  if (!/resetPagination\("purchasing", next\)/.test(app) || !/request !== purchasingRequest[^\n]+mode !== state\.purchasingMode/.test(app)) throw new Error("Purchasing mode reset or stale-response guard is missing.");
  if (/Api\.Purchasing/.test(presenter) || !/Api\.Purchasing\.findDeleted/.test(app) || !/Api\.Purchasing\.restore/.test(app)) throw new Error("Purchasing orchestration is not App-owned.");
  const publicApi = /return Object\.freeze\(\{([\s\S]*?)\}\);/.exec(presenter)?.[1] || "";
  if ((presenter.match(/function renderLoading\s*\(/g) || []).length !== 1 || !/\brenderLoading\s*,/.test(publicApi) || !/\brenderError\s*,/.test(publicApi)) throw new Error("Purchasing loading/error renderers are not exposed exactly once.");
  ["renderLoading", "renderError", "render"].forEach((method) => {
    if (app.indexOf(`PurchasingPresenter.${method}`) >= 0 && publicApi.indexOf(method) < 0) throw new Error(`App calls undefined PurchasingPresenter.${method}.`);
  });
  if (!/id="tbl-purchasing-body"/.test(view) || !/Render\.mount\("tbl-purchasing-body"/.test(presenter)) throw new Error("Purchasing loading state has no shared-table target.");
  if (/<tr[^>]*\bh-\[/.test(presenter) || /restoreReason[^\n]{0,160}\btruncate\b/.test(presenter)) throw new Error("Purchasing inline rows have a height or reason-truncation regression.");
  if (/data-[^=\s]*(?:purge|hard-delete|permanent-delete)/i.test(ui)) throw new Error("Permanent Purchasing delete UX was introduced.");
  if (/SpreadsheetApp|RepositoryWriter|AuditLogService|AppLogService/.test(ui)) throw new Error("Purchasing UI accesses spreadsheet or audit writers directly.");
  if (/Api\.|google\.script\.run/.test(view)) throw new Error("Purchasing View markup introduced orchestration.");
}

function testPurchasingFrontendArchitectureSourceContracts() {
  const presenter = HtmlService.createHtmlOutputFromFile("978.View.Purchasing.Presenter").getContent();
  const app = HtmlService.createHtmlOutputFromFile("994.View.App.Runtime").getContent();
  const api = HtmlService.createHtmlOutputFromFile("965.View.API").getContent();
  const events = HtmlService.createHtmlOutputFromFile("993.View.Events.Runtime").getContent();
  const view = HtmlService.createHtmlOutputFromFile("940.View.Purchasing").getContent();

  ["render", "renderLoading", "renderError", "renderCreateForm", "renderEditForm", "renderDetail"].forEach((method) => {
    if (!new RegExp(`\\b${method}\\s*,?`).test(presenter)) throw new Error(`PurchasingPresenter.${method} is not exported.`);
  });
  if (/Api\.|google\.script\.run|\basync\b|\bawait\b|\bPromise\b|addEventListener|\bToast\.|\bDialog\.|\bModal\.|\bApp\.|\b(?:Service|Controller|Repository|SpreadsheetApp)\b/.test(presenter)) throw new Error("PurchasingPresenter contains orchestration, state ownership, or forbidden access.");
  if (/\blet\s+(?:mode|loadedRows|.*Request|.*Submitting|.*Form)\b/.test(presenter)) throw new Error("PurchasingPresenter contains module application state.");
  ["purchasingMode", "purchasingSearch", "purchasingLoading", "purchasingRequest", "loadPurchasing", "renderPurchasing", "openCreatePurchasing", "openEditPurchasing", "deletePurchasing", "restorePurchasing"].forEach((contract) => { if (app.indexOf(contract) < 0) throw new Error(`App Purchasing contract ${contract} is missing.`); });
  if (!/request !== purchasingRequest[^\n]+state\.page !== "purchasing"[^\n]+mode !== state\.purchasingMode/.test(app)) throw new Error("Canonical Purchasing stale-response rejection is missing.");
  ["findAll", "findDeleted", "findById", "create", "update", "remove", "restore"].forEach((method) => { if (!new RegExp(`\\b${method}\\([^)]*\\)\\s*\\{[\\s\\S]{0,100}return run\\(`).test(api)) throw new Error(`Api.Purchasing.${method} transport is missing.`); });
  if (!/function bindPurchasing\(\)/.test(events) || (events.match(/bindPurchasing\(\);/g) || []).length !== 1) throw new Error("Purchasing listeners are not bound exactly once.");
  if (/Api\.Purchasing|PurchasingPresenter\./.test(events)) throw new Error("Purchasing Events bypass App ownership.");
  if (!/actionButton\.disabled \|\| actionButton\.getAttribute\("aria-disabled"\) === "true"/.test(events)) throw new Error("Disabled Purchasing Restore can dispatch.");
  if (/Api\.|google\.script\.run|SpreadsheetApp|Repository/.test(view)) throw new Error("Purchasing View contains orchestration or data access.");
}

function testPurchasingAggregatePhaseRegistrationContracts() {
  const phases = PURCHASING_ACCEPTANCE_PHASES();
  if (!Array.isArray(phases) || phases.length !== 4) throw new Error("Purchasing canonical phase registry is unavailable.");
  const expectedOrder = ["read", "validation", "crud", "restore"];
  if (!expectedOrder.every((key, index) => phases[index]?.key === key)) throw new Error("Purchasing canonical phase order must be Read, Validation, CRUD, Restore.");

  const canonicalRegistries = [PURCHASING_READ_TESTS(), PURCHASING_VALIDATION_TESTS(), PURCHASING_CRUD_TESTS(), PURCHASING_RESTORE_TESTS()];
  if (!canonicalRegistries.every((registry, index) => phases[index].tests.map((test) => test.name).join("|") === registry.map((test) => test.name).join("|"))) throw new Error("Purchasing phases do not consume their canonical registries.");
  if (PURCHASING_MUTATION_TESTS().length !== PURCHASING_VALIDATION_TESTS().length + PURCHASING_CRUD_TESTS().length || PURCHASING_MUTATION_TESTS().some((test, index) => test !== PURCHASING_VALIDATION_TESTS().concat(PURCHASING_CRUD_TESTS())[index])) throw new Error("Purchasing legacy Mutation registry must derive from Validation and CRUD without drift.");
  const assigned = phases.reduce((tests, phase) => {
    if (!Array.isArray(phase.tests) || !phase.tests.length) throw new Error(`Purchasing ${phase.key} phase has no canonical tests.`);
    if (phase.tests.length !== phase.expectedCount) throw new Error(`Unexpected Purchasing ${phase.key} count: ${phase.tests.length}; expected ${phase.expectedCount}.`);
    return tests.concat(phase.tests);
  }, []);
  if (assigned.some((test) => typeof test !== "function" || !test.name)) throw new Error("A registered Purchasing test is not a callable named function.");
  const assignedNames = assigned.map((test) => test.name);
  const uniqueNames = new Set(assignedNames);
  if (uniqueNames.size !== assignedNames.length) throw new Error("A Purchasing test is registered in more than one canonical phase.");
  const expectedProductionCount = canonicalRegistries.reduce((count, registry) => count + registry.length, 0);
  if (PURCHASING_KNOWN_TESTS().length !== expectedProductionCount || assigned.length !== expectedProductionCount || uniqueNames.size !== expectedProductionCount) throw new Error(`Purchasing phase registry must contain ${expectedProductionCount} known tests; found ${uniqueNames.size}.`);
  if (PURCHASING_KNOWN_TESTS().some((test, index) => test !== assigned[index])) throw new Error("Purchasing known-test registry differs from canonical phase order.");
  const metaTests = phases.reduce((tests, phase) => tests.concat(phase.metaTests || []), []);
  if (metaTests.some((test) => typeof test !== "function" || !test.name)) throw new Error("A registered Purchasing meta-test is not a callable named function.");
  const metaNames = metaTests.map((test) => test.name);
  if (metaNames.length !== 1 || metaNames[0] !== "testPurchasingAggregatePhaseRegistrationContracts") throw new Error("Purchasing aggregate registration contract must be the sole Read meta-test.");
  if (phases[0].metaTests.map((test) => test.name).join("|") !== PURCHASING_META_TESTS().map((test) => test.name).join("|") || phases.slice(1).some((phase) => phase.metaTests.length)) throw new Error("Purchasing meta-test ownership must belong only to the Read phase.");
  if (assignedNames.some((name) => metaNames.indexOf(name) >= 0)) throw new Error("Purchasing meta-tests must not distort production phase membership.");
  const allRegisteredNames = assignedNames.concat(metaNames);
  const expectedTotalWithMeta = expectedProductionCount + metaNames.length;
  if (new Set(allRegisteredNames).size !== expectedTotalWithMeta) throw new Error(`Purchasing production and meta registries must contain ${expectedTotalWithMeta} unique tests; found ${new Set(allRegisteredNames).size}.`);
  if ((assignedNames.filter((name) => name === "testPurchasingFrontendArchitectureSourceContracts")).length !== 1 || (assignedNames.filter((name) => name === "testPurchasingUxConsistencySourceContracts")).length !== 1) throw new Error("Purchasing frontend architecture contracts must be registered exactly once.");
  if ((assignedNames.filter((name) => name === "testPurchasingFindDeletedBoundedDependencyReads")).length !== 1) throw new Error("Purchasing bounded dependency-read performance coverage must be registered exactly once.");
  if (phases.filter((phase) => phase.audit === true).length !== 1 || phases[0].audit !== true) throw new Error("Purchasing live-data audit must belong only to the read phase.");
  const canonicalRunners = [runPurchasingReadAcceptance, runPurchasingValidationAcceptance, runPurchasingCrudAcceptance, runPurchasingRestoreAcceptance];
  if (!canonicalRunners.every((runner, index) => phases[index].runner === runner.name)) throw new Error("Purchasing phase runner names differ from canonical phase ownership.");
  const phaseRunnerNames = new Set(phases.map((phase) => phase.runner));
  if (assigned.some((test) => phaseRunnerNames.has(test.name) || test.name === "runPurchasingAcceptancePhase")) throw new Error("A Purchasing phase recursively registers an aggregate runner.");

  const requiredRunners = ["runPurchasingReadAcceptance()", "runPurchasingValidationAcceptance()", "runPurchasingCrudAcceptance()", "runPurchasingRestoreAcceptance()"];
  [runPurchasingModuleAcceptance, runPurchasingMutationAcceptance].forEach((deprecatedRunner) => {
    const registeredBefore = activeTestRegistry ? activeTestRegistry.size : 0;
    let failFastMessage = "";
    try { deprecatedRunner(); } catch (error) { failFastMessage = error.message; }
    if (!failFastMessage || !requiredRunners.every((name) => failFastMessage.indexOf(name) >= 0)) throw new Error(`${deprecatedRunner.name} does not fail fast with all canonical phase names.`);
    if (activeTestRegistry && activeTestRegistry.size !== registeredBefore) throw new Error(`${deprecatedRunner.name} executed or registered a test before failing.`);
  });

  const cleanupSource = purchasingWithFixture.toString();
  if (!/finally\s*\{/.test(cleanupSource) || cleanupSource.indexOf("purchasingCleanupMasterData(fixture)") < 0) throw new Error("Purchasing fixture cleanup must remain protected by finally.");
  const acceptanceSource = runPurchasingAcceptancePhase.toString();
  if (acceptanceSource.indexOf("reportTiming: true") < 0 || acceptanceSource.indexOf("fixtureCount") < 0 || completePurchasingAcceptancePhase.toString().indexOf("fixtures") < 0) throw new Error("Purchasing phase timing and fixture-count reporting is missing.");
  const aggregateSources = canonicalRunners.map((runner) => runner.toString()).concat([runPurchasingAcceptancePhase.toString(), runPurchasingModuleAcceptance.toString(), runPurchasingMutationAcceptance.toString()]);
  if (aggregateSources.some((source) => /\b(?:RepositoryReader|RepositoryWriter|SpreadsheetApp|PurchasingService|ProductService|PartnerService)\b/.test(source))) throw new Error("Purchasing aggregate runners must not access production data directly.");
}

function expenseControllerAssertResponse(response, expectedSuccess) {
  if (
    !response ||
    typeof response !== "object" ||
    Array.isArray(response) ||
    response.success !== expectedSuccess ||
    !("data" in response) ||
    typeof response.message !== "string"
  ) {
    throw new Error("Expense Controller returned an invalid response.");
  }
}

function expenseControllerAssertJsonSafe(value) {
  const values = [value];

  while (values.length > 0) {
    const current = values.pop();

    if (current instanceof Date || typeof current === "function") {
      throw new Error("Expense Controller response contains an unsafe value.");
    }

    if (!current || typeof current !== "object") continue;

    const prototype = Object.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== Array.prototype) {
      throw new Error("Expense Controller response leaks a prototype.");
    }

    Object.keys(current).forEach((key) => values.push(current[key]));
  }

  JSON.stringify(value);
}

function testExpenseControllerPublicApi() {
  const functions = [
    getExpenses,
    getExpense,
    getDeletedExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    restoreExpense,
  ];

  if (functions.some((fn) => typeof fn !== "function")) {
    throw new Error("Expense Controller public API is invalid.");
  }
}

function testExpenseControllerGetExpenses() {
  const response = getExpenses();
  expenseControllerAssertResponse(response, true);
  if (!Array.isArray(response.data)) {
    throw new Error("getExpenses() data must be an array.");
  }
  expenseControllerAssertJsonSafe(response);
}

function testExpenseControllerGetDeletedExpenses() {
  const response = getDeletedExpenses();
  expenseControllerAssertResponse(response, true);
  if (!Array.isArray(response.data)) {
    throw new Error("getDeletedExpenses() data must be an array.");
  }
  expenseControllerAssertJsonSafe(response);
}

function testExpenseControllerGetValidation() {
  const count = RepositoryReader.count(EXPENSE_SCHEMA);
  const response = getExpense("");
  expenseControllerAssertValidation(
    response,
    "ID Expense wajib diisi.",
    'getExpense("")',
  );

  if (RepositoryReader.count(EXPENSE_SCHEMA) !== count) {
    throw new Error('getExpense("") must not change Expense data.');
  }

  const expected = Response.error("Controlled Expense validation response.", [
    { field: "controlled", message: "Controlled validation error." },
  ]);

  if (_expenseControllerResponse(() => expected) !== expected) {
    throw new Error(
      "Expense Controller helper must preserve validation response identity.",
    );
  }
}

function testExpenseControllerCreateValidation() {
  const count = RepositoryReader.count(EXPENSE_SCHEMA);
  const response = createExpense(null);
  expenseControllerAssertValidation(
    response,
    "Data Expense wajib berupa object.",
    "createExpense(null)",
  );

  if (RepositoryReader.count(EXPENSE_SCHEMA) !== count) {
    throw new Error("createExpense(null) must not write Expense data.");
  }
}

function testExpenseControllerUpdateValidation() {
  const count = RepositoryReader.count(EXPENSE_SCHEMA);
  const response = updateExpense("", null);
  expenseControllerAssertValidation(
    response,
    "ID Expense wajib diisi.",
    'updateExpense("", null)',
  );

  if (RepositoryReader.count(EXPENSE_SCHEMA) !== count) {
    throw new Error("Invalid Expense update must not write data.");
  }
}

function testExpenseControllerDeleteValidation() {
  const count = RepositoryReader.count(EXPENSE_SCHEMA);
  const response = deleteExpense("");
  expenseControllerAssertValidation(
    response,
    "ID Expense wajib diisi.",
    'deleteExpense("")',
  );

  if (RepositoryReader.count(EXPENSE_SCHEMA) !== count) {
    throw new Error("Invalid Expense deletion must not change data.");
  }
}

function testExpenseControllerRestoreValidation() {
  const count = RepositoryReader.count(EXPENSE_SCHEMA);
  const response = restoreExpense("");
  expenseControllerAssertValidation(
    response,
    "ID Expense wajib diisi.",
    'restoreExpense("")',
  );

  if (RepositoryReader.count(EXPENSE_SCHEMA) !== count) {
    throw new Error("Invalid Expense restoration must not change data.");
  }
}

function expenseControllerAssertValidation(response, message, operation) {
  expenseControllerAssertResponse(response, false);

  if (
    response.message !== message ||
    response.data !== null ||
    !Array.isArray(response.errors) ||
    response.errors.length !== 0
  ) {
    throw new Error(`${operation} did not preserve its validation payload.`);
  }
}

function testExpenseControllerSerialization() {
  expenseControllerAssertJsonSafe(getExpenses());
  expenseControllerAssertJsonSafe(getDeletedExpenses());
}

function testExpenseControllerDateSerialization() {
  const response = _expenseControllerResponse(() =>
    Response.success({ Tanggal: new Date("2026-07-18T00:00:00.000Z") }),
  );

  expenseControllerAssertResponse(response, true);
  expenseControllerAssertJsonSafe(response);

  if (response.data.Tanggal !== "2026-07-18T00:00:00.000Z") {
    throw new Error("Expense Controller date serialization is incompatible.");
  }
}

function testExpenseControllerExceptionBoundary() {
  const response = _expenseControllerResponse(() => {
    throw new Error("controlled Expense Controller test error");
  });

  expenseControllerAssertResponse(response, false);
  expenseControllerAssertJsonSafe(response);

  if (response.message !== "Terjadi kesalahan saat memproses expense.") {
    throw new Error("Expense Controller exception boundary leaked an error.");
  }
}

function expenseApiSource() {
  return HtmlService.createHtmlOutputFromFile("965.View.API").getContent();
}

function testExpenseApiPublicApi() {
  const source = expenseApiSource();
  const expenseBlock = source.match(
    /const Expense = Object\.freeze\(\{([\s\S]*?)\n\s*\}\);/,
  );

  if (!expenseBlock) throw new Error("Api.Expense namespace was not found.");
  if (/Api\.Expenses|\bconst Expenses\b/.test(source)) {
    throw new Error("Plural Api.Expenses namespace is not allowed.");
  }

  const methods = {
    list: 'run("getExpenses")',
    get: 'run("getExpense", id)',
    listDeleted: 'run("getDeletedExpenses")',
    create: 'run("createExpense", data)',
    update: 'run("updateExpense", id, data)',
    remove: 'run("deleteExpense", id)',
    restore: 'run("restoreExpense", id)',
  };

  Object.keys(methods).forEach((name) => {
    const definitions = expenseBlock[1].match(new RegExp(`\\b${name}\\s*\\(`, "g")) || [];
    if (definitions.length !== 1 || !expenseBlock[1].includes(methods[name])) {
      throw new Error(`Api.Expense.${name} is missing, duplicated, or invalid.`);
    }
  });
}

function testExpenseApiPromiseTransportBoundary() {
  const source = expenseApiSource();

  if (
    !/function run\(fn, \.\.\.args\)[\s\S]*return new Promise/.test(source) ||
    !/withSuccessHandler\(\(result\) => \{[\s\S]*resolve\(result\)/.test(source) ||
    !/withFailureHandler\(\(error\) => \{[\s\S]*reject\(error\)/.test(source)
  ) {
    throw new Error("Expense browser API transport boundary is invalid.");
  }
}

function expenseFrontendSource(file) {
  return HtmlService.createHtmlOutputFromFile(file).getContent();
}

function testExpenseFrontendArchitectureAndSearchContract() {
  const app = expenseFrontendSource("994.View.App.Runtime");
  const presenter = expenseFrontendSource("977.View.Expenses.Presenter");
  const events = expenseFrontendSource("993.View.Events.Runtime");
  const forbiddenPresenter = /\bApi\b|google\.script\.run|\bPromise\b|\basync\b|\bawait\b|\bApp\b|addEventListener|\bToast\b|\bDialog\b|\bModal\b|SpreadsheetApp|Repository|Controller|Service|AuditLogService|requestToken|requestSequence/;
  if (forbiddenPresenter.test(presenter)) throw new Error("ExpensePresenter is not render-only.");
  ["render", "renderLoading", "renderError", "renderCreateForm", "renderEditForm", "renderFormFooter", "renderDetail", "renderDeleteMessage", "renderRestoreMessage"].forEach((name) => {
    if (!new RegExp(`\\b${name}\\b`).test(presenter)) throw new Error(`ExpensePresenter.${name} is missing.`);
  });
  ["expenseMode", "expenses", "deletedExpenses", "expenseSearch", "expenseLoading", "expenseError", "expenseRequest", "loadExpenses", "searchExpenses", "renderExpenses"].forEach((contract) => {
    if (!app.includes(contract)) throw new Error(`Expense App ownership is missing: ${contract}`);
  });
  if (!/expenseSource\(\)\.filter[\s\S]*paginateRows\("expenses"/.test(app)) throw new Error("Expense filtering must occur before selected-page slicing.");
  if (!/request !== expenseRequest \|\| state\.page !== "expenses" \|\| mode !== state\.expenseMode/.test(app)) throw new Error("Expense stale list responses are not rejected.");
  if (!/bindExpenses\(\)/.test(events) || /Api\.Expense|ExpensesPresenter/.test(events)) throw new Error("Expense Events must delegate intent only.");
}

function testExpenseFrontendCrudAndTrashContract() {
  const app = expenseFrontendSource("994.View.App.Runtime");
  const presenter = expenseFrontendSource("977.View.Expenses.Presenter");
  const events = expenseFrontendSource("993.View.Events.Runtime");
  ["create", "get", "update", "remove", "restore"].forEach((method) => {
    if (!new RegExp(`Api\\.Expense\\.${method}\\(`).test(app)) throw new Error(`App Expense ${method} workflow is missing.`);
  });
  if (!/Dialog\.confirm/.test(app) || !/Toast\.success/.test(app) || !/Toast\.error/.test(app)) throw new Error("App does not own Expense confirmation and toast decisions.");
  if (!/state\.expenseSubmitting/.test(app) || !/attempted \|\| state\.expenseBusyId/.test(app)) throw new Error("Expense duplicate mutation guards are missing.");
  if (!/data-expense-action="restore"/.test(presenter) || !/data-expense-action="edit"/.test(presenter) || !/data-expense-action="delete"/.test(presenter)) throw new Error("Expense Active or Deleted actions are missing.");
  if (!/action\.dataset\.expenseAction === "restore"[\s\S]*App\.restoreExpense/.test(events) || /Api\.Expense|ExpensesPresenter/.test(events)) throw new Error("Expense Event action delegation is invalid.");
  if ((events.match(/function bindExpenses\(/g) || []).length !== 1 || (events.match(/bindExpenses\(\);/g) || []).length !== 1) throw new Error("Expense listeners must be registered exactly once.");
  if (!/\["products", "partners", "pickups", "purchasing", "returns", "expenses"\]\.includes\(module\)/.test(app)) throw new Error("Shared pagination can double-dispatch Expense intent.");
}

function testExpenseFrontendValidationAndDisplayContract() {
  const app = expenseFrontendSource("994.View.App.Runtime");
  const presenter = expenseFrontendSource("977.View.Expenses.Presenter");
  const messages = [
    "Category is required.",
    "Category cannot exceed 100 characters.",
    "Description is required.",
    "Description cannot exceed 255 characters.",
    "Amount must be a valid number.",
    "Amount cannot be negative.",
  ];

  messages.forEach((message) => {
    if (!app.includes(message)) {
      throw new Error(`Expense Create/Edit validation is missing: ${message}`);
    }
  });

  if (
    !/formatCurrency\(expense\[FIELD\.AMOUNT\]\)/.test(presenter) ||
    !/formatDate\(expense\[FIELD\.DATE\]\)/.test(presenter) ||
    !/formatDateTime\(expense\.CreatedAt\)/.test(presenter) ||
    !/formatDateTime\(expense\.UpdatedAt\)/.test(presenter) ||
    !/rows\.map\(\(row\) => renderRow\(row, mode, view\.busyId\)\)\.join\(""\)/.test(presenter)
  ) {
    throw new Error("Expense display formatting contract is invalid.");
  }
  if (!/DEFAULT_PAGE_SIZE/.test(expenseFrontendSource("994.View.App.Runtime")) || /permanently erase[\s\S]*Api\.Expense/.test(presenter)) throw new Error("Expense pagination or soft-delete behavior regressed.");
}

function testExpenseDashboardCompatibility() {
  const response = getDashboard();

  if (!response || response.success !== true) {
    throw new Error("Dashboard compatibility failed after Expense hardening.");
  }
}

function dashboardStub(rows, statistics) {
  return {
    findAll() {
      return Response.success(rows || []);
    },
    statistics() {
      return Response.success(statistics || { total: 0, active: 0, inactive: 0 });
    },
  };
}

function dashboardPickupStub(headers, details) {
  return {
    findAll() { return Response.success(headers || []); },
    findAllDetails() { return Response.success(details || []); },
  };
}

function dashboardFixture(overrides) {
  const empty = dashboardStub([], { total: 0, active: 0, inactive: 0 });
  return DashboardService(Object.assign({
    products: empty,
    partners: empty,
    pickups: empty,
    returns: empty,
    purchases: empty,
    expenses: empty,
    now() {
      return "2026-07-22T00:00:00.000Z";
    },
  }, overrides || {}));
}

function testLiveDiagnosticsMaintenanceContracts() {
  const publicFunctions = [
    auditExpenseLiveData,
    diagnoseExpenseNominalCleanup,
    cleanupExpenseControlledFixtures,
    auditPurchasingData,
    auditDashboardLiveData,
    runPickupReturnIntegrityDiagnostic,
  ];
  const maintenance = publicFunctions.map((fn) => fn.toString()).join("\n");
  const tests = runLiveDiagnosticsFocusedTests.toString();
  publicFunctions.forEach((fn) => {
    if (typeof fn !== "function" || fn.length !== 0) throw new Error(`${fn && fn.name || "Live diagnostic"} public symbol or arity changed.`);
    const declaration = new RegExp(`function\\s+${fn.name}\\s*\\(`);
    const declarations = maintenance.match(new RegExp(`function\\s+${fn.name}\\s*\\(`, "g")) || [];
    if (declarations.length !== 1) throw new Error(`${fn.name} is missing or duplicated in live diagnostics maintenance.`);
    if (declaration.test(tests)) throw new Error(`${fn.name} remains implemented in the Transaction test file.`);
  });
  if (typeof analyzePickupReturnIntegrity !== "function" || analyzePickupReturnIntegrity.length !== 4) {
    throw new Error("Pickup/Return diagnostic analyzer public symbol or arity changed.");
  }
  const readOnlySource = [
    auditExpenseLiveData,
    diagnoseExpenseNominalCleanup,
    auditPurchasingData,
    auditDashboardLiveData,
    runPickupReturnIntegrityDiagnostic,
  ].map((fn) => fn.toString()).join("\n");
  [/\.setValue\s*\(/, /\.setValues\s*\(/, /\.clear\s*\(/, /RepositoryWriter/, /seedMissing\s*\(/].forEach((pattern) => {
    if (pattern.test(readOnlySource)) throw new Error(`Read-only live diagnostic contains a write contract: ${pattern}.`);
  });
  const cleanup = cleanupExpenseControlledFixtures.toString();
  ["LockService.getScriptLock", "EXPENSE FIXTURE CLEANUP PRECONDITION FAILED", "rollbackAttempted", "setValue(target.originalNominal)"].forEach((token) => {
    if (cleanup.indexOf(token) < 0) throw new Error(`Controlled Expense cleanup safety contract is missing: ${token}.`);
  });
  const acceptance = AcceptanceRunner.runFast.toString();
  if (/auditExpenseLiveData|cleanupExpenseControlledFixtures|auditPurchasingData|auditDashboardLiveData|runPickupReturnIntegrityDiagnostic/.test(acceptance)) {
    throw new Error("Fast acceptance automatically invokes a live diagnostic or cleanup.");
  }
}

function testDashboardEmptyAndNumericSafety() {
  const data = dashboardFixture().getDashboard({ preset: "CUSTOM", startDate: "2027-01-01", endDate: "2027-01-02" }).data;

  if (
    data.summary.expenseCount !== 0 || data.summary.purchasingValue !== 0 ||
    data.recentActivities.length !== 0 ||
    data.expenseBreakdown.total !== 0 || data.purchasingTrend.values.length !== 2
  ) {
    throw new Error("Dashboard empty-state or numeric-safety contract failed.");
  }
}

function testDashboardRecentActivityStableOrdering() {
  const products = dashboardStub([
    { ID: "PR_OLD", CreatedAt: "2026-01-01T00:00:00.000Z" },
    { ID: "PR_NEW", CreatedAt: "2026-02-01T00:00:00.000Z", UpdatedAt: "2026-03-01T00:00:00.000Z" },
    { ID: "PR_2", CreatedAt: "2026-02-20T00:00:00.000Z" },
    { ID: "PR_3", CreatedAt: "2026-02-18T00:00:00.000Z" },
    { ID: "PR_4", CreatedAt: "2026-02-16T00:00:00.000Z" },
    { ID: "PR_5", CreatedAt: "2026-02-14T00:00:00.000Z" },
  ]);
  const expenses = dashboardStub([
    { ID: "EX_MID", CreatedAt: "2026-01-15T00:00:00.000Z" },
  ]);
  const activities = dashboardFixture({ products, expenses })
    .getDashboard().data.recentActivities;

  if (activities.length !== 5 || activities.map((item) => item.id).join(",") !== "PR_NEW,PR_2,PR_3,PR_4,PR_5") {
    throw new Error("Dashboard recent activity ordering or five-record limit is unstable.");
  }
}

function testDashboardRangeMetricsAndAvailability() {
  const expenses = dashboardStub([
    { ID: "EX_1", Tanggal: "2026-07-01", Kategori: " Ops ", Nominal: 10 },
    { ID: "EX_2", Tanggal: "2026-07-03", Kategori: "Admin", Nominal: 20 },
    { ID: "EX_3", Tanggal: "2026-07-03", Kategori: "Ops", Nominal: 10 },
  ]);
  const purchases = dashboardStub([
    { ID: "PU_1", Tanggal: "2026-07-01", Qty: 2, Harga: 5, Total: 10 },
    { ID: "PU_2", Tanggal: "2026-07-03", Qty: 3, Harga: 10, Total: 30 },
  ]);
  const response = dashboardFixture({ expenses, purchases }).getDashboard({ preset: "CUSTOM", startDate: "2026-07-01", endDate: "2026-07-03" });
  if (!response.success) throw new Error(response.message);
  const data = response.data;
  if (data.summary.expenseValue !== 40 || data.expenseBreakdown.total !== 40 ||
      data.expenseBreakdown.labels.join(",") !== "Admin,Ops" || data.summary.purchasingValue !== 40 ||
      data.purchasingTrend.values.join(",") !== "10,0,30" || data.purchasingTrend.total !== 40 ||
      data.availability.revenue.available !== false || data.availability.profit.available !== false) {
    throw new Error("Dashboard supported metric, ordering, zero-fill, or availability contract failed.");
  }
  const invalid = dashboardFixture().getDashboard({ preset: "CUSTOM", startDate: "2026-07-03", endDate: "2026-07-01" });
  if (invalid.success !== false || invalid.errors[0].code !== "START_AFTER_END") throw new Error("Dashboard structured range error contract failed.");
}

function testDashboardDateRangeContract() {
  const futureExpense = dashboardStub([{ ID: "EX_FUTURE", Tanggal: "2026-07-23", Kategori: "Future", Nominal: 99 }]);
  const service = dashboardFixture({ expenses: futureExpense });
  const current = service.getDashboard({ preset: "CURRENT_MONTH" });
  if (!current.success || current.data.range.startDate !== "2026-07-01" || current.data.range.endDate !== "2026-07-22" ||
      current.data.summary.expenseValue !== 0 || current.data.range.timezone !== APP_CONFIG.TIMEZONE) {
    throw new Error("Current-month, timezone, or non-Custom future exclusion failed.");
  }
  const future = service.getDashboard({ preset: "CUSTOM", startDate: "2026-07-23", endDate: "2026-07-23" });
  if (!future.success || future.data.summary.expenseValue !== 99) throw new Error("Future Custom range failed.");
  const invalidDate = service.getDashboard({ preset: "CUSTOM", startDate: "2026-02-30", endDate: "2026-03-01" });
  const tooLarge = service.getDashboard({ preset: "CUSTOM", startDate: "2020-01-01", endDate: "2026-01-02" });
  if (invalidDate.success !== false || invalidDate.errors[0].code !== "INVALID_DATE" ||
      tooLarge.success !== false || tooLarge.errors[0].code !== "RANGE_TOO_LARGE") {
    throw new Error("Invalid-date or maximum-range contract failed.");
  }
  const daily = service.getDashboard({ preset: "CUSTOM", startDate: "2026-01-01", endDate: "2026-01-31" });
  const weekly = service.getDashboard({ preset: "CUSTOM", startDate: "2026-01-01", endDate: "2026-02-01" });
  const monthly = service.getDashboard({ preset: "CUSTOM", startDate: "2026-01-01", endDate: "2026-07-01" });
  if (daily.data.range.granularity !== "daily" || weekly.data.range.granularity !== "weekly" ||
      monthly.data.range.granularity !== "monthly") throw new Error("Dashboard granularity boundaries failed.");
}

function testDashboardCurrentMonthWeeklyAggregation() {
  const purchases = dashboardStub([
    { ID: "PU_M1", Tanggal: "2026-07-01", Qty: 1, Harga: 100, Total: 100 },
    { ID: "PU_M2", Tanggal: "2026-07-08", Qty: 2, Harga: 100, Total: 200 },
    { ID: "PU_M4", Tanggal: "2026-07-22", Qty: 3, Harga: 100, Total: 300 },
  ]);
  const response = dashboardFixture({ purchases }).getDashboard({ preset: "CURRENT_MONTH" });
  if (!response.success || response.data.range.granularity !== "weekly" ||
      response.data.purchasingTrend.labels.join(",") !== "M1,M2,M3,M4" ||
      response.data.purchasingTrend.values.join(",") !== "100,200,0,300") {
    throw new Error("Dashboard current-month week-of-month aggregation contract failed.");
  }
}

function testDashboardAdaptiveDailyAggregationContract() {
  const data = dashboardFixture().getDashboard({ preset: "CUSTOM", startDate: "2026-07-01", endDate: "2026-07-03" }).data;
  if (data.range.granularity !== "daily" || data.netPickupValueTrend.labels.join(",") !== "01/07,02/07,03/07") {
    throw new Error("Dashboard adaptive daily aggregation contract failed.");
  }
}

function testDashboardAdaptiveWeeklyAggregationContract() {
  const data = dashboardFixture().getDashboard({ preset: "CUSTOM", startDate: "2026-01-01", endDate: "2026-02-01" }).data;
  if (data.range.granularity !== "weekly" || data.netPickupValueTrend.labels.join(",") !==
      "01–07/01,08–14/01,15–21/01,22–28/01,29/01–01/02") {
    throw new Error("Dashboard adaptive weekly aggregation contract failed.");
  }
}

function testDashboardAdaptiveMonthlyAggregationContract() {
  const sameYear = dashboardFixture().getDashboard({ preset: "CUSTOM", startDate: "2026-01-01", endDate: "2026-04-01" }).data;
  const crossYear = dashboardFixture().getDashboard({ preset: "CUSTOM", startDate: "2025-11-01", endDate: "2026-02-01" }).data;
  if (sameYear.range.granularity !== "monthly" || sameYear.netPickupValueTrend.labels.join(",") !== "Jan,Feb,Mar,Apr" ||
      crossYear.netPickupValueTrend.labels.join(",") !== "Nov 2025,Dec 2025,Jan 2026,Feb 2026") {
    throw new Error("Dashboard adaptive monthly aggregation contract failed.");
  }
}

function testDashboardAdaptiveYearlyAggregationContract() {
  const data = dashboardFixture().getDashboard({ preset: "CUSTOM", startDate: "2023-01-01", endDate: "2025-01-02" }).data;
  if (data.range.granularity !== "yearly" || data.netPickupValueTrend.labels.join(",") !== "2023,2024,2025") {
    throw new Error("Dashboard adaptive yearly aggregation contract failed.");
  }
}

function testDashboardChronologicalBucketContract() {
  const data = dashboardFixture().getDashboard({ preset: "CUSTOM", startDate: "2025-12-15", endDate: "2026-04-15" }).data;
  if (data.netPickupValueTrend.labels.join(",") !== "Dec 2025,Jan 2026,Feb 2026,Mar 2026,Apr 2026" ||
      data.netPickupValueTrend.labels.length !== data.netPickupValueTrend.values.length) {
    throw new Error("Dashboard chronological continuous bucket contract failed.");
  }
}

function testPickupHistoricalPriceSchemaContract() {
  if (PICKUP_DETAIL_FIELDS.PRICE !== "Harga" || PICKUP_DETAIL_FIELDS.TOTAL !== "Total" ||
      PICKUP_DETAIL_SCHEMA.HEADERS.indexOf("Harga") < 0 || PICKUP_DETAIL_SCHEMA.HEADERS.indexOf("Total") < 0 ||
      !PICKUP_DETAIL_SCHEMA.VALIDATION.Harga.required || !PICKUP_DETAIL_SCHEMA.VALIDATION.Total.required) {
    throw new Error("Pickup Detail historical price schema contract failed.");
  }
}

function testPickupHistoricalPriceSnapshotSourceContract() {
  const source = String(PickupService);
  if (!/product\[PRODUCT_FIELDS\.PRICE\]/.test(source) ||
      !/historicalPriceByProduct/.test(source) ||
      !/PICKUP_DETAIL_FIELDS\.TOTAL\]: qty \* price/.test(source) ||
      /detail\[PICKUP_DETAIL_FIELDS\.PRICE\].*=.*product\[PRODUCT_FIELDS\.PRICE\]/.test(source)) {
    throw new Error("Pickup Detail server-owned historical price snapshot contract failed.");
  }
}

function testReturnHistoricalValuationSourceContract() {
  const source = String(ReturnService);
  if (!/PickupDetailHarga/.test(source) || !/ReturnValue/.test(source) ||
      !/pickupDetail\[PICKUP_DETAIL_FIELDS\.PRICE\]/.test(source) ||
      /ReturnValue[\s\S]{0,200}PRODUCT_FIELDS\.PRICE/.test(source)) {
    throw new Error("Return valuation does not exclusively use Pickup Detail historical Harga.");
  }
}

function testDashboardNetPickupValueMonthlyAndWeeklyContract() {
  const headers = [
    { ID: "PH_1", Tanggal: "2026-07-01" },
    { ID: "PH_2", Tanggal: "2026-07-08" },
    { ID: "PH_3", Tanggal: "2026-06-15" },
  ];
  const details = [
    { ID: "PD_1", PickupID: "PH_1", ProductID: "PR_1", Qty: 2, Harga: 500000, Total: 1000000 },
    { ID: "PD_2", PickupID: "PH_2", ProductID: "PR_1", Qty: 1, Harga: 1000000, Total: 1000000 },
    { ID: "PD_3", PickupID: "PH_3", ProductID: "PR_1", Qty: 1, Harga: 500000, Total: 500000 },
  ];
  const returns = dashboardStub([
    { ID: "RT_1", PickupID: "PH_1", PickupDetailID: "PD_1", Tanggal: "2026-07-08", Qty: 1 },
  ]);
  const service = dashboardFixture({ pickups: dashboardPickupStub(headers, details), returns });
  const month = service.getDashboard({ preset: "CURRENT_MONTH" }).data;
  if (month.summary.netPickupValue !== 1500000 || month.netPickupValueTrend.labels.join(",") !== "M1,M2,M3,M4" ||
      month.netPickupValueTrend.values.join(",") !== "1000000,500000,0,0") {
    throw new Error("Net Pickup Value current-month weekly aggregation failed.");
  }
  const year = service.getDashboard({ preset: "CURRENT_YEAR" }).data;
  if (year.netPickupValueTrend.granularity !== "monthly" ||
      year.netPickupValueTrend.values.slice(5, 7).join(",") !== "500000,1500000" ||
      year.summary.netPickupValue !== 2000000) {
    throw new Error("Net Pickup Value current-year monthly aggregation failed.");
  }
}

function testDashboardCategoryAggregationContract() {
  const products = dashboardStub([
    { ID: "PR_1", Nama: "One", Kategori: "Coffee Beans" },
    { ID: "PR_2", Nama: "Two", Kategori: "Coffee Beans" },
    { ID: "PR_3", Nama: "Three", Kategori: "Equipment" },
  ]);
  const purchases = dashboardStub([
    { ID: "PU_1", ProductID: "PR_1", Tanggal: "2026-07-01", Qty: 1, Harga: 100, Total: 100 },
    { ID: "PU_2", ProductID: "PR_2", Tanggal: "2026-07-02", Qty: 2, Harga: 100, Total: 200 },
    { ID: "PU_3", ProductID: "PR_3", Tanggal: "2026-07-03", Qty: 1, Harga: 50, Total: 50 },
  ]);
  const data = dashboardFixture({ products, purchases })
    .getDashboard({ preset: "CUSTOM", startDate: "2026-07-01", endDate: "2026-07-03" }).data;
  if (data.productPerformance.labels.join(",") !== "Coffee Beans,Equipment" ||
      data.productPerformance.values.join(",") !== "300,50") {
    throw new Error("Dashboard product-category aggregation contract failed.");
  }
}

function testDashboardChartFormattingContract() {
  const presenter = expenseFrontendSource("971.View.Dashboard.Presenter");
  const view = expenseFrontendSource("915.View.Dashboard");
  if (!view.includes("Revenue Trend") || !/Net Pickup Value/.test(presenter) ||
      !/beginAtZero:\s*true,\s*min:\s*0/.test(presenter) ||
      !/labels:\s*trend\.labels/.test(presenter) ||
      !/split\(\/\\s\+\/\)/.test(presenter) || !/Format\.currency\(context\.raw\)/.test(presenter)) {
    throw new Error("Dashboard chart title, axes, labels, legend, or tooltip formatting contract failed.");
  }
}

function testDashboardResponsiveOutsideDonutContract() {
  const presenter = expenseFrontendSource("971.View.Dashboard.Presenter");
  const block = dashboardFrontendBlock(presenter, "function outsideDonutLabels(theme)", "function destroyCharts()");
  if (!/afterDatasetsDraw\(chart\)/.test(block) || !/arc\.startAngle/.test(block) ||
      !/arc\.outerRadius/.test(block) || !/chart\.chartArea/.test(block) ||
      !/distributeOutsideLabels/.test(block) || !/sideCapacity/.test(block) ||
      !/context\.lineTo\(elbowX, item\.y\)/.test(block) ||
      !/context\.lineTo\(lineEndX, item\.y\)/.test(block) ||
      !/toFixed\(1\)/.test(block)) {
    throw new Error("Dashboard responsive outside donut labels or leader-line positioning contract failed.");
  }
  const renderCharts = dashboardFrontendBlock(presenter, "function renderCharts(data)", "return Object.freeze");
  if (!/legend:\s*\{\s*display:\s*false\s*\}/.test(renderCharts) ||
      /legend:\s*\{[\s\S]{0,100}position:/.test(renderCharts)) {
    throw new Error("Dashboard donut legend was not completely removed.");
  }
}

function testApplicationThemeSwitchingAndPersistenceContract() {
  const index = expenseFrontendSource("900.View.Index");
  const settings = expenseFrontendSource("947.View.Settings");
  const app = expenseFrontendSource("994.View.App.Runtime");
  const settingsPresenter = expenseFrontendSource("980.View.Settings.Presenter");
  if (!/data-theme="light"/.test(index) || !/ip-starling-theme/.test(index) ||
      !/localStorage\.getItem\(STORAGE_KEY\)/.test(index) || !/localStorage\.setItem\(STORAGE_KEY, theme\)/.test(index) ||
      !/document\.documentElement\.dataset\.theme/.test(index) ||
      !/data-theme-selector/.test(settings) || !/value="dark"/.test(settings) || !/value="light"/.test(settings) ||
      !/window\.Theme\.set\(event\.target\.value\)/.test(app) ||
      !/app:themechange/.test(app) || !/DashboardPresenter\.render\(state\.dashboard\)/.test(app) ||
      !/window\.Theme\.get\(\)/.test(settingsPresenter)) {
    throw new Error("Application theme switching, persistence, restoration, or immediate update contract failed.");
  }
}

function testDashboardChartThemeAdaptationContract() {
  const presenter = expenseFrontendSource("971.View.Dashboard.Presenter");
  const index = expenseFrontendSource("900.View.Index");
  ["--color-chart-text", "--color-chart-grid", "--color-chart-label", "--color-chart-leader", "--color-tooltip", "--color-tooltip-border"].forEach((token) => {
    if (index.indexOf(token) < 0 || presenter.indexOf(token) < 0) throw new Error(`Dashboard chart theme token is missing: ${token}`);
  });
  if (!/font:\s*\{\s*size:\s*13,\s*weight:\s*"600"\s*\}/.test(presenter) ||
      !/backgroundColor:\s*theme\.tooltip/.test(presenter) ||
      !/strokeStyle = theme\.leader/.test(presenter) || !/fillStyle = theme\.label/.test(presenter) ||
      !/grid:\s*\{\s*color:\s*theme\.grid\s*\}/.test(presenter)) {
    throw new Error("Dashboard chart theme adaptation or enlarged axis contract failed.");
  }
}

function testDashboardChartMarkerRenderingContract() {
  const presenter = expenseFrontendSource("971.View.Dashboard.Presenter");
  const index = expenseFrontendSource("900.View.Index");
  ["--color-chart-marker-fill", "--color-chart-marker-border", "--color-chart-marker-glow"].forEach((token) => {
    if (index.indexOf(token) < 0 || presenter.indexOf(token) < 0) throw new Error(`Dashboard marker theme token is missing: ${token}`);
  });
  if (!/pointRadius:\s*3\.5/.test(presenter) || !/pointHoverRadius:\s*5\.5/.test(presenter) ||
      !/pointBorderWidth:\s*2/.test(presenter) || !/pointHoverBorderWidth:\s*2\.5/.test(presenter) ||
      !/pointBackgroundColor:\s*theme\.markerFill/.test(presenter) ||
      !/pointBorderColor:\s*theme\.markerBorder/.test(presenter) ||
      !/function lineMarkerGlow\(theme\)/.test(presenter) || !/shadowBlur = 8/.test(presenter) ||
      !/radius:\s*\{\s*duration:\s*180,\s*easing:\s*"easeOutQuart"/.test(presenter) ||
      !/borderWidth:\s*2/.test(presenter)) {
    throw new Error("Dashboard line marker size, contrast, hover, glow, or animation contract failed.");
  }
}

function testDashboardDonutLabelPolishContract() {
  const presenter = expenseFrontendSource("971.View.Dashboard.Presenter");
  const block = dashboardFrontendBlock(presenter, "function outsideDonutLabels(theme)", "function destroyCharts()");
  if (!/const gap = 36/.test(block) || !/650 12\.25px Inter/.test(block) ||
      !/600 11\.75px Inter/.test(block) || !/textWidth \+ 7/.test(block) ||
      !/textWidth - 7/.test(block) || !/context\.lineTo\(lineEndX, item\.y\)/.test(block) ||
      !/distributeOutsideLabels/.test(block) || !/afterDatasetsDraw\(chart\)/.test(block)) {
    throw new Error("Dashboard outside donut label size, spacing, leader-line, or responsive positioning contract failed.");
  }
}

function testDashboardKpiAndRecentActivityLayoutContract() {
  const components = expenseFrontendSource("987.View.Components");
  const styles = expenseFrontendSource("900.View.Index");
  const presenter = expenseFrontendSource("971.View.Dashboard.Presenter");
  if (!/kpi-value/.test(components) || /kpi-value[\s\S]{0,120}truncate/.test(components) ||
      !/kpi-value--long/.test(styles) || !/kpi-value--xlong/.test(styles) ||
      !/#dashboard-activities\s*\{\s*max-height:\s*none;\s*overflow:\s*visible/.test(styles) ||
      !/activities\.slice\(0, 5\)/.test(presenter)) {
    throw new Error("Dashboard KPI large-value or Recent Activity top-five no-scroll contract failed.");
  }
}

function testGlobalNominalFormatterParserContract() {
  const format = expenseFrontendSource("986.View.Format");
  const events = expenseFrontendSource("993.View.Events.Runtime");
  const product = expenseFrontendSource("982.View.Products.Form");
  const purchasing = expenseFrontendSource("978.View.Purchasing.Presenter");
  const expenses = expenseFrontendSource("977.View.Expenses.Presenter");
  if (!/function nominalInput\(value\)/.test(format) ||
      !/replace\(\/\\D\/g, ""\)/.test(format) ||
      !/replace\(\/\\B\(\?=\(\\d\{3\}\)\+\(\?!\\d\)\)\/g, "\."\)/.test(format) ||
      !/function nominalValue\(value\)/.test(format) ||
      !/Format\.updateNominalInput\(event\.target\)/.test(events) ||
      !/data-nominal-input/.test(product) || !/data-nominal-input/.test(purchasing) ||
      !/data-nominal-input/.test(expenses)) {
    throw new Error("Shared Indonesian nominal input formatter/parser contract failed.");
  }
  if (/data-nominal-input[^>]*data-pickup-detail-field="Qty"/.test(expenseFrontendSource("974.View.Pickups.Presenter"))) {
    throw new Error("Nominal formatting was incorrectly applied to Qty.");
  }
}

function testMonetaryPayloadNumericContract() {
  const app = expenseFrontendSource("994.View.App.Runtime");
  const product = expenseFrontendSource("982.View.Products.Form");
  if (!/Harga:\s*Format\.nominalValue/.test(product) ||
      !/const price = Format\.nominalValue\(priceText\)/.test(app) ||
      !/const amount = Format\.nominalValue\(amountText\)/.test(app) ||
      !/payload:\s*\{\s*Tanggal: date,[\s\S]{0,180}Harga: price/.test(app) ||
      !/Nominal: amount/.test(app)) {
    throw new Error("Formatted monetary text is not converted to canonical numeric payloads.");
  }
}

function testPickupSuccessfulSaveModalCloseContract() {
  const app = expenseFrontendSource("994.View.App.Runtime");
  const submit = dashboardFrontendBlock(app, "async function submitPickupForm()", "async function deletePickup");
  if (!/closePickupModal\(true\)/.test(submit) ||
      (submit.match(/await loadPickups\(\)/g) || []).length !== 1 ||
      (submit.match(/Toast\.success\(/g) || []).length !== 1 ||
      !/function closePickupModal\(force=false\)/.test(app) ||
      !/state\.pickupForm=null;state\.pickupFormKind=null/.test(app) ||
      !/Modal\.close\(\)/.test(app)) {
    throw new Error("Pickup Add/Edit success does not close and reset the modal exactly once.");
  }
}

function testPickupQtyRecalculationContract() {
  const app = expenseFrontendSource("994.View.App.Runtime");
  const presenter = expenseFrontendSource("974.View.Pickups.Presenter");
  if (!/function pickupTotals\(form=state\.pickupForm\)/.test(app) ||
      !/Number\.isFinite\(qty\)&&qty>0\?qty:0/.test(app) ||
      !/function syncPickupTotals\(\)/.test(app) ||
      !/TotalItem:totals\.TotalItem,TotalQty:totals\.TotalQty/.test(app) ||
      !/function addPickupDetail\(\)[\s\S]{0,180}syncPickupTotals\(\)/.test(app) ||
      !/function removePickupDetail\(localId\)[\s\S]{0,240}syncPickupTotals\(\)/.test(app) ||
      !/if\(localId\)syncPickupTotals\(\)/.test(app) ||
      !/pickup-form-total-item/.test(presenter) || !/pickup-form-total-qty/.test(presenter)) {
    throw new Error("Pickup Add/Edit quantity recalculation contract failed.");
  }
}

function testPickupHeaderDetailQtyConsistencyContract() {
  const source = String(PickupService);
  if (!/suppliedItem/.test(source) || !/suppliedQty/.test(source) ||
      !/Number\(suppliedItem\) !== details\.length/.test(source) ||
      !/Number\(suppliedQty\) !== totalQty/.test(source) ||
      !/TotalQty header tidak sesuai/.test(source)) {
    throw new Error("Pickup backend does not reject mismatched header/detail totals.");
  }
}

function testPurchaseDateOnlyRoundTripContract() {
  const format = expenseFrontendSource("986.View.Format");
  const app = expenseFrontendSource("994.View.App.Runtime");
  const purchasing = expenseFrontendSource("978.View.Purchasing.Presenter");
  const expenses = expenseFrontendSource("977.View.Expenses.Presenter");
  const pickups = expenseFrontendSource("974.View.Pickups.Presenter");
  if (!/function dateInput\(value\)/.test(format) || !/parsed\.getFullYear\(\)/.test(format) ||
      /toISOString\(\)/.test(format) || !/function dateInput\(value\) \{ return Format\.dateInput\(value\); \}/.test(app) ||
      !/Format\.dateInput\(value\)/.test(expenses) || !/Format\.dateInput\(value\)/.test(pickups) ||
      !/type="date"/.test(purchasing)) {
    throw new Error("Purchase/shared date-only round-trip contract failed.");
  }
}

function testSettingsHeaderThemeAndRefreshCleanupContract() {
  const view = expenseFrontendSource("947.View.Settings");
  const presenter = expenseFrontendSource("980.View.Settings.Presenter");
  const app = expenseFrontendSource("994.View.App.Runtime");
  if (!/text-2xl font-bold text-slate-800">Settings/.test(view) ||
      !/text-sm text-slate-500/.test(view) || /settings-hero/.test(view) ||
      /data-settings-action="refresh"/.test(view) || /action === "refresh"/.test(app) ||
      !/data-settings-group="ui-settings"/.test(presenter) ||
      !/"UI Settings"/.test(presenter) || !/data-theme-selector/.test(presenter) ||
      !/value="dark"/.test(presenter) || !/value="light"/.test(presenter)) {
    throw new Error("Settings header, UI Settings theme category, or dead Refresh cleanup contract failed.");
  }
}

function testDashboardExpenseControlledReconciliation() {
  expenseWithFixture((row) => {
    let dashboard = DashboardService().getDashboard().data;
    let activeRows = ExpenseService().findAll().data;
    if (
      !activeRows.some((item) => item.ID === row.ID) ||
      dashboard.summary.expenseCount < 1
    ) {
      throw new Error("Active Expense fixture did not reconcile with Dashboard.");
    }

    RepositoryWriter.update(EXPENSE_SCHEMA, row.ID, { IsActive: false });
    dashboard = DashboardService().getDashboard().data;
    activeRows = ExpenseService().findAll().data;
    if (
      activeRows.some((item) => item.ID === row.ID) ||
      dashboard.summary.expenseCount !== activeRows.filter((item) => item.Tanggal >= dashboard.range.startDate && item.Tanggal <= dashboard.range.endDate).length
    ) {
      throw new Error("Inactive Expense fixture was included by Dashboard.");
    }

    RepositoryWriter.update(EXPENSE_SCHEMA, row.ID, { IsActive: true });
    ExpenseService().remove(row.ID);
    dashboard = DashboardService().getDashboard().data;
    activeRows = ExpenseService().findAll().data;
    if (
      activeRows.some((item) => item.ID === row.ID) ||
      dashboard.summary.expenseCount !== activeRows.filter((item) => item.Tanggal >= dashboard.range.startDate && item.Tanggal <= dashboard.range.endDate).length
    ) {
      throw new Error("Deleted Expense fixture was included by Dashboard.");
    }
  }, expenseTestDocument({ Tanggal: "2026-07-22", Nominal: 125.5 }));
}

function testDashboardPurchasingControlledReconciliation() {
  purchasingWithFixture((fixture, remember) => {
    const row = purchasingCreateFixture(fixture, { Tanggal: "2026-07-22", Qty: 2, Harga: 25 });
    remember(row);
    const response = DashboardService().getDashboard({ preset: "CUSTOM", startDate: "2026-07-22", endDate: "2026-07-22" });
    if (!response.success || response.data.summary.purchasingValue < Number(row.Total) ||
        response.data.purchasingTrend.total !== response.data.summary.purchasingValue) {
      throw new Error("Controlled Purchasing fixture did not reconcile with Dashboard.");
    }
  });
}

function testDashboardControllerAndFrontendContracts() {
  const failed = _dashboardControllerResponse(() => {
    throw new Error("controlled Dashboard Controller test error");
  });
  if (failed.success !== false || failed.message !== "Terjadi kesalahan saat memproses dashboard.") {
    throw new Error("Dashboard Controller exception boundary is invalid.");
  }

  const api = expenseFrontendSource("965.View.API");
  const app = expenseFrontendSource("994.View.App.Runtime");
  const presenter = expenseFrontendSource("971.View.Dashboard.Presenter");
  if (
    !/return run\("getDashboard", range\)/.test(api) ||
    !/request !== dashboardRequest \|\| state\.page !== "dashboard"/.test(app) ||
    !/catch \(error\)[\s\S]*DashboardPresenter\.renderError\(\)/.test(app) ||
    !/function renderError\(/.test(presenter) ||
    !/destroyCharts\(\)/.test(presenter) ||
    /Api\.Dashboard/.test(presenter)
  ) {
    throw new Error("Dashboard API/App/Presenter production-readiness contract failed.");
  }
}

function dashboardFrontendBlock(source, start, end) {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) throw new Error(`Dashboard source contract is missing: ${start}`);
  const endIndex = end ? source.indexOf(end, startIndex + start.length) : source.length;
  return source.slice(startIndex, endIndex < 0 ? source.length : endIndex);
}

function testDashboardViewDeclarativeContract() {
  const view = expenseFrontendSource("915.View.Dashboard");
  const required = [
    "dashboard-preset", "dashboard-start", "dashboard-end", "dashboard-kpi",
    "chart-overview", "chart-distribution", "dashboard-activities", "dashboard-statistics",
  ];
  required.forEach((id) => {
    if (!view.includes(`id="${id}"`)) throw new Error(`Dashboard View is missing #${id}.`);
  });
  if (/<script|google\.script\.run|\bApi\.|\bApp\.|\bPromise\b|\basync\b|\bawait\b|addEventListener|onclick\s*=/.test(view)) {
    throw new Error("Dashboard View contains transport, orchestration, or event behavior.");
  }
}

function testDashboardEventDelegationContract() {
  const events = expenseFrontendSource("993.View.Events.Runtime");
  const block = dashboardFrontendBlock(events, "function bindDashboard()", "function bindPurchasing()");
  if ((events.match(/function bindDashboard\(/g) || []).length !== 1 ||
      (events.match(/bindDashboard\(\);/g) || []).length !== 1 ||
      (block.match(/document\.addEventListener\("change", handleDashboardChange\)/g) || []).length !== 1 ||
      !/App\.changeDashboardRange\(\)/.test(block)) {
    throw new Error("Dashboard Event binding or App delegation is invalid.");
  }
  if (/\bApi\.|DashboardPresenter|google\.script\.run|\bPromise\b|\basync\b|\bawait\b|\bToast\.|\bstate\b|new Chart/.test(block)) {
    throw new Error("Dashboard Event owns orchestration, rendering, state, or transport.");
  }
}

function testDashboardAppOrchestrationContract() {
  const app = expenseFrontendSource("994.View.App.Runtime");
  const load = dashboardFrontendBlock(app, "async function loadDashboard()", "function changeDashboardRange()");
  const change = dashboardFrontendBlock(app, "function changeDashboardRange()", "//===========================================================================\n    // Products");
  const navigate = dashboardFrontendBlock(app, "async function navigate(page)", "function currentPage()");
  const refresh = dashboardFrontendBlock(app, "async function refresh()", "//===========================================================================\n    // Pagination");
  ["dashboard", "dashboardRange", "dashboardRangeControls", "dashboardLoading", "dashboardError", "dashboardRequest"].forEach((name) => {
    if (!app.includes(name)) throw new Error(`Dashboard App state is missing: ${name}`);
  });
  if ((load.match(/Api\.Dashboard\.get\(/g) || []).length !== 1 ||
      (load.match(/DashboardPresenter\.render\(state\.dashboard\)/g) || []).length !== 1 ||
      !/request !== dashboardRequest \|\| state\.page !== "dashboard"/.test(load) ||
      !/finally[\s\S]*request === dashboardRequest[\s\S]*dashboardLoading = false/.test(load) ||
      !/normalizeDashboardData\(response\.data\)/.test(load)) {
    throw new Error("Dashboard App request orchestration is invalid.");
  }
  if (!/dashboardRequest \+= 1/.test(navigate) || !/DashboardPresenter\.destroyCharts\(\)/.test(navigate)) {
    throw new Error("Dashboard navigation does not invalidate pending work and charts.");
  }
  if ((refresh.match(/case "dashboard"/g) || []).length !== 1 ||
      (refresh.match(/await loadDashboard\(\)/g) || []).length !== 1 ||
      (change.match(/loadDashboard\(\)/g) || []).length !== 1) {
    throw new Error("Dashboard route, refresh, or range intent can issue duplicate loads.");
  }
  if (!/changeDashboardRange,/.test(app)) throw new Error("Event-called App.changeDashboardRange is not public.");
  if (/DashboardService|Controller|Repository|SpreadsheetApp|AuditLogService/.test(load + change)) {
    throw new Error("Dashboard App crosses the browser-server architecture boundary.");
  }
}

function testDashboardApiTransportContract() {
  const api = expenseFrontendSource("965.View.API");
  const block = dashboardFrontendBlock(api, "const Dashboard = Object.freeze({", "//===========================================================================\n    // Settings");
  if ((block.match(/get\(range\)/g) || []).length !== 1 ||
      (block.match(/run\("getDashboard", range\)/g) || []).length !== 1 ||
      !/\.catch\(\(error\)/.test(block) ||
      !/function run\(fn, \.\.\.args\)[\s\S]*return new Promise/.test(api) ||
      !/google\.script\.run/.test(api)) {
    throw new Error("Dashboard API Promise transport or error normalization is invalid.");
  }
  if (/\bDOM\.|document\.|DashboardPresenter|\bChart\b|\bToast\.|dashboardRequest|state\./.test(block)) {
    throw new Error("Dashboard API contains DOM, chart, toast, or App state behavior.");
  }
}

function testDashboardPresenterRenderOnlyContract() {
  const presenter = expenseFrontendSource("971.View.Dashboard.Presenter");
  const forbidden = /\bApi\.|google\.script\.run|\bPromise\b|\basync\b|\bawait\b|\bApp\.|addEventListener|\bToast\.|\bDialog\.|\bModal\.|SpreadsheetApp|Repository|Controller|Service|AuditLogService|dashboardRequest|requestSequence/;
  if (forbidden.test(presenter)) throw new Error("DashboardPresenter is not render-only.");
  ["render", "renderLoading", "renderError", "renderRangeError", "renderRangeControls", "destroyCharts"].forEach((name) => {
    if (!new RegExp(`\\b${name}\\b`).test(presenter)) throw new Error(`DashboardPresenter.${name} is missing.`);
  });
  const app = expenseFrontendSource("994.View.App.Runtime");
  ["render", "renderLoading", "renderError", "renderRangeError", "renderRangeControls", "destroyCharts"].forEach((name) => {
    if (app.includes(`DashboardPresenter.${name}(`) && !presenter.includes(`${name},`) && !presenter.includes(`${name} }`)) {
      throw new Error(`App-called DashboardPresenter.${name} is not public.`);
    }
  });
  const shared = expenseFrontendSource("976.View.Shared.Presenter");
  if (/dashboard-|Dashboard|chart-overview|chart-distribution/.test(shared)) {
    throw new Error("SharedPresenter contains Dashboard-specific rendering.");
  }
}

function testDashboardChartLifecycleContract() {
  const presenter = expenseFrontendSource("971.View.Dashboard.Presenter");
  const destroy = dashboardFrontendBlock(presenter, "function destroyCharts()", "function render(data)");
  const renderCharts = dashboardFrontendBlock(presenter, "function renderCharts(data)", "return Object.freeze");
  if (!/trendChart\.destroy\(\)/.test(destroy) || !/breakdownChart\.destroy\(\)/.test(destroy) ||
      !/trendChart = null/.test(destroy) || !/breakdownChart = null/.test(destroy) ||
      renderCharts.indexOf("destroyCharts();") < 0 || renderCharts.indexOf("destroyCharts();") > renderCharts.indexOf("new Chart")) {
    throw new Error("Dashboard chart replacement does not destroy existing instances first.");
  }
  if (!/function renderError[\s\S]*destroyCharts\(\)/.test(presenter)) {
    throw new Error("Dashboard error rendering does not clear obsolete charts.");
  }
}

function testDashboardFrontendRegistrationContract() {
  const expected = [
    testDashboardViewDeclarativeContract,
    testDashboardEventDelegationContract,
    testDashboardAppOrchestrationContract,
    testDashboardApiTransportContract,
    testDashboardPresenterRenderOnlyContract,
    testDashboardChartLifecycleContract,
    testDashboardFrontendRegistrationContract,
  ].map((test) => test.name);
  const registered = DASHBOARD_FRONTEND_ARCHITECTURE_TESTS().map((test) => test.name);
  if (registered.length !== expected.length || new Set(registered).size !== registered.length ||
      expected.some((name) => registered.indexOf(name) < 0)) {
    throw new Error("Dashboard frontend architecture tests are missing or registered more than once.");
  }
}

/**
 * Manual, read-only Pickup/Return production integrity diagnostic.
 * This deliberately reads physical rows and never calls a service or writer.
 */
function pickupReturnIntegrityFixture(overrides) {
  const fixture = {
    headers: [{ ID: "PH1", TotalItem: 1, TotalQty: 10, Deleted: false, IsActive: true }],
    details: [{ ID: "PD1", PickupID: "PH1", ProductID: "P1", Qty: 10, Deleted: false, IsActive: true }],
    returns: [{ ID: "RT1", PickupID: "PH1", PickupDetailID: "PD1", Qty: 2, Deleted: false, IsActive: true }],
  };
  return Object.assign(fixture, overrides || {});
}

function pickupReturnIntegrityAnalyzeFixture(fixture) {
  return analyzePickupReturnIntegrity(fixture.headers, fixture.details, fixture.returns, {
    generatedAt: "2026-07-20T00:00:00.000Z",
  });
}

function pickupReturnIntegrityAssert(condition, message) {
  if (!condition) throw new Error(message);
}

function testPickupReturnIntegrityCleanDataset() {
  const report = pickupReturnIntegrityAnalyzeFixture(pickupReturnIntegrityFixture());
  pickupReturnIntegrityAssert(report.summary.pass && report.summary.criticalIssues === 0, "Clean integrity fixture must pass.");
}

function testPickupReturnIntegrityRelationFailures() {
  let fixture = pickupReturnIntegrityFixture({ details: [] });
  let report = pickupReturnIntegrityAnalyzeFixture(fixture);
  pickupReturnIntegrityAssert(report.issues.missingPickupDetailReferences.length === 1 && !report.summary.pass, "Missing active detail must be critical.");
  fixture = pickupReturnIntegrityFixture({ details: [{ ID: "PD1", PickupID: "PH1", ProductID: "P1", Qty: 10, Deleted: true, IsActive: false }] });
  report = pickupReturnIntegrityAnalyzeFixture(fixture);
  pickupReturnIntegrityAssert(report.issues.inactivePickupDetailReferences.length === 1 && report.summary.criticalIssues > 0, "Deleted detail relation must be critical.");
  fixture = pickupReturnIntegrityFixture({ details: [{ ID: "PD1", PickupID: "PH2", ProductID: "P1", Qty: 10, Deleted: false, IsActive: true }] });
  report = pickupReturnIntegrityAnalyzeFixture(fixture);
  pickupReturnIntegrityAssert(report.issues.pickupHeaderDetailMismatches.length === 1, "Pickup ownership mismatch was not reported.");
}

function testPickupReturnIntegrityQuantityHistory() {
  let fixture = pickupReturnIntegrityFixture({ returns: [{ ID: "RT1", PickupID: "PH1", PickupDetailID: "PD1", Qty: 11, Deleted: false, IsActive: true }] });
  let report = pickupReturnIntegrityAnalyzeFixture(fixture);
  pickupReturnIntegrityAssert(report.issues.activeReturnQuantityOverruns.length === 1, "Active quantity overrun was not reported.");
  fixture = pickupReturnIntegrityFixture({ returns: [
    { ID: "RT1", PickupID: "PH1", PickupDetailID: "PD1", Qty: 8, Deleted: false, IsActive: true },
    { ID: "RT2", PickupID: "PH1", PickupDetailID: "PD1", Qty: 5, Deleted: true, IsActive: false },
  ] });
  report = pickupReturnIntegrityAnalyzeFixture(fixture);
  pickupReturnIntegrityAssert(report.issues.activeReturnQuantityOverruns.length === 0 && report.issues.historicalReturnQuantityOverruns.length === 1, "Deleted Return must affect historical quantity only.");
}

function testPickupReturnIntegrityDetailGenerationRisks() {
  const fixture = pickupReturnIntegrityFixture({
    headers: [{ ID: "PH1", TotalItem: 1, TotalQty: 5, Deleted: true, IsActive: false }],
    details: [
      { ID: "PD1", PickupID: "PH1", ProductID: "P1", Qty: 5, Deleted: false, IsActive: true },
      { ID: "PD2", PickupID: "PH1", ProductID: "P1", Qty: 5, Deleted: true, IsActive: false },
    ],
    returns: [{ ID: "RT1", PickupID: "PH1", PickupDetailID: "PD2", Qty: 1, Deleted: true, IsActive: false }],
  });
  const report = pickupReturnIntegrityAnalyzeFixture(fixture);
  pickupReturnIntegrityAssert(report.issues.multipleDetailGenerations.length === 1, "Mixed detail generations warning is missing.");
  pickupReturnIntegrityAssert(report.issues.potentiallyObsoleteDeletedDetails.length === 1, "Obsolete deleted detail warning is missing.");
  pickupReturnIntegrityAssert(report.issues.restoreReactivationRisks.length === 1, "Restore reactivation warning is missing.");
}

function testPickupReturnIntegrityDuplicateProductsAndTotals() {
  const fixture = pickupReturnIntegrityFixture({
    details: [
      { ID: "PD1", PickupID: "PH1", ProductID: "P1", Qty: 4, Deleted: false, IsActive: true },
      { ID: "PD2", PickupID: "PH1", ProductID: "P1", Qty: 3, Deleted: false, IsActive: true },
    ],
    returns: [],
  });
  const report = pickupReturnIntegrityAnalyzeFixture(fixture);
  pickupReturnIntegrityAssert(report.issues.duplicateActiveProducts.length === 1 && !report.summary.pass, "Duplicate active ProductID must be critical.");
  pickupReturnIntegrityAssert(report.issues.pickupHeaderTotalMismatches.length === 1, "Header totals mismatch was not reported.");
}

function testPickupReturnIntegrityDecimalAndInvalidNumbers() {
  let fixture = pickupReturnIntegrityFixture({
    headers: [{ ID: "PH1", TotalItem: 1, TotalQty: 1.5, Deleted: false, IsActive: true }],
    details: [{ ID: "PD1", PickupID: "PH1", ProductID: "P1", Qty: 1.5, Deleted: false, IsActive: true }],
    returns: [{ ID: "RT1", PickupID: "PH1", PickupDetailID: "PD1", Qty: 0.75, Deleted: false, IsActive: true }],
  });
  let report = pickupReturnIntegrityAnalyzeFixture(fixture);
  pickupReturnIntegrityAssert(report.issues.activeReturnQuantityOverruns.length === 0 && report.issues.invalidNumericQuantities.length === 0, "Valid decimal quantities were rejected.");
  fixture = pickupReturnIntegrityFixture({ returns: [{ ID: "RT1", PickupID: "PH1", PickupDetailID: "PD1", Qty: "not-a-number", Deleted: false, IsActive: true }] });
  report = pickupReturnIntegrityAnalyzeFixture(fixture);
  pickupReturnIntegrityAssert(report.issues.invalidNumericQuantities.length === 1 && JSON.stringify(report).indexOf("NaN") === -1, "Invalid Qty must be explicit and must not create NaN.");
}

function testPickupReturnIntegrityDeterminismAndImmutability() {
  const fixture = pickupReturnIntegrityFixture();
  const before = JSON.stringify(fixture);
  const first = pickupReturnIntegrityAnalyzeFixture(fixture);
  const second = pickupReturnIntegrityAnalyzeFixture(fixture);
  pickupReturnIntegrityAssert(JSON.stringify(first) === JSON.stringify(second), "Integrity analysis must be deterministic for the same dataset.");
  pickupReturnIntegrityAssert(JSON.stringify(fixture) === before, "Integrity analysis mutated its source arrays.");
}

function testPickupReturnIntegrityReadOnlyConstruction() {
  const source = runPickupReturnIntegrityDiagnostic.toString() + pickupReturnIntegrityReadPhysicalRows.toString();
  const forbidden = /RepositoryWriter|\.create\s*\(|\.update\s*\(|\.remove\s*\(|\.restore\s*\(|\.append\s*\(|\.setValue[s]?\s*\(|\.deleteRow\s*\(|\.clear\s*\(/;
  pickupReturnIntegrityAssert(!forbidden.test(source), "Production integrity diagnostic contains a mutating call.");
  pickupReturnIntegrityAssert(/RepositoryReader\.raw/.test(source) && /RepositoryBase\.mapRows/.test(source), "Production integrity diagnostic must read mapped physical rows.");
}
