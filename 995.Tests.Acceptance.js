/** Stateless, bounded orchestration for manual Apps Script acceptance runs. */
const AcceptanceRunner = (() => {
  const SEPARATOR = "==============================";

  function child(name, resolve) {
    return Object.freeze({ name, resolve });
  }

  function stage(name, runners) {
    return Object.freeze({ name, runners: Object.freeze(runners.slice()) });
  }

  function fastStages() {
    return Object.freeze([
      stage("LOGS", [
        child("runLogsFocusedTests", () => typeof runLogsFocusedTests === "function" ? runLogsFocusedTests : null),
      ]),
      stage("SETTINGS", [
        child("runSettingsFocusedTests", () => typeof runSettingsFocusedTests === "function" ? runSettingsFocusedTests : null),
      ]),
      stage("LOGS CONTRACT", [
        child("runLogsRepositoryServiceContractTests", () => typeof runLogsRepositoryServiceContractTests === "function" ? runLogsRepositoryServiceContractTests : null),
      ]),
    ]);
  }

  function standardStages() {
    return Object.freeze([
      stage("CORE", [
        child("runCoreRegressionTests", () => typeof runCoreRegressionTests === "function" ? runCoreRegressionTests : null),
      ]),
      stage("BACKEND CONTRACTS", [
        child("runReleaseBackendContractTests", () => typeof runReleaseBackendContractTests === "function" ? runReleaseBackendContractTests : null),
        child("runReleaseMutationIntegrityTests", () => typeof runReleaseMutationIntegrityTests === "function" ? runReleaseMutationIntegrityTests : null),
      ]),
      stage("HEALTH CONTRACTS", [
        child("runApplicationHealthCheckTests", () => typeof runApplicationHealthCheckTests === "function" ? runApplicationHealthCheckTests : null),
        child("runApplicationMetadataTests", () => typeof runApplicationMetadataTests === "function" ? runApplicationMetadataTests : null),
      ]),
    ]);
  }

  function frontendStages() {
    return Object.freeze([
      stage("FRONTEND INTEGRATION", [
        child("runReleaseFrontendIntegrationTests", () => typeof runReleaseFrontendIntegrationTests === "function" ? runReleaseFrontendIntegrationTests : null),
      ]),
    ]);
  }

  function healthStages() {
    return Object.freeze([
      stage("HEALTH CONTRACTS", [
        child("runApplicationHealthCheckTests", () => typeof runApplicationHealthCheckTests === "function" ? runApplicationHealthCheckTests : null),
        child("runApplicationMetadataTests", () => typeof runApplicationMetadataTests === "function" ? runApplicationMetadataTests : null),
        child("runReleaseReadinessTests", () => typeof runReleaseReadinessTests === "function" ? runReleaseReadinessTests : null),
      ]),
      stage("HEALTH RUNTIME", [
        child("runApplicationHealthCheck", () => typeof runApplicationHealthCheck === "function" ? runApplicationHealthCheck : null),
        child("runApplicationHealthCheckSummary", () => typeof runApplicationHealthCheckSummary === "function" ? runApplicationHealthCheckSummary : null),
      ]),
    ]);
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
    Logger.log(SEPARATOR);
    Logger.log(title);
    Logger.log(SEPARATOR);

    stages.forEach((currentStage, stageIndex) => {
      const stageStartedAt = Date.now();
      Logger.log(`[${stageIndex + 1}/${stages.length}] ${currentStage.name}`);
      currentStage.runners.forEach((runner) => {
        try {
          const resolved = runner.resolve();
          if (typeof resolved !== "function") throw new Error(`Acceptance child runner tidak tersedia: ${runner.name}`);
          const result = resolved();
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

  function releasePlan() {
    const orderedFunctions = Object.freeze([
      "runAcceptanceFast",
      "runAcceptanceStandard",
      "runAcceptanceFrontend",
      "runAcceptanceHealth",
    ]);
    Logger.log(SEPARATOR);
    Logger.log("RELEASE ACCEPTANCE PLAN");
    Logger.log(SEPARATOR);
    orderedFunctions.forEach((name, index) => Logger.log(`${index + 1}. ${name}`));
    Logger.log("RESULT: MANUAL_SEQUENCE_REQUIRED");
    Logger.log(SEPARATOR);
    return Object.freeze({
      status: "MANUAL_SEQUENCE_REQUIRED",
      orderedFunctions,
    });
  }

  function runFast() {
    return executePipeline("FAST ACCEPTANCE", fastStages);
  }

  function runStandard() {
    return executePipeline("STANDARD ACCEPTANCE", standardStages);
  }

  function runFrontend() {
    return executePipeline("FRONTEND ACCEPTANCE", frontendStages);
  }

  function runHealth() {
    return executePipeline("HEALTH ACCEPTANCE", healthStages);
  }

  return Object.freeze({
    runFast,
    runStandard,
    runFrontend,
    runHealth,
    releasePlan,
  });
})();

function runAcceptanceFast() {
  return AcceptanceRunner.runFast();
}

function runAcceptanceStandard() {
  return AcceptanceRunner.runStandard();
}

function runAcceptanceFrontend() {
  return AcceptanceRunner.runFrontend();
}

function runAcceptanceHealth() {
  return AcceptanceRunner.runHealth();
}

function runAcceptanceRelease() {
  return AcceptanceRunner.releasePlan();
}
