# Neon database recovery runbook

## Current verification status

An actual Neon restore was **not testable from this workstation** because no
Neon account/API credentials or separately identified staging branch were
available. A successful local database query is not evidence that Neon backup
restore works. Complete the drill below before production launch and repeat it
at least quarterly.

## Safety rules

- Perform the drill only in the Neon staging project/branch.
- Never select the production branch as a restore target during a drill.
- Restore to a new temporary branch. Do not use an in-place/finalized restore.
- Record project, source branch, target branch, restore timestamp, operator,
  start/end time, and verification results. Never record connection strings.
- Keep the source staging branch unchanged until the restored branch passes all
  checks.

## One-time preparation

1. In the Neon Console, open the staging project and confirm the branch name and
   project ID are unmistakably non-production.
2. Under **Settings > Restore window**, confirm that instant restore is enabled
   and that the retention period meets the restaurant's recovery requirement.
3. Under **Backup & Restore**, confirm snapshots/history are available for the
   staging root branch. Enable an appropriate scheduled snapshot policy if the
   Neon plan supports it.
4. Confirm the operator can create and delete a temporary branch, and that the
   staging application can be pointed to a separate `DATABASE_URL` without
   altering production.

## Non-production restore drill

1. Connect to the staging branch with the Neon SQL Editor. Create a uniquely
   named, unpublished test announcement (`restore-drill-A-<date>`). Record its
   ID and the database result of `SELECT now();` as timestamp A.
2. Wait at least one minute. Create a second uniquely named, unpublished test
   announcement (`restore-drill-B-<date>`). Record its ID and timestamp B.
3. In **Backup & Restore**, select the staging source branch and a restore point
   after timestamp A but before timestamp B. Use Time Travel/read-only query
   assistance first, when available, to confirm the selected point.
4. Restore that point to a **new temporary preview branch**, for example
   `restore-drill-YYYYMMDD`. Do not finalize the restore and do not target the
   source branch.
5. Wait until every Neon restore operation reports completion. Obtain the new
   branch's pooled connection string and store it only as a temporary secret.
6. Point a local or disposable Vercel Preview environment to the restored
   branch. Do not copy the connection string into source control or command
   output.
7. Against the restored branch, verify all of the following:

   - marker A exists;
   - marker B does not exist;
   - `npx prisma migrate status` reports the expected migration state;
   - `npx prisma validate` succeeds;
   - `SELECT 1` succeeds;
   - `/api/ready` returns HTTP 200;
   - Home/Menu reads, login, cart, and a disposable checkout smoke test work;
   - the checkout test leaves no negative stock or partial order.

8. Record the measured recovery time and whether the recovered data point met
   the intended recovery-point objective.
9. Delete the disposable Vercel Preview deployment, then delete only the exact
   temporary Neon restore branch after its results have been recorded.
10. Delete both drill announcements from the original staging branch.

## Pass criteria

The drill passes only if the temporary branch contains marker A, excludes marker
B, matches the expected Prisma migrations, serves application reads, and safely
completes a disposable checkout. Documentation alone is not a pass.

## Real incident procedure

1. Stop or place checkout into maintenance before changing a database target.
2. Record the incident timestamp and preserve the current branch.
3. Use Time Travel to locate the last known good point.
4. Restore to a new branch and validate it using the checks above.
5. Obtain owner approval before any in-place/finalized restore or production
   connection change.
6. Monitor `/api/ready`, checkout errors, Sentry, and order/stock invariants
   during recovery.
7. Preserve the displaced/original branch until reconciliation is complete;
   delete it only after an explicit review.

References: [Neon project and restore-window management](https://neon.com/docs/manage/projects),
[Neon database versioning and snapshot restore behavior](https://neon.com/docs/ai/ai-database-versioning),
and [Neon branching workflows](https://neon.com/docs/guides/branching-intro).
