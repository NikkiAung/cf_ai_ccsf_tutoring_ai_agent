# Deploy Durable Objects to Cloudflare

## Why You See "No Durable Objects Found"

According to the [Cloudflare Durable Objects documentation](https://developers.cloudflare.com/durable-objects/), **Durable Objects only appear in the dashboard after you deploy your Worker**.

Running `wrangler dev --remote` doesn't create them in your account - it just uses remote infrastructure. You need to **deploy** the Worker to create Durable Objects in your Cloudflare account.

## Step 1: Verify Your Setup

Your `wrangler.toml` is already configured correctly:

```toml
[[durable_objects.bindings]]
name = "CHAT_SESSION"
class_name = "ChatSession"

[[migrations]]
tag = "chat-session-v1"
new_classes = ["ChatSession"]
```

## Step 2: Deploy the Worker

Deploy your Worker to Cloudflare:

```bash
# Deploy the Worker (this creates Durable Objects in your account)
wrangler deploy
```

**What happens:**
1. ✅ Worker code is uploaded to Cloudflare
2. ✅ Durable Object class `ChatSession` is registered
3. ✅ Migration `chat-session-v1` is applied
4. ✅ Durable Objects binding is created
5. ✅ Durable Objects now appear in your dashboard!

## Step 3: Verify in Dashboard

After deployment:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. **Workers & Pages** → **ccsf-tutoring-ai-agent**
3. Click **Durable Objects** tab
4. You should now see:
   - ✅ **CHAT_SESSION** namespace
   - ✅ **ChatSession** class
   - ✅ Active instances (once you use the app)

## Step 4: Set Secrets (If Needed)

If your Worker needs API keys:

```bash
# Set OpenAI API key (if you're using it)
wrangler secret put OPENAI_API_KEY
# Enter your key when prompted
```

## What Gets Created

### In Your Cloudflare Account:

1. **Worker**: `ccsf-tutoring-ai-agent`
   - Contains your Worker code
   - Handles routing to Durable Objects

2. **Durable Object Namespace**: `CHAT_SESSION`
   - Binding name in your Worker
   - Allows Worker to access Durable Objects

3. **Durable Object Class**: `ChatSession`
   - The actual Durable Object class
   - Registered via migration

4. **Durable Object Instances**: (Created on-demand)
   - One per unique session ID
   - Created automatically when first accessed
   - Visible in dashboard after they're created

## Understanding the Dashboard

### Before Deployment:
- ❌ "No Durable Objects found"
- ❌ Empty page

### After Deployment (Before Use):
- ✅ **CHAT_SESSION** namespace visible
- ✅ **ChatSession** class visible
- ⚠️ **0 instances** (instances created on-demand)

### After Using the App:
- ✅ **CHAT_SESSION** namespace
- ✅ **ChatSession** class
- ✅ **Active instances** (e.g., 5 instances = 5 active chat sessions)

## Troubleshooting

### Still Empty After Deployment?

1. **Check Worker deployed successfully:**
   ```bash
   wrangler deployments list
   ```

2. **Check migration applied:**
   ```bash
   wrangler durable-objects list CHAT_SESSION
   ```

3. **Verify in dashboard:**
   - Workers & Pages → Your Worker → Durable Objects
   - Should see CHAT_SESSION namespace

### Instances Not Appearing?

- Instances are created **on-demand** when accessed
- Use your app to create a chat session
- Then check dashboard - instances will appear

### Can't See Data?

- Dashboard shows **metadata** (count, storage size)
- Individual data is **not visible** in dashboard (privacy)
- Access data via API or Worker code

## Difference: `wrangler dev --remote` vs `wrangler deploy`

| Feature | `wrangler dev --remote` | `wrangler deploy` |
|---------|------------------------|-------------------|
| **Creates Durable Objects in dashboard?** | ❌ No (uses remote, temporary) | ✅ Yes (permanent) |
| **Persists after stopping?** | ❌ No | ✅ Yes |
| **Shows in dashboard?** | ❌ No | ✅ Yes |
| **Use for development?** | ✅ Yes (testing) | ❌ No (production) |
| **Use for production?** | ❌ No | ✅ Yes |

## Next Steps

1. **Deploy now:**
   ```bash
   wrangler deploy
   ```

2. **Use your app** to create chat sessions

3. **Check dashboard** - you'll see Durable Objects!

4. **Monitor usage** in dashboard:
   - Instance count
   - Storage usage
   - Request count

## Reference

- [Cloudflare Durable Objects Documentation](https://developers.cloudflare.com/durable-objects/)
- [Get Started with Durable Objects](https://developers.cloudflare.com/durable-objects/get-started/)
- [Deploy Workers](https://developers.cloudflare.com/workers/get-started/guide/#deploy-your-worker)

