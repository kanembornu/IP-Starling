# Deployment

## Separate artifacts

These operations are independent:

- A Git commit records repository history.
- A Git tag names a commit.
- A GitHub Release publishes release notes and source archives for a tag.
- `clasp push` synchronizes source to an Apps Script project.
- An Apps Script version is an immutable source snapshot used by deployments.
- An Apps Script deployment publishes a version through a web app or another deployment type.

Completing one does not complete or verify the others.

## Source synchronization

1. Confirm the working tree and reviewed diff.
2. Confirm `.clasp.json` targets the intended script project.
3. Run appropriate static checks.
4. Use `clasp push` only with authorization.
5. Run the relevant Apps Script acceptance functions after upload.

A successful push proves only that clasp uploaded the source. It does not prove that the source initialized, tests passed, or the web app deployment serves that code.

## Web app deployment overview

This project declares a web app in `appsscript.json`; deployment is managed in Apps Script. After release gates pass, create an Apps Script version and create or update the intended web app deployment to that version. Verify the execute-as and access settings against the intended environment before saving. Record the version and deployment affected without publishing credentials or private identifiers.

This repository does not contain deployment automation, so deployment remains an explicit operator action.

## Verification

Open the deployed web app URL and verify bootstrap, navigation, affected CRUD flows, settings, logs, and Application Health as appropriate. Confirm browser console errors are absent. A browser check against an old deployment is not evidence for newly pushed source; confirm which deployment/version is serving the test.

## Rollback

Prefer redeploying the last known-good immutable Apps Script version. Do not improvise spreadsheet rollback from source control. If a change included an authorized data maintenance operation, follow that utility's own backup and rollback evidence separately.

After rollback, repeat health and browser verification and document which Apps Script version is active. A Git revert alone does not change an Apps Script deployment.

## `clasp run` warning

`clasp run` requires an Apps Script API executable deployment with compatible access and credentials. A normal web app deployment is not sufficient. Do not assume editor-runnable functions can be invoked through `clasp run`; when no API executable is configured, execute acceptance and maintenance functions manually in the Apps Script editor.
