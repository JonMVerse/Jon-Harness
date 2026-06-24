# Setting up the Metabase MCP connector

This guide walks through connecting Claude (Cowork or Claude Code) to Multiverse's Metabase instance so you can query data directly in chat.

**Who this is for:** Jonathan Aghimien, Yuval Rubin

---

## Prerequisites

- Claude Code installed on your machine
- Access to [metabase.multiverse.io](https://metabase.multiverse.io) with your Multiverse account
- Metabase admin has enabled the MCP server (already done ✓)

---

## Step 1 — Add the MCP server

Open your terminal and run:

```bash
claude mcp add --transport http metabase https://metabase.multiverse.io/api/metabase-mcp
```

---

## Step 2 — Authenticate

After running the command, Claude will open a browser window and redirect you to Metabase's OAuth login page. Log in with your Multiverse credentials and approve the connection.

You should see a confirmation that the MCP server was added successfully.

---

## Step 3 — Verify the connection

Check that Metabase is listed:

```bash
claude mcp list
```

You should see `metabase` in the output.

---

## Step 4 — Restart Cowork

Close and reopen the Cowork desktop app. The Metabase tools will load on the next session start.

---

## What you can do once connected

Once the connection is live, you can ask Claude things like:

- *"Show me Atlas user activity trends for the last 3 months"*
- *"How many messages were sent on the platform last week?"*
- *"What's the breakdown of users by role?"*
- *"Query the learning unit enrolment data"*

Claude will write and run the SQL against Metabase on your behalf, scoped to your own Metabase permissions.

---

## Troubleshooting

**`✗ Failed to connect` instead of an auth prompt**
Your Metabase site URL may not match. This can happen in some network configurations. Contact the Data team to confirm the MCP server is reachable.

**Tools don't appear after restarting**
Run `claude mcp list` to confirm the entry exists. If it's missing, re-run the Step 1 command.

**OAuth page doesn't open**
Try running the command again — the browser tab may have been blocked. Check your browser's popup settings.
