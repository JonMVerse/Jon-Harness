---
name: onboarding-clone
description: >
  Clones a Coda onboarding ("Welcome to Tech") doc for a new joiner and strips the
  personalised subpages. Trigger this skill whenever someone asks to onboard a new
  starter, set up a new joiner's welcome doc, or copy/duplicate an onboarding page —
  e.g. "onboard a new joiner", "clone the onboarding doc", "duplicate the welcome doc",
  "new starter onboarding page", "make an onboarding doc for <name>". Also trigger when
  an existing onboarding template needs forking for a specific person.
user-invocable: true
---

# onboarding-clone

Fork a Coda onboarding template into a fresh doc for a named new joiner, then remove the
subpages that were personalised to the original owner (by default the schedule and the
people-to-meet list).

## Usage

```
/onboarding-clone <new joiner name> [role=<job title>] [source=<coda url or uri>] [remove="Onboarding Schedule,People to meet"]
```

**Arguments:**

- `name` (**required**) — the new joiner's name. The new doc **and its landing page** are
  titled `Welcome to Tech <name>`.
- `role` (optional) — the new joiner's job title (e.g. "Principal AI Engineer"). Sets the
  landing page subtitle. If omitted, ask the user for it, or leave the subtitle blank — never
  carry over the original owner's role.
- `source` (optional) — the onboarding template to copy, as a Coda web URL or `coda://` URI.
  Default: the team template `coda://docs/gHz5qtdIk_` ("Welcome to Tech …").
- `remove` (optional) — comma-separated subpage **titles** to delete from the copy after
  forking. Default: `Onboarding Schedule, People to meet`. Pass `remove=""` (empty) to keep
  every page.

## Procedure

1. **Resolve the source.** If `source` is a web URL, `url_convert` (decode, `scope: "document"`)
   it to a `coda://docs/{docId}` URI. If it's already a `coda://` URI, use it as-is.

2. **Duplicate the whole doc** with `content_duplicate`:
   ```
   copy: {
     copyType: "copyDocument",
     sourceDocUri: "<source doc uri>",
     newTitle: "Welcome to Tech <name>"
   }
   ```
   Omit `destinationDocUri` so a brand-new doc (fork) is created. Table rows are always
   included when creating a new doc, so the copy is fully populated.

3. **Read the new doc's page tree.** Forks do **not** return a pages array (the fork may
   still be finishing), so call `document_read` on the returned new docUri to list its pages
   and capture each page's URI and title. Note the **landing page** — the root page with
   `parentPageUri: null` (usually `position: 1`).

4. **Rename the landing page.** `content_duplicate` renames the **doc-level** title but the
   inner landing page keeps the template owner's heading and subtitle. `page_update` the
   landing page URI from step 3 with `title: "Welcome to Tech <name>"` and, if `role` was
   given, `subtitle: "<role>"`. This is essential — otherwise the doc opens with the previous
   person's name and job title.

5. **Match the pages to remove.** For each title in `remove`, find the matching page in the
   new doc by comparing titles **case-insensitively and trimmed** (e.g. the source subpage is
   titled "Onboarding Schedule"). Collect the resolved page URIs.

6. **Delete — carefully.** `page_delete` is **destructive and operates on the new fork**.
   Before deleting, confirm each resolved URI belongs to the new doc and its title matches a
   requested removal. Delete each matched page. If a requested title is **not** found, **stop
   and report** which titles matched and which didn't — do not guess or delete a near-match.

7. **Report.** `url_convert` (encode) the new docUri to a browser URL and return it, along with
   the remaining page list as confirmation of what was kept.

## Notes

- The **source/template doc is never modified** — it is only read and copied.
- The fork is a new top-level doc owned by the person running the skill. **Sharing it with the
  new joiner is a manual Coda step** and is out of scope unless explicitly requested.
- Title matching is by visible page title, not URI — if the template's subpage titles change,
  update the `remove` defaults or pass them explicitly.
