# AI Usage Policy (v0.1, draft)

This is a placeholder policy used by the assessment agent. AI Transformation,
Security, Privacy, and Legal jointly own the real version; replace this file
when the canonical one is ready.

## Scope

Applies to any use of AI capabilities — including external services, API
integrations, locally hosted models, and AI features embedded in tools we
already use (e.g. AI features in collaboration platforms).

## Approved patterns

The following patterns are pre-approved and do not require fresh assessment when
data classification permits, provided existing contracts cover the use:

- Use of Claude API and Anthropic Console under the existing enterprise contract
  for Internal-or-below data.
- Use of GitHub Copilot under the existing licence for source code that is
  already Internal-classified.
- Use of integrated AI features in our SSO-managed productivity suite, provided
  the feature's data flow stays within already-approved processors.

## Patterns requiring assessment

Any use case outside the above must be assessed:

- New AI vendors not already on the approved list
- Existing approved vendors used with Confidential or Restricted data
- New product features that ship AI capability to customers
- Changes to data flowing into already-approved AI tools (e.g. enabling new
  channels, new data sources, new categories of users)
- Use cases that produce automated decisions affecting individuals

## Prohibited patterns

- Sending Restricted data to any external AI service without board approval.
- Sending special-category personal data without an explicit Art. 9 lawful
  basis and a completed DPIA.
- Using AI to monitor employees covertly.
- Using AI for prohibited use cases under the EU AI Act (social scoring,
  manipulative techniques, exploitation of vulnerabilities, untargeted scraping
  of facial images for biometric ID, etc.).
- Bypassing the assessment process — including running pilots with production
  data while assessment is pending.

## Human oversight

For any AI use case that produces decisions affecting individuals (employment,
access, content, support, escalation, etc.), human oversight must be:
- Meaningful — the reviewer has the information and authority to override
- Documented — the review and outcome are logged
- Available — there is a documented route for affected individuals to request
  human review and to appeal

## Vendor obligations

Approved vendors must commit, in contract:
- Security certifications maintained and disclosed (SOC 2 Type II / ISO 27001
  / equivalent)
- Breach notification within 72 hours
- A clear sub-processor list with notification of changes
- Data residency commitments compatible with our classification policy
- Right to audit (proportionate to risk)
- Deletion of our data on termination, with attestation
