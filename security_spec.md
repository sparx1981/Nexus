# Nexus Security Specification

## 1. Data Invariants
- A resource (table, dashboard, report) must belong to a valid workspace.
- Access to resources is governed by the workspace membership list.
- If a user is not in the `memberships` array of the workspace, they have zero access.
- System fields like `createdAt` are immutable.
- `updatedAt` must always be set to the server time during updates.

## 2. The Dirty Dozen Payloads

1. **Identity Spoofing (Workspace Creation)**: Create a workspace where `ownerId` is someone else.
2. **Identity Spoofing (Resource Creation)**: Create a dashboard with a `workspaceId` that doesn't match the path.
3. **Privilege Escalation**: A 'member' trying to update the `memberships` array of a workspace to make themselves 'admin'.
4. **Unauthorized Read**: An authenticated user trying to read a workspace they are not a member of.
5. **Orphaned Writes**: Creating a table in a workspace that doesn't exist.
6. **Shadow Fields**: Creating a dashboard with extra malicious fields like `isAdmin: true`.
7. **Type Poisoning**: Sending a string for the `cards` array in a dashboard.
8. **Resource Exhaustion**: Sending a 1MB string as a table name.
9. **Immutability Breach**: Trying to change the `createdAt` timestamp of a report.
10. **State Corruption**: Deleting a workspace as a non-owner.
11. **Cross-Workspace Pollution**: Trying to add a record to `workspaceB` while being a member of `workspaceA`.
12. **Null PII Protection**: Reading user email lists from a workspace without being a member.

## 3. Test Runner (Draft)
The test runner will verify these cases against the rules.
