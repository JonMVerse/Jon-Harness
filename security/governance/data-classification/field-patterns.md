# PII field-name patterns

Authoritative list of field-name patterns the `/data-classification` skill
matches against repo schemas, model definitions, API specs, configs, and
data dictionaries. Each match contributes a `data_categories[]` entry to
`classification.md` with a `pattern_match` anchor pointing back here.

This file is read at runtime by the `/data-classification` skill. Edits ship
to the next session immediately.

**How to use this list.** Treat each row as a *signal*, not a verdict.
A field named `notes` on a marketing-copy table is unlikely to be PII;
the same field on a patient-record table almost always is. Match
*exactly* on the pattern and *contextually* on what the model is for.

---

## Critical sensitivity

These patterns map to data classes that are always restricted-tier
(`sensitivity-tiers.md#tier-restricted`) and always trigger one or more
`CHF-N` rules in `regulatory-rules.md`. Matching one of these is a
classification fact, not a question.

### Authentication and secrets
Maps to `data-categories.md#authcredentials`. Triggers
`CHF-PASSWORD-PLAINTEXT` when the field name is the bare credential
without a hash suffix.

```
password, passwd, pwd, pass, passphrase
password_hash, hashed_password, encrypted_password, password_digest
secret, client_secret, app_secret, shared_secret
api_key, api_secret, private_key, signing_key, public_key
token, auth_token, access_token, refresh_token, bearer_token, id_token
session_id, session_token, csrf_token
security_question, security_answer, recovery_hint
mfa_secret, totp_secret, otp_seed, recovery_code
```

### Payment card data
Maps to `data-categories.md#pcicardholder` and
`data-categories.md#pcicvv`. Any storage of CVV-shaped fields triggers
`CHF-PCI-CVV` (PCI-DSS prohibits storage at all). Plaintext PAN
triggers `CHF-PCI-PAN-PLAINTEXT`.

```
# Cardholder data (regulated under PCI-DSS)
card_number, card_num, credit_card, debit_card, pan, primary_account_number
cardholder_name, card_holder, cc_name
expiry, exp_month, exp_year, expiration_date
issuer, network, brand, card_type

# CVV / security codes — STORAGE PROHIBITED regardless of encryption
cvv, cvv2, cvc, cvc2, cid, card_code, security_code

# Bank account
account_number, routing_number, sort_code, bank_account, iban, swift, bic
```

### Government identifiers
Maps to `data-categories.md#piigovernmentid`. Always restricted-tier;
read-access auditing required (see
`sensitivity-tiers.md#tier-restricted`).

```
ssn, social_security, social_security_number, sin
tax_id, taxpayer_id, itin, ein, vat_number, nino
passport, passport_number, passport_no
drivers_license, drivers_licence, license_number, dl_number, dvla
national_id, national_id_number, id_number, citizen_id, nin
voter_id, election_id
```

### Health and medical data
Maps to `data-categories.md#special-categoryhealth` (GDPR Art. 9) and
`data-categories.md#phi` (HIPAA where US-scoped). Triggers
`CHF-HIPAA-NO-BAA` when flowing to a vendor without a BAA, and
`CHF-HIPAA-NO-AUDIT-READ` when read-access logging is absent.

```
diagnosis, diagnoses, condition, medical_condition, primary_condition
medication, prescription, rx, dosage, drug
health_record, medical_record, medical_history, ehr, emr, phi
insurance, insurance_id, insurance_number, policy_number, plan_id, group_number
icd_code, icd10, icd11, cpt_code, hcpcs, snomed, npi
mental_health, psychiatric_history, therapy_notes, counsellor_notes
allergy, allergies, immunisation, vaccination, blood_type
lab_result, vital_sign, bmi, hba1c, blood_pressure
```

### Biometric data
Maps to `data-categories.md#special-categorybiometric` (GDPR Art. 9)
and triggers `CHF-BIPA-NO-CONSENT` in BIPA-jurisdiction systems. Always
requires written consent + retention limit (`biometric_expires_at`-style
timestamp).

```
fingerprint, fingerprint_data, fingerprint_template, minutiae
face_id, face_data, face_template, face_embedding, facial_recognition, face_scan, face_vector
retina, retina_scan, iris, iris_scan, iris_template
voice_print, voice_data, voice_template, voice_embedding, speaker_id
gait, gait_signature, keystroke_dynamics, signature_dynamics
dna, genetic_data, genome, gene_sequence
```

---

## High sensitivity

These patterns map to confidential-tier data
(`sensitivity-tiers.md#tier-confidential`). Storage is permitted with
controls; logging in plaintext, exporting unencrypted, or sending to
analytics tools triggers `CHF-LOG-PII` /  `CHF-EXPORT-UNENCRYPTED`.

### Identity
Maps to `data-categories.md#piiidentity`.

```
first_name, last_name, full_name, legal_name, maiden_name, given_name, family_name
middle_name, middle_initial, display_name, preferred_name, nickname
date_of_birth, dob, birth_date, birthdate, birthday, year_of_birth
age, age_band, age_group, gender, sex, sex_at_birth
race, ethnicity, nationality, citizenship
photo, avatar, profile_picture, selfie, headshot
signature, signature_image
```

### Contact
Maps to `data-categories.md#piicontact`.

```
email, email_address, email_addr, secondary_email, work_email, personal_email
phone, phone_number, mobile, mobile_number, cell, cell_number, telephone, fax
address, street_address, street, addr, address_line_1, address_line_2
city, state, county, region, zip, zipcode, zip_code, postal_code, postcode
country, country_code, mailing_address, billing_address, shipping_address
emergency_contact, next_of_kin
```

### Financial (non-card)
Maps to `data-categories.md#financialnon-card`. Sensitive PI under CCPA;
financial-institution data covered by GLBA in the US.

```
salary, wage, base_salary, hourly_rate, income, gross_income, net_income
compensation, bonus, total_comp, equity_grant
balance, account_balance, available_balance, net_worth
credit_score, fico, credit_rating, credit_limit, debt_ratio
transaction_history, purchase_history, spending_data, billing_history
loan_amount, mortgage_amount, deposit_amount
```

### Location and tracking
Maps to `data-categories.md#piilocation`. Precise geolocation is
sensitive PI under CCPA.

```
location, location_data, coordinates, lat, lng, lon, latitude, longitude
gps, gps_data, geo, geolocation, geo_point
ip, ip_address, ip_addr, client_ip, remote_ip, x_forwarded_for
mac_address, wifi_ssid, cell_id, beacon_id
home_address, work_address, last_known_location
```

---

## Lower sensitivity

These patterns map to data that is not always sensitive on its own but
gains sensitivity through context, aggregation, or model purpose.
Default to internal-tier
(`sensitivity-tiers.md#tier-internal`); upgrade to confidential when
combined with identifiers.

### Behavioural and tracking
Maps to `data-categories.md#piibehavioural`.

```
device_id, device_identifier, device_fingerprint, hardware_id
ad_id, idfa, gaid, advertising_id, app_instance_id
browser_fingerprint, ua, user_agent, accept_language
search_history, browsing_history, click_history, scroll_depth, dwell_time
session_data, activity_log, event_stream
referrer, utm_source, utm_campaign
```

### Ambiguous fields
These names are flags only — they require looking at the model
context to classify. On a `User`, `Patient`, or `Customer` table,
treat them as PII containers; on a `Product` or `MarketingCopy` table,
they're usually not.

```
notes, metadata, extra, data, info, details, misc, other, payload
profile, profile_data, user_data, user_info, user_details, member_data
preferences, settings, options
```

---

## Indirect abbreviated

Field names that don't *look* like PII but routinely store it in the
wild. Flag based on the model the field lives on.

| Field name | Flag when on this kind of model | Likely contents |
|---|---|---|
| `p`, `pw`, `pass` | User / auth / account | Plaintext password — `CHF-PASSWORD-PLAINTEXT` |
| `k`, `key`, `priv` | User / API client | Private key or shared secret |
| `creds`, `credential`, `credentials` | Anywhere | Auth credential bundle |
| `data`, `info`, `details`, `payload` | User / customer / patient | Free-form PII container |
| `notes` | Patient / customer / case | Unstructured PII (often special-category) |
| `metadata` | User / session | Device fingerprint, behavioural data |
| `token`, `tok` | Anywhere | Raw auth or session token |
| `secret` | Anywhere | Should never persist in a database row |
| `code` | Auth / payment / verification | OTP, CVV, or activation code |
| `number`, `num` | User / payment / employee | SSN, card, phone, employee ID |
| `value`, `val` | Sensitive entity | Generic PII container |
| `raw`, `original`, `plain` | Adjacent to a hashed/encrypted field | Plaintext alongside the protected version |
| `backup`, `archive` | Sensitive entity | Long-retained PII outside the deletion path |

Rule of thumb: an ambiguous field name on a user-facing, financial,
patient, or employee model is a flag. Capture it as a
`data_categories[]` entry with `confidence: low` and emit an OQ for the
user to confirm.

---

## What this list is not

- Not exhaustive. New patterns appear as systems evolve. When you see a
  field that smells like PII but isn't here, classify it on its
  contextual signal and add it to this file (the change ships immediately
  to the next session).
- Not a regex. The classification agent matches semantically, not by
  regex. `addr_1` and `street_address` both match the contact block
  even though neither is a literal substring of the other.
- Not a substitute for reading the model. A field's *name* is a signal;
  a field's *contents* (in seeds, fixtures, or sample data committed to
  the repo) are the verdict.
