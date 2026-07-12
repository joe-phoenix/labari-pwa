# Deploying the Labari Feed Aggregator Worker

Run these locally (you already have `wrangler` set up from the VC Directory /
Women in Tech Workers, so auth should already be in place).

## 1. Navigate to the worker directory
```bash
cd labari-pwa/workers
```

## 2. Initialize a wrangler project around the existing worker file
If this isn't already inside a wrangler-managed folder:
```bash
npm init -y
npm install --save-dev wrangler
```

## 3. Create wrangler.toml
```toml
name = "labari-feed"
main = "feed-aggregator.js"
compatibility_date = "2026-07-01"

[[kv_namespaces]]
binding = "FEED_CACHE"
id = "REPLACE_WITH_ID_FROM_STEP_4"

[triggers]
crons = ["*/10 * * * *"]
```

## 4. Create the KV namespace
```bash
npx wrangler kv namespace create FEED_CACHE
```
Expected output looks like:
```
🌀 Creating namespace with title "labari-feed-FEED_CACHE"
✨ Success!
Add the following to your configuration file:
[[kv_namespaces]]
binding = "FEED_CACHE"
id = "a1b2c3d4e5f6..."
```
Copy that `id` value into `wrangler.toml` from step 3.

## 5. Deploy
```bash
npx wrangler deploy
```
Expected output:
```
Total Upload: XX.XX KiB / gzip: XX.XX KiB
Uploaded labari-feed (X.XX sec)
Deployed labari-feed triggers (X.XX sec)
  https://labari-feed.joseph-kuuire.workers.dev
  schedule: */10 * * * *
```

## 6. First manual trigger (don't wait for the cron)
The KV cache starts empty — the first `/feed` request will trigger a live fetch
against both WP REST APIs (this is the `refreshMergedFeed` fallback path in the
code when no cache exists yet):
```bash
curl -s "https://labari-feed.joseph-kuuire.workers.dev/feed" | head -c 500
```
You should see JSON starting with `{"fetchedAt":...,"articles":[...`. If this
comes back empty or errors, check:
- `npx wrangler tail` in a second terminal to see live logs while you curl
- Confirm both `techlabari.com` and `labarijournal.com` WP REST endpoints are
  still publicly reachable (no auth wall added since we last checked)

## 7. Verify the cron actually fires
```bash
npx wrangler tail
```
Leave this running, wait up to 10 minutes, and confirm you see a log line from
the `scheduled` handler firing on its own — this is the only way to confirm the
cron trigger (not just the manual curl fallback) is actually working.

## 8. Point the PWA at it
No code change needed — `lib/useFeed.ts` already points at
`https://labari-feed.joseph-kuuire.workers.dev/feed`. Once step 6 returns real
JSON, running the PWA locally (`npm run dev`) should show real articles in the
feed instead of an empty state.

## Keeping the static site's content fresh (not just the /feed endpoint)

The `/feed` endpoint refreshes every 10 minutes on its own — but since the PWA
itself is a static export, new articles don't appear on the actual site until
it rebuilds. These steps wire up an automatic rebuild trigger:

1. **Create a Deploy Hook**: Cloudflare Pages project → **Settings** →
   **Builds & deployments** → **Deploy hooks** → give it a name (e.g. "content
   refresh") → copy the generated URL.
2. **Store it as a Worker secret**: on the `labari-feed` Worker's dashboard
   page → **Settings** → **Variables and Secrets** → add a secret named
   `DEPLOY_HOOK_URL` with that URL as the value (use "Encrypt" so it isn't
   shown in plaintext).
3. **Add a second cron trigger**: same Worker → **Settings** → **Triggers** →
   **Add Cron Trigger** → enter `*/20 * * * *` (every 20 minutes). You should
   now have two cron triggers on this Worker — the original `*/10 * * * *`
   for the feed cache, and this new one for the rebuild.
4. Redeploy the updated `feed-aggregator.js` code (it now checks
   `event.cron` to tell the two schedules apart).

This means new articles show up on the live site within ~20 minutes of
publishing, without you doing anything manually.

## Known gaps once this is live

- No auth/rate-limiting on the `/feed` endpoint — fine for now given it's read-only
  public content, but worth revisiting if traffic grows.
- If TechLabari or Labari Journal ever password-protect or rate-limit their REST
  API, `fetchSource()` will throw and `Promise.allSettled` will just drop that
  source silently for that cycle — no alerting exists yet if a source goes dark.
