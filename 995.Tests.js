/**
 * Shared runners only. Write-heavy Pickup tests are intentionally excluded from
 * runAllSafeTests and must be invoked through their explicit runners.
 */

let activeTestRegistry = null;

function runTestSuite(name, tests) {
  Logger.log(`START: ${name}`);

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
      Logger.log(`RUN: ${test.name}`);
      test();
      Logger.log(`PASS: ${test.name}`);
    });
  } catch (error) {
    Logger.log(
      `FAIL: ${currentTest ? currentTest.name : name} - ${error.message}`,
    );
    throw error;
  }

  Logger.log(`COMPLETE: ${name}`);
}

function runCoreRegressionTests() {
  runTestSuite("Core regression tests", [testCoreValidator, testCoreResponse]);
}

function runPurchasingDataAudit() {
  return auditPurchasingData();
}

function runMasterDataRegressionTests() {
  runTestSuite("Master-data regression tests", [
    testProductService,
    testPartnerService,
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
    testPickupTrashReadMissingEligibility,
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

function runPurchasingValidationTests() {
  runTestSuite("Purchasing validation tests", [
    testPurchasingServicePublicApi,
    testPurchasingStatisticsEmpty,
    testPurchasingStatisticsResponseShape,
    testDashboardPurchasingStatisticsCompatibility,
    testPurchasingFindAllActiveOnly,
    testPurchasingFindByIdValidation,
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
  ]);
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

function runPurchasingDeletedListTests() {
  runTestSuite("Purchasing deleted-list tests", [
    testPurchasingFindDeletedEmpty,
    testPurchasingFindDeletedFiltering,
    testPurchasingFindDeletedResponseShape,
  ]);
}

function runPurchasingWriteTests() {
  runTestSuite("Purchasing write tests", [
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
  ]);
}

function runPurchasingRestoreTests() {
  runTestSuite("Purchasing restore tests", [
    testPurchasingRestoreValid,
    testPurchasingRestoreAlreadyActive,
    testPurchasingRestoreRejectsInactiveNonDeleted,
    testPurchasingRestoreRejectsInactiveSupplier,
    testPurchasingRestoreRejectsNonSupplierPartner,
    testPurchasingRestoreRejectsInactiveProduct,
    testPurchasingRestoreRecalculatesTotal,
  ]);
}

function runPurchasingControllerTests() {
  runTestSuite("Purchasing controller tests", [
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
  ]);
}

function runPurchasingApiTests() {
  runTestSuite("Purchasing browser API tests", [
    testPurchasingApiPublicApi,
    testPurchasingApiPromiseTransportBoundary,
  ]);
}

function runPurchasingAllTests() {
  runPurchasingControllerTests();
  runPurchasingApiTests();
  runPurchasingValidationTests();
  runPurchasingDeletedListTests();
  runPurchasingWriteTests();
  runPurchasingRestoreTests();
}

/**
 * Sprint 4.1.0 aggregate Purchasing module acceptance runner.
 * Includes the read-only production data audit and controlled write fixtures.
 */
function runPurchasingModuleAcceptance() {
  if (activeTestRegistry) {
    throw new Error("An aggregate test run is already active.");
  }

  const audit = runPurchasingDataAudit();
  if (!audit || audit.success !== true) {
    const issues = Array.isArray(audit?.blockingIssues)
      ? audit.blockingIssues.join(" | ")
      : "Purchasing data audit did not pass.";
    throw new Error(`Purchasing production data audit failed: ${issues}`);
  }

  activeTestRegistry = new Set();

  try {
    Logger.log("PURCHASING ACCEPTANCE: CONTROLLER AND BROWSER API");
    runPurchasingControllerTests();
    runPurchasingApiTests();

    Logger.log("PURCHASING ACCEPTANCE: SERVICE AND DATA INTEGRITY");
    runPurchasingValidationTests();
    runPurchasingDeletedListTests();
    runPurchasingWriteTests();
    runPurchasingRestoreTests();

    Logger.log(
      `COMPLETE: Purchasing module acceptance (${activeTestRegistry.size} unique tests)`,
    );
  } finally {
    activeTestRegistry = null;
  }
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
function runPickupReturnModuleAcceptance() {
  if (activeTestRegistry) {
    throw new Error("An aggregate test run is already active.");
  }

  activeTestRegistry = new Set();

  try {
    Logger.log("PICKUP-RETURN ACCEPTANCE: PICKUP REGRESSIONS");
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

    Logger.log("PICKUP-RETURN ACCEPTANCE: RETURN REGRESSIONS");
    runReturnSchemaTests();
    runReturnValidationTests();
    runReturnControllerTests();
    runReturnDisplayEnrichmentTests();
    runReturnDeletedListTests();
    runReturnRestoreValidationTests();
    runReturnWriteTests();
    runReturnConcurrencyGuardTests();

    Logger.log("PICKUP-RETURN ACCEPTANCE: CROSS-MODULE INTEGRITY");
    runPickupReturnIntegrityGuardTests();
    runPickupReturnIntegrityDiagnosticTests();

    Logger.log(
      `COMPLETE: Pickup-Return module acceptance (${activeTestRegistry.size} unique tests)`,
    );
  } finally {
    activeTestRegistry = null;
  }
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
