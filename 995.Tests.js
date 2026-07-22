/**
 * Shared runners only. Write-heavy Pickup tests are intentionally excluded from
 * runAllSafeTests and must be invoked through their explicit runners.
 */

function runTestSuite(name, tests) {
  Logger.log(`START: ${name}`);

  let currentTest = null;

  try {
    tests.forEach((test) => {
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

function runPurchasingAllTests() {
  runPurchasingControllerTests();
  runPurchasingValidationTests();
  runPurchasingDeletedListTests();
  runPurchasingWriteTests();
  runPurchasingRestoreTests();
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
