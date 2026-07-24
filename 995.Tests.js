/**
 * Shared runners only. Write-heavy Pickup tests are intentionally excluded from
 * runAllSafeTests and must be invoked through their explicit runners.
 */

let activeTestRegistry = null;

let activeAggregateStartedAt = null;

let activePurchasingFixtureCount = null;

function runTestSuite(name, tests, options) {
  const suiteStartedAt = Date.now();
  const settings = options || {};
  const fixtureCount = () => typeof settings.fixtureCount === "function" ? settings.fixtureCount() : 0;
  const getAggregateElapsed = () => activeAggregateStartedAt ? Date.now() - activeAggregateStartedAt : Date.now() - suiteStartedAt;
  Logger.log(settings.reportTiming
    ? `START: ${name} (${tests.length} registered tests; aggregate ${getAggregateElapsed()} ms; fixtures ${fixtureCount()})`
    : `START: ${name}`);

  let currentTest = null;
  const selectedTests = activeTestRegistry
    ? tests.filter((test) => {
        if (activeTestRegistry.has(test.name)) {
          Logger.log(`SKIP DUPLICATE: ${test.name}`);
          return false;
        }

        activeTestRegistry.add(test.name);
        return true;
      })
    : tests;

  try {
    selectedTests.forEach((test) => {
      currentTest = test;
      const testStartedAt = Date.now();
      Logger.log(settings.reportTiming
        ? `RUN: ${test.name} (suite ${testStartedAt - suiteStartedAt} ms; aggregate ${getAggregateElapsed()} ms; fixtures ${fixtureCount()})`
        : `RUN: ${test.name}`);
      test();
      Logger.log(settings.reportTiming
        ? `PASS: ${test.name} (test ${Date.now() - testStartedAt} ms; suite ${Date.now() - suiteStartedAt} ms; aggregate ${getAggregateElapsed()} ms; fixtures ${fixtureCount()})`
        : `PASS: ${test.name}`);
    });
  } catch (error) {
    const suiteElapsed = Date.now() - suiteStartedAt;
    const aggregateElapsed = activeAggregateStartedAt ? Date.now() - activeAggregateStartedAt : suiteElapsed;
    Logger.log(
      settings.reportTiming
        ? `FAIL: ${currentTest ? currentTest.name : name} - ${error.message} (suite ${suiteElapsed} ms; aggregate ${aggregateElapsed} ms; fixtures ${fixtureCount()})`
        : `FAIL: ${currentTest ? currentTest.name : name} - ${error.message} (suite ${suiteElapsed} ms; aggregate ${aggregateElapsed} ms)`,
    );
    throw error;
  }

  const suiteElapsed = Date.now() - suiteStartedAt;
  const aggregateElapsed = activeAggregateStartedAt ? Date.now() - activeAggregateStartedAt : suiteElapsed;
  Logger.log(settings.reportTiming
    ? `COMPLETE: ${name} (${selectedTests.length} tests; suite ${suiteElapsed} ms; aggregate ${aggregateElapsed} ms; fixtures ${fixtureCount()})`
    : `COMPLETE: ${name} (${selectedTests.length} tests; suite ${suiteElapsed} ms; aggregate ${aggregateElapsed} ms)`);
}

function runCoreRegressionTests() {
  runTestSuite("Core regression tests", [
    testCoreValidator,
    testCoreResponse,
    testRepositoryCacheOversizedValueBypass,
  ]);
}

function runPurchasingDataAudit() {
  return auditPurchasingData();
}

function runMasterDataRegressionTests() {
  runTestSuite("Master-data regression tests", [
    testProductService,
    testProductDeletedListAndRestoreGuards,
    testProductRestoreSourceContracts,
    testPartnerDeletedListAndRestoreGuards,
    testPartnerService,
    testCanonicalPaginationSourceContracts,
    testCanonicalPaginationCalculations,
  ]);
}

function runTransactionReadTests() {
  runTestSuite("Transaction read tests", [
    testTransactionServicePublicApi,
    testTransactionServiceFindAll,
    testTransactionServiceFindByIdValidation,
    testTransactionServiceFindByIdResponseShape,
    testPickupServicePublicApi,
    testPickupServiceFindAll,
    testPickupServiceFindByIdValidation,
    testPickupServiceHeaderDetailRead,
  ]);
}

function runPickupCreateValidationTests() {
  runTestSuite("Pickup create validation tests", [
    testPickupCreateMissingDocument,
    testPickupCreateMissingHeader,
    testPickupCreateEmptyDetails,
    testPickupCreateMissingTanggal,
    testPickupCreateInvalidTanggal,
    testPickupCreateMissingPartnerId,
    testPickupCreateInvalidPartnerId,
    testPickupCreateMissingProductId,
    testPickupCreateInvalidProductId,
    testPickupCreateInvalidQty,
    testPickupCreateDuplicateProductId,
  ]);
}

function runPickupCreateWriteTests() {
  runTestSuite("Pickup create write tests", [
    testPickupCreateValidSingleItem,
    testPickupCreateValidMultiItem,
    testPickupDateNormalization,
  ]);
}

function runPickupPresenterDateTests() {
  runTestSuite("Pickup presenter date tests", [
    testPickupPresenterDateContract,
  ]);
}

function runPickupUpdateValidationTests() {
  runTestSuite("Pickup update validation tests", [
    testPickupUpdateMissingId,
    testPickupUpdateUnknownId,
    testPickupUpdateMissingDocument,
    testPickupUpdateMissingHeader,
    testPickupUpdateEmptyDetails,
    testPickupUpdateMissingTanggal,
    testPickupUpdateMissingPartnerId,
    testPickupUpdateInvalidPartnerId,
    testPickupUpdateMissingProductId,
    testPickupUpdateInvalidProductId,
    testPickupUpdateInvalidQty,
    testPickupUpdateDuplicateProductId,
  ]);
}

function runPickupUpdateWriteTests() {
  runTestSuite("Pickup update write tests", [
    testPickupUpdateSingleToMultiItem,
    testPickupUpdateMultiToSingleItem,
    testPickupUpdatePreservesHeaderIdentity,
    testPickupUpdateRecalculatesTotals,
    testPickupUpdateReplacesActiveDetails,
  ]);
}

function runPickupRemoveRestoreTests() {
  runTestSuite("Pickup remove and restore tests", [
    testPickupRemoveMissingId,
    testPickupRemoveUnknownId,
    testPickupRemoveHeaderAndDetails,
    testPickupRemovePreservesIdentity,
    testPickupRemoveDoesNotAffectOtherPickup,
    testPickupRemoveAlreadyDeleted,
    testPickupRestoreMissingId,
    testPickupRestoreUnknownId,
    testPickupIntegrityRestorePreflight,
  ]);
}

function runPickupRestoreEligibilityTests() {
  runTestSuite("Pickup restore eligibility tests", [
    testPickupRestoreEligibilitySafe,
    testPickupRestoreEligibilityMultipleGenerations,
    testPickupRestoreEligibilityAmbiguousReturns,
    testPickupRestoreEligibilityMissingDetail,
    testPickupRestoreEligibilityRelationshipMismatch,
    testPickupRestoreEligibilityActivePickup,
    testPickupRestoreEligibilityMissingPickup,
    testPickupRestoreEligibilityPerformsZeroWrites,
    testPickupRestoreEligibilityIsDeterministic,
  ]);
}

function runPickupTrashReadTests() {
  runTestSuite("Pickup Trash read tests", [
    testPickupTrashReadFilteringAndShape,
    testPickupTrashReadSortingAndSearch,
    testPickupTrashReadEligibilityResults,
    testPickupTrashReadBoundedDependencyReads,
    testPickupTrashReadPerformsZeroWrites,
    testPickupTrashReadController,
  ]);
}

/** Manual write suite. Fixtures are created explicitly and may require cleanup. */
function runPickupReturnIntegrityGuardTests() {
  runTestSuite("Pickup-Return backend integrity guard tests", [
    testPickupUpdateReplacesActiveDetails,
    testPickupIntegrityHeaderOnlyAndReorder,
    testPickupIntegrityBlocksDetailMutations,
    testPickupIntegrityDeletedReturnAndDeleteGuards,
    testPickupIntegrityRestorePreflight,
    testReturnIntegrityRejectsMismatchedPair,
    testReturnCreateValid,
    testReturnUpdateValid,
    testReturnRestoreValid,
  ]);
}

function runPickupControllerTests() {
  runTestSuite("Pickup controller tests", [
    testPickupControllerPublicApi,
    testPickupControllerGetPickups,
    testPickupControllerGetPickupValidation,
    testPickupControllerCreateValidation,
    testPickupControllerUpdateValidation,
    testPickupControllerDeleteValidation,
    testPickupControllerRestoreValidation,
    testPickupControllerSerialization,
  ]);
}

function runReturnControllerTests() {
  runTestSuite("Return controller tests", [
    testReturnControllerPublicApi,
    testReturnControllerGetReturns,
    testReturnControllerGetDeletedReturns,
    testReturnControllerGetReturnValidation,
    testReturnControllerCreateValidation,
    testReturnControllerUpdateValidation,
    testReturnControllerDeleteValidation,
    testReturnControllerRestoreValidation,
    testReturnControllerSerialization,
    testReturnControllerDeletedSerialization,
    testReturnUxConsistencySourceContracts,
  ]);
}

function runReturnDeletedListTests() {
  runTestSuite("Return deleted-list tests", [
    testReturnFindDeletedEmpty,
    testReturnFindDeletedOnlyDeleted,
    testReturnFindDeletedExcludesActive,
    testReturnFindDeletedStatusCompatibility,
  ]);
}

function runReturnDisplayEnrichmentTests() {
  runTestSuite("Return display enrichment tests", [
    testReturnDisplayActiveAndHistoricalResolution,
    testReturnDisplayMissingRelationshipFallbacks,
    testReturnDeletedBatchEligibilityReads,
    testPickupReturnAggregatePhaseRegistration,
    testReturnDisplayMismatchPreservesStoredRelationship,
    testReturnDisplayBatchReadsAndDeterminism,
    testReturnDisplayEmptyListsAndReadOnlyStructure,
  ]);
}

function runReturnRestoreValidationTests() {
  runTestSuite("Return restore validation tests", [
    testReturnRestoreMissingId,
    testReturnRestoreUnknownId,
    testReturnRestoreAlreadyActive,
    testReturnRestoreStatusCompatibility,
    testReturnRestoreRejectsInactivePickupHeader,
    testReturnRestoreRejectsInactivePickupDetail,
    testReturnRestoreValid,
    testReturnRestoreRejectsOverQuantity,
  ]);
}

function runReturnSchemaTests() {
  runTestSuite("Return schema tests", [
    testReturnSchemaTableAndPrefix,
    testReturnSchemaHeaders,
    testReturnSchemaFields,
    testReturnSchemaValidationMetadata,
    testReturnSchemaRegistry,
  ]);
}

function runReturnValidationTests() {
  runTestSuite("Return validation tests", [
    testReturnServicePublicApi,
    testReturnCreateMissingDocument,
    testReturnCreateMissingPickupDetailId,
    testReturnCreateMissingTanggal,
    testReturnCreateInvalidQty,
    testReturnCreateUnknownPickupDetail,
    testReturnUpdateMissingId,
    testReturnRemoveMissingId,
    testReturnRestoreMissingId,
  ]);
}

function runReturnWriteTests() {
  runTestSuite("Return write tests", [
    testReturnCreateValid,
    testReturnCreateDerivesPickupId,
    testReturnCreateRejectsOverQuantity,
    testReturnCreateUsesCumulativeQuantity,
    testReturnUpdateValid,
    testReturnUpdatePreservesRelation,
    testReturnUpdateExcludesCurrentQty,
    testReturnUpdateRejectsOverQuantity,
    testReturnRemoveReleasesQuantity,
    testReturnRemoveSoftDeleteState,
    testReturnRestoreValid,
    testReturnRestoreRejectsOverQuantity,
    testReturnFindByIdResolvedData,
  ]);
}

/** Manual write suite for serialized Return quantity mutation guards. */
function runReturnConcurrencyGuardTests() {
  runTestSuite("Return concurrency guard tests", [
    testReturnConcurrencyLockStructure,
    testReturnMutationLockTimeoutIsControlledAndWriteFree,
    testReturnSequentialRestoresRevalidateCumulativeQty,
    testReturnCreateThenRestoreRevalidatesCumulativeQty,
    testReturnUpdateThenRestoreRevalidatesCumulativeQty,
    testReturnCreateValid,
    testReturnCreateRejectsOverQuantity,
    testReturnUpdateValid,
    testReturnUpdateRejectsOverQuantity,
    testReturnRestoreValid,
    testReturnRestoreRejectsOverQuantity,
    testReturnRestoreAlreadyActive,
    testReturnRestoreRejectsInactivePickupHeader,
    testReturnRestoreRejectsInactivePickupDetail,
    testReturnIntegrityRejectsMismatchedPair,
    testReturnRemoveReleasesQuantity,
    testReturnUpdatePreservesRelation,
  ]);
}

/** Pure fixture tests only. The production diagnostic remains explicitly manual. */
function runPickupReturnIntegrityDiagnosticTests() {
  runTestSuite("Pickup-Return integrity diagnostic tests", [
    testPickupReturnIntegrityCleanDataset,
    testPickupReturnIntegrityRelationFailures,
    testPickupReturnIntegrityQuantityHistory,
    testPickupReturnIntegrityDetailGenerationRisks,
    testPickupReturnIntegrityDuplicateProductsAndTotals,
    testPickupReturnIntegrityDecimalAndInvalidNumbers,
    testPickupReturnIntegrityDeterminismAndImmutability,
    testPickupReturnIntegrityReadOnlyConstruction,
  ]);
}

const PURCHASING_READ_SERVICE_TESTS = [
    testPurchasingServicePublicApi,
    testPurchasingStatisticsEmpty,
    testPurchasingStatisticsResponseShape,
    testDashboardPurchasingStatisticsCompatibility,
    testPurchasingFindAllActiveOnly,
    testPurchasingFindByIdValidation,
];

const PURCHASING_MUTATION_VALIDATION_TESTS = [
    testPurchasingCreateRequiresTanggal,
    testPurchasingCreateRequiresSupplier,
    testPurchasingCreateRequiresProduct,
    testPurchasingCreateRejectsQtyZero,
    testPurchasingCreateRejectsQtyNegative,
    testPurchasingCreateRejectsQtyInfinity,
    testPurchasingCreateRejectsHargaNegative,
    testPurchasingCreateRejectsHargaInfinity,
    testPurchasingCreateRejectsNonSupplierPartner,
    testPurchasingCreateRejectsInactiveSupplier,
    testPurchasingCreateRejectsInactiveProduct,
];

function runPurchasingValidationTests() {
  runTestSuite("Purchasing validation tests", PURCHASING_READ_SERVICE_TESTS.concat(PURCHASING_MUTATION_VALIDATION_TESTS));
}

function runExpenseValidationTests() {
  runTestSuite("Expense validation tests", [
    testExpenseServicePublicApi,
    testExpenseValidationAndNormalization,
    testExpenseUpdateValidationAndNormalization,
  ]);
}

function runExpenseWriteTests() {
  runTestSuite("Expense write tests", [
    testExpenseCreateNormalization,
    testExpenseSoftDeleteAndActiveReads,
    testExpenseStatisticsAndDashboardCompatibility,
  ]);
}

function runExpenseRestoreTests() {
  runTestSuite("Expense restore tests", [
    testExpenseRestoreValid,
    testExpenseRestoreRejectsInvalidStates,
    testExpenseRestoreRejectsInvalidStoredRow,
  ]);
}

function runExpenseDeletedListTests() {
  runTestSuite("Expense deleted-list tests", [testExpenseFindDeleted]);
}

function runExpenseControllerTests() {
  runTestSuite("Expense controller tests", [
    testExpenseControllerPublicApi,
    testExpenseControllerGetExpenses,
    testExpenseControllerGetValidation,
    testExpenseControllerGetDeletedExpenses,
    testExpenseControllerCreateValidation,
    testExpenseControllerUpdateValidation,
    testExpenseControllerDeleteValidation,
    testExpenseControllerRestoreValidation,
    testExpenseControllerSerialization,
    testExpenseControllerDateSerialization,
    testExpenseControllerExceptionBoundary,
    testExpenseDashboardCompatibility,
  ]);
}

function runExpenseApiTests() {
  runTestSuite("Expense browser API tests", [
    testExpenseApiPublicApi,
    testExpenseApiPromiseTransportBoundary,
  ]);
}

function runExpenseControllerApiTests() {
  runExpenseControllerTests();
  runExpenseApiTests();
}

function runExpenseAllTests() {
  runExpenseValidationTests();
  runExpenseWriteTests();
  runExpenseRestoreTests();
  runExpenseDeletedListTests();
}

/**
 * Read-only physical-row inventory for Expense Nominal cleanup decisions.
 */
function runExpenseNominalCleanupDiagnostic() {
  return diagnoseExpenseNominalCleanup();
}

/**
 * One-time, fail-closed cleanup for three explicitly identified test fixtures.
 */
function runExpenseControlledFixtureCleanup() {
  return cleanupExpenseControlledFixtures();
}

/**
 * Sprint 5.1.0 aggregate Expense module acceptance runner.
 * This is the only function that must be executed manually for this sprint.
 * It includes a read-only production-data audit and controlled write fixtures.
 */
function runExpenseModuleAcceptance() {
  if (activeTestRegistry) {
    throw new Error("An aggregate test run is already active.");
  }

  let finalResult = "FAIL";
  let finalDetail = "";

  try {
    Logger.log("EXPENSE ACCEPTANCE: PRODUCTION DATA AUDIT");
    const audit = auditExpenseLiveData();

    if (!audit || audit.assessment !== "SAFE_TO_HARDEN") {
      const assessment = audit?.assessment || "BLOCKED";
      const reasons = Array.isArray(audit?.reasons)
        ? audit.reasons.join(" | ")
        : "Expense production data audit did not pass.";
      throw new Error(`Expense production data audit ${assessment}: ${reasons}`);
    }

    activeTestRegistry = new Set();

    Logger.log("EXPENSE ACCEPTANCE: SERVICE AND DATA INTEGRITY");
    runExpenseValidationTests();
    runExpenseWriteTests();
    runExpenseRestoreTests();
    runExpenseDeletedListTests();

    Logger.log("EXPENSE ACCEPTANCE: CONTROLLER AND BROWSER API");
    runExpenseControllerTests();
    runExpenseApiTests();

    Logger.log("EXPENSE ACCEPTANCE: APP, PRESENTER, VIEW, AND EVENTS");
    runTestSuite("Expense frontend acceptance tests", [
      testExpenseFrontendArchitectureAndSearchContract,
      testExpenseFrontendCrudAndTrashContract,
      testExpenseFrontendValidationAndDisplayContract,
    ]);

    finalResult = "PASS";
    finalDetail = `${activeTestRegistry.size} unique tests`;
  } catch (error) {
    finalDetail = error.message;
    throw error;
  } finally {
    activeTestRegistry = null;
    Logger.log(
      `EXPENSE MODULE ACCEPTANCE SUMMARY: ${finalResult} - ${finalDetail}`,
    );
  }
}

function runDashboardFocusedTests() {
  runTestSuite("Dashboard focused tests", [
    testDashboardEmptyAndNumericSafety,
    testDashboardRangeMetricsAndAvailability,
    testDashboardDateRangeContract,
    testDashboardRecentActivityStableOrdering,
    testDashboardControllerAndFrontendContracts,
    testDashboardExpenseControlledReconciliation,
    testDashboardPurchasingControlledReconciliation,
  ]);
}

/** Sprint 6.3.0: the only function the user must execute manually. */
function runDashboardSupportedMetricsAcceptance() {
  if (activeTestRegistry) throw new Error("An aggregate test run is already active.");
  let finalResult = "FAIL";
  let finalDetail = "";
  try {
    Logger.log("DASHBOARD 6.3.0: READ-ONLY PRODUCTION AUDIT");
    const audit = auditDashboardLiveData();
    if (!audit || audit.assessment !== "SAFE_TO_TEST") {
      throw new Error(`Dashboard production audit BLOCKED: ${(audit?.issues || []).join(" | ")}`);
    }
    activeTestRegistry = new Set();
    runDashboardFocusedTests();
    finalResult = "PASS";
    finalDetail = `${activeTestRegistry.size} unique tests`;
  } catch (error) {
    finalDetail = error.message;
    throw error;
  } finally {
    activeTestRegistry = null;
    Logger.log(`DASHBOARD SUPPORTED METRICS ACCEPTANCE SUMMARY: ${finalResult} - ${finalDetail}`);
  }
}

/**
 * Sprint 6.1.0 aggregate Dashboard module acceptance runner.
 * This is the only function that must be executed manually for this sprint.
 * It performs a read-only production audit before its controlled Expense write.
 */
function runDashboardModuleAcceptance() {
  if (activeTestRegistry) {
    throw new Error("An aggregate test run is already active.");
  }

  let finalResult = "FAIL";
  let finalDetail = "";

  try {
    Logger.log("DASHBOARD ACCEPTANCE: READ-ONLY PRODUCTION AUDIT");
    const audit = auditDashboardLiveData();
    if (!audit || audit.assessment !== "SAFE_TO_TEST") {
      const issues = Array.isArray(audit?.issues)
        ? audit.issues.join(" | ")
        : "Dashboard production audit did not pass.";
      throw new Error(`Dashboard production audit BLOCKED: ${issues}`);
    }

    activeTestRegistry = new Set();
    Logger.log("DASHBOARD ACCEPTANCE: FOCUSED AND CONTROLLED FIXTURE TESTS");
    runDashboardFocusedTests();

    finalResult = "PASS";
    finalDetail = `${activeTestRegistry.size} unique tests`;
  } catch (error) {
    finalDetail = error.message;
    throw error;
  } finally {
    activeTestRegistry = null;
    Logger.log(
      `DASHBOARD MODULE ACCEPTANCE SUMMARY: ${finalResult} - ${finalDetail}`,
    );
  }
}

const PURCHASING_DELETED_LIST_TESTS = [
    testPurchasingFindDeletedEmpty,
    testPurchasingFindDeletedFiltering,
    testPurchasingFindDeletedResponseShape,
    testPurchasingFindDeletedBoundedDependencyReads,
];

function runPurchasingDeletedListTests() {
  runTestSuite("Purchasing deleted-list tests", PURCHASING_DELETED_LIST_TESTS);
}

const PURCHASING_WRITE_TESTS = [
    testPurchasingStatisticsActiveOnly,
    testPurchasingCreateValid,
    testPurchasingCreateDerivesTotal,
    testPurchasingCreateIgnoresSuppliedTotal,
    testPurchasingCreateAllowsDecimalQty,
    testPurchasingUpdateValid,
    testPurchasingUpdateRecalculatesTotal,
    testPurchasingUpdateTotalOnlyDoesNotOverride,
    testPurchasingUpdateRevalidatesSupplier,
    testPurchasingUpdateRevalidatesProduct,
    testPurchasingUpdateRejectsInfinity,
    testPurchasingRemoveSoftDeleteState,
];

function runPurchasingWriteTests() {
  runTestSuite("Purchasing write tests", PURCHASING_WRITE_TESTS);
}

const PURCHASING_RESTORE_TESTS = Object.freeze([
    testPurchasingRestoreValid,
    testPurchasingRestoreAlreadyActive,
    testPurchasingRestoreRejectsInactiveNonDeleted,
    testPurchasingRestoreRejectsInactiveSupplier,
    testPurchasingRestoreRejectsNonSupplierPartner,
    testPurchasingRestoreRejectsInactiveProduct,
    testPurchasingRestoreRecalculatesTotal,
]);

function runPurchasingRestoreTests() {
  runTestSuite("Purchasing restore tests", PURCHASING_RESTORE_TESTS);
}

const PURCHASING_CONTROLLER_TESTS = [
    testPurchasingControllerPublicApi,
    testPurchasingDeletedControllerPublicApi,
    testPurchasingControllerGetAll,
    testPurchasingControllerGetByIdValidation,
    testPurchasingControllerCreateValidation,
    testPurchasingControllerUpdateValidation,
    testPurchasingControllerDeleteValidation,
    testPurchasingControllerRestoreValidation,
    testPurchasingControllerSerialization,
    testPurchasingDeletedControllerSerialization,
];

function runPurchasingControllerTests() {
  runTestSuite("Purchasing controller tests", PURCHASING_CONTROLLER_TESTS);
}

const PURCHASING_API_TESTS = [
    testPurchasingApiPublicApi,
    testPurchasingApiPromiseTransportBoundary,
    testPurchasingUxConsistencySourceContracts,
    testPurchasingFrontendArchitectureSourceContracts,
];

const PURCHASING_META_TESTS = Object.freeze([
    testPurchasingAggregatePhaseRegistrationContracts,
]);

const PURCHASING_READ_TESTS = Object.freeze(
  PURCHASING_CONTROLLER_TESTS
    .concat(PURCHASING_API_TESTS)
    .concat(PURCHASING_READ_SERVICE_TESTS)
    .concat(PURCHASING_DELETED_LIST_TESTS),
);

const PURCHASING_VALIDATION_TESTS = Object.freeze(
  PURCHASING_MUTATION_VALIDATION_TESTS.slice(),
);

const PURCHASING_CRUD_TESTS = Object.freeze(
  PURCHASING_WRITE_TESTS.slice(),
);

const PURCHASING_MUTATION_TESTS = Object.freeze(
  PURCHASING_VALIDATION_TESTS.concat(PURCHASING_CRUD_TESTS),
);

const PURCHASING_KNOWN_TESTS = Object.freeze(
  PURCHASING_READ_TESTS
    .concat(PURCHASING_VALIDATION_TESTS)
    .concat(PURCHASING_CRUD_TESTS)
    .concat(PURCHASING_RESTORE_TESTS),
);

function runPurchasingApiTests() {
  runTestSuite("Purchasing browser API tests", PURCHASING_API_TESTS);
}

const PURCHASING_ACCEPTANCE_PHASES = Object.freeze([
  Object.freeze({
    key: "read",
    name: "READ",
    runner: "runPurchasingReadAcceptance",
    expectedCount: PURCHASING_READ_TESTS.length,
    audit: true,
    metaTests: PURCHASING_META_TESTS,
    tests: PURCHASING_READ_TESTS,
  }),
  Object.freeze({
    key: "validation",
    name: "VALIDATION",
    runner: "runPurchasingValidationAcceptance",
    expectedCount: PURCHASING_VALIDATION_TESTS.length,
    audit: false,
    metaTests: Object.freeze([]),
    tests: PURCHASING_VALIDATION_TESTS,
  }),
  Object.freeze({
    key: "crud",
    name: "CRUD",
    runner: "runPurchasingCrudAcceptance",
    expectedCount: PURCHASING_CRUD_TESTS.length,
    audit: false,
    metaTests: Object.freeze([]),
    tests: PURCHASING_CRUD_TESTS,
  }),
  Object.freeze({
    key: "restore",
    name: "RESTORE",
    runner: "runPurchasingRestoreAcceptance",
    expectedCount: PURCHASING_RESTORE_TESTS.length,
    audit: false,
    metaTests: Object.freeze([]),
    tests: PURCHASING_RESTORE_TESTS,
  }),
]);

function runPurchasingAllTests() {
  runPurchasingControllerTests();
  runPurchasingApiTests();
  runPurchasingValidationTests();
  runPurchasingDeletedListTests();
  runPurchasingWriteTests();
  runPurchasingRestoreTests();
}

function beginPurchasingAcceptancePhase(name) {
  if (activeTestRegistry) {
    throw new Error("An aggregate test run is already active.");
  }
  activeTestRegistry = new Set();
  activeAggregateStartedAt = Date.now();
  activePurchasingFixtureCount = 0;
  Logger.log(`PURCHASING ACCEPTANCE PHASE START: ${name} (aggregate 0 ms; fixtures 0)`);
}

function completePurchasingAcceptancePhase(name) {
  const elapsed = activeAggregateStartedAt ? Date.now() - activeAggregateStartedAt : 0;
  const count = activeTestRegistry ? activeTestRegistry.size : 0;
  const fixtures = typeof activePurchasingFixtureCount === "number" ? activePurchasingFixtureCount : 0;
  Logger.log(`PURCHASING ACCEPTANCE PHASE COMPLETE: ${name} (${count} unique tests; aggregate ${elapsed} ms; fixtures ${fixtures})`);
  activeTestRegistry = null;
  activeAggregateStartedAt = null;
  activePurchasingFixtureCount = null;
}

/** Canonical order: READ, VALIDATION, CRUD, then RESTORE in separate executions. */
function runPurchasingAcceptancePhase(key) {
  const phase = PURCHASING_ACCEPTANCE_PHASES.find((entry) => entry.key === key);
  if (!phase) throw new Error(`Unknown Purchasing acceptance phase: ${key}`);
  beginPurchasingAcceptancePhase(phase.name);
  try {
    if (phase.audit) {
      Logger.log(`PURCHASING ${phase.name} ACCEPTANCE: LIVE-DATA AUDIT`);
      const audit = runPurchasingDataAudit();
      if (!audit || audit.success !== true) {
        const issues = Array.isArray(audit?.blockingIssues) ? audit.blockingIssues.join(" | ") : "Purchasing data audit did not pass.";
        throw new Error(`Purchasing production data audit failed: ${issues}`);
      }
    }
    const reporting = {
      reportTiming: true,
      fixtureCount: () => activePurchasingFixtureCount,
    };
    runTestSuite(`Purchasing ${phase.name.toLowerCase()} tests`, phase.tests, reporting);
    if (phase.metaTests.length) runTestSuite(`Purchasing ${phase.name.toLowerCase()} meta tests`, phase.metaTests, reporting);
  } finally {
    completePurchasingAcceptancePhase(phase.name);
  }
}

function runPurchasingReadAcceptance() {
  runPurchasingAcceptancePhase("read");
}

function runPurchasingValidationAcceptance() {
  runPurchasingAcceptancePhase("validation");
}

function runPurchasingCrudAcceptance() {
  runPurchasingAcceptancePhase("crud");
}

function runPurchasingMutationAcceptance() {
  throw new Error("Purchasing Mutation acceptance is deprecated because it exceeds one Apps Script execution. Run in order: runPurchasingReadAcceptance(), runPurchasingValidationAcceptance(), runPurchasingCrudAcceptance(), runPurchasingRestoreAcceptance().");
}

function runPurchasingRestoreAcceptance() {
  runPurchasingAcceptancePhase("restore");
}

function runPurchasingModuleAcceptance() {
  throw new Error("Purchasing acceptance exceeds one Apps Script execution. Run in order: runPurchasingReadAcceptance(), runPurchasingValidationAcceptance(), runPurchasingCrudAcceptance(), runPurchasingRestoreAcceptance().");
}

/**
 * Runs the complete Return regression set, including controlled write tests.
 * This runner is intentionally not included in runAllSafeTests.
 */
function runReturnAllTests() {
  Logger.log("RETURN TESTS: SAFE AND READ-ONLY");
  runReturnSchemaTests();
  runReturnValidationTests();
  runReturnControllerTests();
  runReturnDisplayEnrichmentTests();

  Logger.log("RETURN TESTS: CONTROLLED WRITE FIXTURES");
  runReturnDeletedListTests();
  runReturnRestoreValidationTests();
  runReturnWriteTests();
  runReturnConcurrencyGuardTests();

  Logger.log("COMPLETE: Return all tests");
}

/**
 * Aggregate backend regression verification for Sprint 3.12.4.
 * Frontend source contracts and browser behavior are verified separately.
 */
function runReturnTrashUiAlignmentVerification() {
  const suites = [
    { name: "runReturnControllerTests", run: runReturnControllerTests },
    { name: "runReturnDeletedListTests", run: runReturnDeletedListTests },
    { name: "runReturnRestoreValidationTests", run: runReturnRestoreValidationTests },
    { name: "runReturnConcurrencyGuardTests", run: runReturnConcurrencyGuardTests },
    { name: "runReturnDisplayEnrichmentTests", run: runReturnDisplayEnrichmentTests },
  ];
  let passed = 0;
  const failures = [];

  suites.forEach((suite) => {
    Logger.log(`SUITE: ${suite.name}`);

    try {
      suite.run();
      passed += 1;
      Logger.log(`SUITE PASS: ${suite.name}`);
    } catch (error) {
      failures.push(`${suite.name}: ${error.message}`);
      Logger.log(`SUITE FAIL: ${suite.name} - ${error.message}`);
    }
  });

  Logger.log(`TOTAL SUITES: ${suites.length}`);
  Logger.log(`PASSED SUITES: ${passed}`);
  Logger.log(`FAILED SUITES: ${failures.length}`);
  Logger.log(`FINAL RESULT: ${failures.length ? "FAIL" : "PASS"}`);

  if (failures.length) {
    throw new Error(`Return Trash UI alignment verification failed: ${failures.join(" | ")}`);
  }
}

/**
 * Sprint 3.12.5 aggregate Pickup-Return module acceptance runner.
 * Individual test functions shared by overlapping regression suites execute
 * once only. This suite includes controlled spreadsheet write fixtures.
 */
function runPickupModuleAcceptance() {
  if (activeTestRegistry) {
    throw new Error("An aggregate test run is already active.");
  }

  activeTestRegistry = new Set();
  activeAggregateStartedAt = Date.now();

  try {
    Logger.log("PICKUP ACCEPTANCE: CORE REGRESSIONS");
    runCoreRegressionTests();

    Logger.log("PICKUP ACCEPTANCE: PICKUP REGRESSIONS");
    runTransactionReadTests();
    runPickupCreateValidationTests();
    runPickupCreateWriteTests();
    runPickupPresenterDateTests();
    runPickupUpdateValidationTests();
    runPickupUpdateWriteTests();
    runPickupRemoveRestoreTests();
    runPickupRestoreEligibilityTests();
    runPickupTrashReadTests();
    runPickupControllerTests();

    Logger.log(`COMPLETE: Pickup module acceptance (${activeTestRegistry.size} unique tests)`);
  } finally {
    activeTestRegistry = null;
    activeAggregateStartedAt = null;
  }
}

function runReturnModuleAcceptance() {
  if (activeTestRegistry) {
    throw new Error("An aggregate test run is already active.");
  }

  activeTestRegistry = new Set();
  activeAggregateStartedAt = Date.now();

  try {
    Logger.log("RETURN ACCEPTANCE: RETURN REGRESSIONS");
    runReturnSchemaTests();
    runReturnValidationTests();
    runReturnControllerTests();
    runReturnDisplayEnrichmentTests();
    runReturnDeletedListTests();
    runReturnRestoreValidationTests();
    runReturnWriteTests();
    runReturnConcurrencyGuardTests();

    Logger.log("RETURN ACCEPTANCE: CROSS-MODULE INTEGRITY");
    runPickupReturnIntegrityGuardTests();
    runPickupReturnIntegrityDiagnosticTests();

    Logger.log(
      `COMPLETE: Return module acceptance (${activeTestRegistry.size} unique tests)`,
    );
  } finally {
    activeTestRegistry = null;
    activeAggregateStartedAt = null;
  }
}

function runPickupReturnModuleAcceptance() {
  throw new Error(
    "Pickup-Return acceptance is split to stay within Apps Script execution time. Run runPickupModuleAcceptance() first, then runReturnModuleAcceptance().",
  );
}

function runAllSafeTests() {
  runCoreRegressionTests();
  runMasterDataRegressionTests();
  runTransactionReadTests();
  runPickupCreateValidationTests();
  runPickupControllerTests();
  runReturnControllerTests();
  runReturnSchemaTests();
  runReturnValidationTests();
}

/** Sprint 7.0.0 controlled Settings acceptance entry point. */
function runSettingsModuleAcceptance() {
  let failure = null;
  try {
    const service = SettingsService();
    let audit = service.audit();
    if (!audit.success) throw new Error(audit.message || "Settings production audit failed.");
    if (["NEEDS_DATA_CLEANUP", "BLOCKING_SCHEMA_DEFECT"].indexOf(audit.data.classification) >= 0) {
      throw new Error(`Settings production audit blocked controlled tests: ${audit.data.classification}.`);
    }
    if (audit.data.classification === "NEEDS_SEED") {
      const seeded = service.seedMissing();
      if (!seeded.success) throw new Error(seeded.message || "Settings seed failed.");
      audit = service.audit();
      if (audit.data.classification !== "SAFE") throw new Error(`Settings audit after seed is ${audit.data.classification}.`);
    }
    runSettingsFocusedTests();
  } catch (error) {
    failure = error;
  }
  Logger.log(`SETTINGS MODULE ACCEPTANCE: ${failure ? `FAIL - ${failure.message}` : "PASS"}`);
  if (failure) throw failure;
}

/** Independent read-only physical Settings schema diagnostic. */
function runSettingsSchemaCompatibilityDiagnostic() {
  try {
    return settingsSchemaCompatibilityDiagnostic();
  } catch (error) {
    const report = {
      classification: "AMBIGUOUS_DATA",
      sheetExists: false,
      physicalDataRows: 0,
      headerCompatible: false,
      safeAutomaticInitialization: false,
      safeAutomaticMigration: false,
      manualActionRequired: true,
      result: "FAIL",
      error: error.message,
    };
    Logger.log(`SETTINGS SCHEMA DIAGNOSTIC SUMMARY: ${JSON.stringify(report)}`);
    return report;
  }
}

/** One-time guarded migration from legacy Key/Value Settings storage. */
function runSettingsLegacySchemaMigration() {
  return settingsLegacySchemaMigration();
}

/** Sprint 7.1.0 production-safe Logs acceptance entry point. */
function runLogsModuleAcceptance() {
  let result; let failure = null;
  try { result = executeLogsModuleAcceptance(); }
  catch (error) { failure = error; result = { result: "FAIL", error: error.message }; }
  Logger.log(`LOGS MODULE ACCEPTANCE: ${failure ? `FAIL - ${failure.message}` : "PASS"}`);
  if (failure) throw failure;
  return result;
}

/** Independent read-only physical Logs schema diagnostic. */
function runLogsSchemaCompatibilityDiagnostic() {
  try {
    testLogsSchemaDiagnosticReadOnlySourceContract();
    return logsSchemaCompatibilityDiagnostic();
  } catch (error) {
    const report = { classification: "AMBIGUOUS_DATA", sheetExists: false, physicalRows: 0, headerCompatible: false, safeAutomaticInitialization: false, safeAutomaticMigration: false, manualActionRequired: true, result: "FAIL", error: error.message };
    Logger.log(`LOGS SCHEMA DIAGNOSTIC SUMMARY: ${JSON.stringify(report)}`);
    return report;
  }
}

/** Guarded one-time initialization of the confirmed empty legacy Logs header. */
function runLogsEmptyLegacySchemaInitialization() {
  testLogsEmptyLegacySchemaInitializationSourceContract();
  return logsEmptyLegacySchemaInitialization();
}
