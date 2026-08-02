# Release

## Version policy

IP-Starling follows Semantic Versioning:

- PATCH (`x.y.Z`) fixes compatible defects without adding incompatible behavior.
- MINOR (`x.Y.z`) adds backward-compatible functionality.
- MAJOR (`X.y.z`) introduces incompatible API, data, or behavioral changes.
- Pre-release identifiers such as `-alpha.1`, `-beta.1`, or `-rc.1` denote unstable builds that precede the associated normal version.

`VERSION` is the canonical repository version. Runtime `APP_CONFIG.VERSION` must match it; `APP_CONFIG.BUILD` is the descriptive build label.

The latest stable release is v1.0.0. Its production deployment remains pinned to immutable Apps Script version 233. Post-release development starts at 1.1.0-dev / Development; development source may advance without changing the pinned production deployment.

## Release gates

Before release preparation:

- `runAcceptanceFast()`, `runAcceptanceStandard()`, `runAcceptanceFrontend()`, and `runAcceptanceHealth()` pass in Apps Script.
- `runAcceptanceRelease()` confirms the required manual order.
- Application Health reports `FAIL = 0`.
- Browser smoke testing passes with no console errors or undefined functions.
- Static validation and `git diff --check` pass.
- The working tree is clean before release metadata changes begin.

## Canonical procedure

1. Run and record all release gates.
2. Update `VERSION` to the release version.
3. Update canonical `APP_CONFIG.VERSION` and `APP_CONFIG.BUILD` metadata consistently.
4. Move completed entries from `[Unreleased]` into a dated release section in root `CHANGELOG.md` and leave a new `[Unreleased]` section.
5. Re-run metadata, acceptance, health, static, and browser checks.
6. Review the exact release-preparation diff and commit it with explicit approval.
7. Push `main` with explicit approval and verify the remote commit.
8. Create an annotated tag for the exact release commit, for example `v1.0.0`.
9. Push the tag with explicit approval.
10. Create the GitHub Release from that tag using the finalized changelog.
11. Verify the release page and downloadable source archives.
12. If the Apps Script deployment is part of the release, follow [Deployment](DEPLOYMENT.md) and record it separately.
13. Begin the post-release development transition by updating `VERSION`, `APP_CONFIG`, and `[Unreleased]` in a separate approved change.

Commits, pushes, tags, GitHub Releases, Apps Script versions, and deployments are distinct actions and each requires authorization. This document describes the procedure; it does not authorize executing it.
