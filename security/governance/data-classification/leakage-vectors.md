# PII leakage vectors

Authoritative checklist of runtime code patterns where classified data
typically leaks out of the system boundary defined by its data model.
The `/data-classification` skill's repo-scan pass searches for these
patterns; matches feed `CHF-LOG-PII` and `CHF-EXPORT-UNENCRYPTED` in
[regulatory-rules.md](regulatory-rules.md).

This file is read at runtime by the `/data-classification` skill. Edits ship
to the next session immediately.

**Vector IDs (`V-01` through `V-08`) are stable.** `regulatory-rules.md`
references them directly. Renaming or renumbering breaks the schema's
cross-reference contract — add new IDs at `V-09` and onwards rather
than re-using or shifting existing ones.

---

## V-01 — Logging

The single highest-frequency leak in production code. Classified data
written to `stdout` / log aggregators / file handlers persists outside
the original model's deletion and access controls.

What to grep across the target repo:

```
# Generic log calls (any language)
console.log    console.error   console.info    console.debug
logger.info    logger.debug    logger.warn     logger.error
log.info       log.debug       log.warn        log.error
print(

# Common logging frameworks
winston.       bunyan.         pino.           timber.
zap.           logrus.         klog.
logging.info   logging.debug   logging.warning logging.error
Rails.logger.  ActiveSupport::Logger
slf4j          Logger.getLogger
```

Flag when the call interpolates:

- A whole model object — `console.log(user)`, `logger.info(req.body)`.
- A field name from `field-patterns.md` near a log call —
  `logger.debug("email:", user.email)`.
- A request or response body in middleware.

Safe pattern: log a stable identifier and the *action*, not the
contents. `logger.info({ action: "user.update", userId: user.id })`.

---

## V-02 — Error handling and exception responses

Errors propagate the inputs that caused them. Returning raw exceptions
to the client (or stringifying them into the response body) leaks the
offending input.

What to grep:

```
catch (        except          rescue
.catch(        on_error        rescue =>
error.message  err.toString()  JSON.stringify(error)  String(err)
res.status(500).json    render json: e   raise
panic(         abort(          throw
```

Flag when the error path:

- Returns the raw error object: `res.json({ error: err })`.
- Exposes a stack trace: `res.send(err.stack)`.
- Echoes the input alongside the error: `res.json({ error: e, input: req.body })`.

Safe pattern: log a server-side correlation ID, return only the ID and
a generic message to the client.

---

## V-03 — Analytics and product telemetry

Third-party analytics SDKs are designed to ingest event properties
freely, which makes them the most common path for behavioural data and
PII to leave the boundary. The vendor will not have a BAA / DPA scoped
for the data sent.

What to grep:

```
mixpanel.track    amplitude.track   analytics.track
segment.identify  heap.identify     posthog.capture
gtag(             fbq(              _hsq.push(
rudderstack.      braze.            klaviyo.
```

Flag when the call sends:

- PII as event properties: `track('Signup', { email, phone })`.
- A whole user object in `identify`: `identify(userId, { ...user })`.
- Any `special-category.*`, `phi`, or `pci.*` data anywhere — those
  must not flow to consumer analytics tooling.

Safe pattern: identify by a stable opaque ID; track only non-PII facts.

---

## V-04 — Caches

Caches outlive the request context that populated them and rarely
honour the source row's deletion timeline. PII in Redis / Memcached /
local caches is a common reason CCPA right-to-erasure requests miss
records.

What to grep:

```
redis.set        redis.setex    redis.hset
cache.set        cache.put      cache.write
Rails.cache.write  memcache.set  client.set
Cache.put        CacheManager.   Caffeine.
```

Flag when the call:

- Caches an entire user object without explicit field selection.
- Has no TTL, or a TTL longer than the data's stated retention.
- Lacks encryption on a cache shared across services.

Safe pattern: cache only the fields needed; set a TTL ≤ the source
row's retention period; use a separate keyspace for restricted-tier
data with its own deletion job.

---

## V-05 — Outbound HTTP / external API calls

Calls to third-party services move data across the trust boundary. The
receiving vendor's data-handling commitments may not align with the
data class being sent.

What to grep:

```
fetch(           axios.post     axios.get      axios.put
requests.post    requests.get   urllib.request
http.Post        http.Get       net/http
HTTParty.post    RestClient.post
curl             wget
```

Flag when the request body / query string includes:

- PII fields beyond what the vendor needs.
- Sensitive data in query params (visible in vendor logs and HTTP
  intermediaries).
- A `Authorization: Bearer <token>` header logged anywhere downstream.

Safe pattern: send the minimum the vendor needs (often a stable
external ID and a yes/no flag); use POST bodies, never query strings,
for sensitive values.

---

## V-06 — API responses and serializers

Default-serialise patterns return every field on the model. Any
restricted or special-category field present in the model leaks via the
response.

What to grep:

```
res.json(user        render json: @user      jsonify(user)
to_json              as_json                  serialize
JSON.stringify(user  toJSON(                  transform(user
SELECT *
```

Flag when:

- The response interpolates the whole model: `res.json(user)`.
- A `password_hash` or any `auth.credentials` field appears in any
  response shape.
- `pci.*`, `phi`, or `special-category.*` data appears in a response
  not specifically scoped to that purpose.
- The underlying query is `SELECT *`, hiding which columns reach the
  serializer.

Safe pattern: use an explicit allow-list serializer (DRF
`ModelSerializer.fields = (…)`, GraphQL field resolvers, hand-written
DTOs); never auto-spread a model into a response.

---

## V-07 — File and object storage

Files persist longer than database rows and are easy to overlook in
deletion / retention work. Misconfigured ACLs make them publicly
accessible.

What to grep:

```
s3.upload         s3.putObject    s3.put_object
bucket.file       bucket.upload   storage.upload
fs.writeFile      fs.appendFile   open(<path>, 'w')
blob.upload       writeStream(    BlobClient.upload
```

Flag when:

- PII is written to local files without encryption-at-rest configured.
- An S3 / blob upload omits `ServerSideEncryption` (AWS SSE, CMK, or
  equivalent).
- An S3 / blob upload uses a non-private ACL on a bucket that isn't
  explicitly designed for public content.
- Export files (CSV, JSON, parquet) containing PII land in shared or
  long-retained storage.

Safe pattern: explicit `ServerSideEncryption=AES256` (or KMS / CMK)
plus `ACL=private`; lifecycle rule that purges within the source row's
retention period.

---

## V-08 — Configs, seeds, fixtures, environment files

Real PII committed to the repo as test data or environment defaults
ends up in git history (where deletion is hard) and on every developer
laptop.

What to grep:

```
.env             .env.local      .env.example
config/          settings.       application.yml
seed.rb          seeds.js        seeds.py
fixtures/        factories/      __fixtures__/
```

Flag when:

- Real-looking emails, phone numbers, SSNs, or addresses appear in
  seed / fixture / factory files.
- `.env.example` (which *is* committed) contains real values rather
  than obvious placeholders.
- Any committed config file (`database.yml`, `application.yml`,
  `appsettings.json`) contains real credentials, tokens, or PII.

Safe pattern: use obviously fake values
(`user@example.com`, `+44 20 7946 0000`, `000-00-0000`) in committed
test data; place real secrets and PII in gitignored `.env` /
`.env.local` only; audit history with `git-secrets`, `truffleHog`, or
similar before declaring a clean state.

---

## What this list is not

- Not exhaustive. New leak surfaces appear with new frameworks and
  vendors. When the agent finds something off this list that fits a
  similar shape, capture it under the closest existing vector and add
  the new pattern to that vector's grep block.
- Not a static-analysis spec. The agent uses these as starting greps,
  then reads context to decide whether the match is a real leak.
- Not a substitute for the data-flow review. A clean leak-vector pass
  means *no obvious* leaks; it does not prove the system is leak-free.
