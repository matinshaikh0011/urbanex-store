# ROCK Workflow

For all medium and large tasks follow ROCK.

## R — Research

Before making changes:

* Analyze the codebase.
* Identify relevant files.
* Identify root causes.
* Identify risks.
* Do not modify code.

Output:

* Findings
* Relevant files
* Root causes

## O — Organize

Create a minimal implementation plan.

Output:

* Steps
* Files affected
* Expected outcome

Wait for approval before proceeding.

## C — Change

Implement only approved changes.

Rules:

* Modify only approved files.
* Avoid unrelated refactors.
* Keep changes minimal.
* Preserve existing functionality.

## K — Keep Verifying

After implementation:

* Run tests.
* Check console errors.
* Verify UI behavior.
* Summarize changes.

Output:

* Files changed
* Results
* Remaining issues

Token Optimization Rules:

* Read only necessary files.
* Do not scan the entire repository unless requested.
* Reuse previous findings instead of re-analyzing.
* Keep reports concise.
* Prefer targeted edits over large refactors.
