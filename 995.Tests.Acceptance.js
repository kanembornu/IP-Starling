/** Stateless, bounded orchestration for manual Apps Script acceptance runs. */
const AcceptanceRunner = (() => {
  const SEPARATOR = "==============================";

  function child(name, available, run) {
    return Object.freeze({ name, available, run });
  }

  function stage(name, runners) {
    return Object.freeze({ name, runners: Object.freeze(runners.slice()) });
  }

  function phase5B2Stages() {
    return Object.freeze([
      stage("IDEMPOTENCY", [
        child("runIdempotencyContractTests", () => typeof runIdempotencyContractTests === "function", () => runIdempotencyContractTests()),
        child("runTransactionServiceContractTests", () => typeof runTransactionServiceContractTests === "function", () => runTransactionServiceContractTests()),
      ]),
      stage("ATOMICITY", [
        child("runPickupAtomicityTests", () => typeof runPickupAtomicityTests === "function", () => runPickupAtomicityTests()),
        child("runReturnAtomicityTests", () => typeof runReturnAtomicityTests === "function", () => runReturnAtomicityTests()),
      ]),
    ]);
  }

  function backendStages() {
    return Object.freeze([
      stage("CORE", [
        child("runCoreRegressionTests", () => typeof runCoreRegressionTests === "function", () => runCoreRegressionTests()),
      ]),
      stage("BACKEND CONTRACTS", [
        child("runReleaseBackendContractTests", () => typeof runReleaseBackendContractTests === "function", () => runReleaseBackendContractTests()),
        child("runReleaseMutationIntegrityTests", () => typeof runReleaseMutationIntegrityTests === "function", () => runReleaseMutationIntegrityTests()),
      ]),
    ]);
  }

  function frontendStages() {
    return Object.freeze([
      stage("FRONTEND INTEGRATION", [
        child("runReleaseFrontendIntegrationTests", () => typeof runReleaseFrontendIntegrationTests === "function", () => runReleaseFrontendIntegrationTests()),
      ]),
    ]);
  }

  function healthStages() {
    return Object.freeze([
      stage("HEALTH CONTRACTS", [
        child("runApplicationHealthCheckTests", () => typeof runApplicationHealthCheckTests === "function", () => runApplicationHealthCheckTests()),
        child("runApplicationMetadataTests", () => typeof runApplicationMetadataTests === "function", () => runApplicationMetadataTests()),
        child("runReleaseReadinessTests", () => typeof runReleaseReadinessTests === "function", () => runReleaseReadinessTests()),
      ]),
      stage("HEALTH RUNTIME", [
        child("runApplicationHealthCheck", () => typeof runApplicationHealthCheck === "function", () => runApplicationHealthCheck()),
        child("runApplicationHealthCheckSummary", () => typeof runApplicationHealthCheckSummary === "function", () => runApplicationHealthCheckSummary()),
      ]),
    ]);
  }

  function assertAvailable(stages) {
    stages.forEach((currentStage) => {
      currentStage.runners.forEach((runner) => {
        if (!runner.available()) {
          throw new Error(`Acceptance child runner tidak tersedia: ${runner.name}`);
        }
      });
    });
  }

  function assertPassingResult(runnerName, result) {
    if (result && (result.success === false || result.status === "FAIL")) {
      throw new Error(result.message || `${runnerName} melaporkan FAIL.`);
    }
  }

  function executePipeline(title, stagesFactory) {
    const startedAt = Date.now();
    const stages = stagesFactory();
    const executed = [];
    const stageResults = [];
    assertAvailable(stages);

    Logger.log(SEPARATOR);
    Logger.log(title);
    Logger.log(SEPARATOR);

    stages.forEach((currentStage, stageIndex) => {
      const stageStartedAt = Date.now();
      Logger.log(`[${stageIndex + 1}/${stages.length}] ${currentStage.name}`);
      currentStage.runners.forEach((runner) => {
        try {
          const result = runner.run();
          assertPassingResult(runner.name, result);
          executed.push(runner.name);
        } catch (error) {
          Logger.log(`FAIL — ${runner.name}`);
          Logger.log("Stopping pipeline.");
          throw error;
        }
      });
      const durationMs = Date.now() - stageStartedAt;
      stageResults.push(Object.freeze({
        name: currentStage.name,
        runners: Object.freeze(currentStage.runners.map((runner) => runner.name)),
        durationMs,
      }));
      Logger.log(`PASS — ${durationMs} ms`);
    });

    const totalDurationMs = Date.now() - startedAt;
    Logger.log(SEPARATOR);
    Logger.log("RESULT: PASS");
    Logger.log(`TOTAL: ${totalDurationMs} ms`);
    Logger.log(SEPARATOR);
    return Object.freeze({
      title,
      status: "PASS",
      runnersExecuted: Object.freeze(executed.slice()),
      stages: Object.freeze(stageResults.slice()),
      totalDurationMs,
    });
  }

  function fullPlan() {
    const functions = Object.freeze([
      "runAcceptanceCurrentPhase",
      "runAcceptanceBackend",
      "runAcceptanceFrontend",
      "runAcceptanceHealth",
    ]);
    Logger.log(SEPARATOR);
    Logger.log("FULL DEVELOPMENT ACCEPTANCE");
    Logger.log(SEPARATOR);
    functions.forEach((name, index) => Logger.log(`${index + 1}. ${name}`));
    Logger.log("RESULT: MANUAL_SEQUENCE_REQUIRED");
    Logger.log(SEPARATOR);
    return Object.freeze({
      status: "MANUAL_SEQUENCE_REQUIRED",
      functions,
    });
  }

  function runPhase5B2() {
    return executePipeline("PHASE 5B.2 ACCEPTANCE", phase5B2Stages);
  }

  function runBackend() {
    return executePipeline("BACKEND ACCEPTANCE", backendStages);
  }

  function runFrontend() {
    return executePipeline("FRONTEND ACCEPTANCE", frontendStages);
  }

  function runHealth() {
    return executePipeline("HEALTH ACCEPTANCE", healthStages);
  }

  return Object.freeze({
    runPhase5B2,
    runBackend,
    runFrontend,
    runHealth,
    fullPlan,
  });
})();

function runPhase5B2Acceptance() {
  return AcceptanceRunner.runPhase5B2();
}

function runAcceptanceCurrentPhase() {
  return runPhase5B2Acceptance();
}

function runAcceptanceBackend() {
  return AcceptanceRunner.runBackend();
}

function runAcceptanceFrontend() {
  return AcceptanceRunner.runFrontend();
}

function runAcceptanceHealth() {
  return AcceptanceRunner.runHealth();
}

function runAcceptanceFull() {
  return AcceptanceRunner.fullPlan();
}
