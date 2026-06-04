# Security Baseline for AI Vendors (v0.1, draft)

This is a placeholder policy used by the assessment agent. The Security team
owns the real version; replace this file when the canonical one is ready.

## Required of every AI vendor

### Certifications and assessments
- SOC 2 Type II report dated within the last 12 months, OR
- ISO/IEC 27001 certification dated within the last 12 months, OR
- Demonstrable equivalent (e.g. NCSC Cloud Security Principles attestation),
  reviewed and approved by the Security team.

### Sub-processor transparency
- A current sub-processor list available before contract signing.
- A change-notification commitment giving us at least 30 days to object before
  a new sub-processor begins handling our data.

### Data residency
- The vendor must specify processing and storage locations.
- For Confidential and Restricted data, processing must be UK or EEA unless an
  adequacy mechanism is in place.

### Encryption
- TLS 1.2 or higher for data in transit (TLS 1.3 preferred).
- AES-256 or equivalent for data at rest.
- Customer-managed keys preferred for Restricted data.

### Authentication and credential management
- Vendor APIs must support API key rotation.
- API keys must be scoped to least privilege.
- API keys must be stored in a secrets manager — **never in source code, env
  files committed to the repo, or shared chat tools**.
- Single sign-on (SAML 2.0 or OIDC) supported for any user-facing interface.

### Logging and audit
- Vendor must provide audit logs of access to customer data.
- Logs must be retainable for at least 12 months (longer for regulated workloads).

### Incident response
- Breach notification commitment of 72 hours or less from awareness.
- Direct contact path for security incidents (not via general support).
- Status page or equivalent for ongoing incident communication.

### Vulnerability management
- Public security advisory feed or equivalent.
- CVE response SLA documented (typically: critical within 48h, high within 7d,
  others within 30d).
- Coordinated disclosure programme (security.txt or equivalent).

## NCSC Cloud Security Principles alignment

The 14 Cloud Security Principles map roughly to the items above. Where the
vendor does not have a SOC 2 / ISO 27001 attestation, the Security team must
review against the 14 principles directly and document gaps.

## Threat picture

The Security team maintains a threat picture that the assessment agent should
consult — historical incidents, current campaigns targeting the AI vendor
ecosystem, and our own exposure. This file should reference the threat-intel
location once it's wired in (Phase 2).
