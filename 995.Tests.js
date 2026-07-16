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
  runTestSuite("Core regression tests", [
    testCoreValidator,
    testCoreResponse,
  ]);
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
    testPickupRestoreHeaderAndDetails,
    testPickupRestorePreservesIdentity,
    testPickupRestoreDoesNotAffectOtherPickup,
    testPickupRestoreAlreadyActive,
    testPickupRemoveRestoreRoundTrip,
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
    testReturnRestoreValid,
    testReturnRestoreRejectsOverQuantity,
    testReturnFindByIdResolvedData,
  ]);
}

function runAllSafeTests() {
  runCoreRegressionTests();
  runMasterDataRegressionTests();
  runTransactionReadTests();
  runPickupCreateValidationTests();
  runPickupControllerTests();
  runReturnSchemaTests();
  runReturnValidationTests();
}
