# Party Queer Night — Drink Ticket POS

## Setup

### 1. Fill in env vars

Edit `.env.local` with your real Stripe keys:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_TERMINAL_LOCATION_ID=tml_...
NEXT_PUBLIC_STRIPE_TERMINAL_LOCATION_ID=tml_...
DATABASE_URL=file:./dev.db
```

### 2. Initialize the database

```bash
cd /home/jef/party-pos
npx prisma migrate deploy
```

### 3. Seed test orders (optional)

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

### 4. Run in dev

```bash
npm run dev
```

### 5. Run in production

```bash
npm run build
npm start   # runs on port 3001
```

---

## Stripe Terminal — Pairing the S700

1. On the S700 reader, go to **Settings → Generate pairing code**
2. In your Stripe Dashboard → Terminal → Readers → click the reader → Pair device
3. Enter the code
4. Set `STRIPE_TERMINAL_LOCATION_ID` to the location ID shown in the Stripe Dashboard

---

## Cloudflare Tunnel (party.timaeus.ai)

Create a new tunnel:

```bash
cloudflared tunnel create party
cloudflared tunnel route dns party party.timaeus.ai
```

Create `~/.cloudflared/party-config.yml`:

```yaml
tunnel: <YOUR-TUNNEL-ID>
credentials-file: /home/jef/.cloudflared/<YOUR-TUNNEL-ID>.json
ingress:
  - hostname: party.timaeus.ai
    service: http://localhost:3001
  - service: http_status:404
```

Create `/etc/systemd/system/cloudflared-party.service`:

```ini
[Unit]
Description=Cloudflare Tunnel — party.timaeus.ai
After=network.target

[Service]
ExecStart=/usr/bin/cloudflared tunnel --config /home/jef/.cloudflared/party-config.yml run
Restart=always
User=jef

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/party-pos.service`:

```ini
[Unit]
Description=Party POS — Queer Night
After=network.target

[Service]
WorkingDirectory=/home/jef/party-pos
ExecStart=/usr/bin/node node_modules/.bin/next start -p 3001
Restart=always
User=jef
EnvironmentFile=/home/jef/party-pos/.env.local

[Install]
WantedBy=multi-user.target
```

Enable both:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now party-pos.service
sudo systemctl enable --now cloudflared-party.service
```

---

## Stripe Webhook

In Stripe Dashboard → Developers → Webhooks → Add endpoint:

- URL: `https://party.timaeus.ai/api/webhook`
- Events: `checkout.session.completed`, `payment_intent.succeeded`

Copy the signing secret into `STRIPE_WEBHOOK_SECRET` in `.env.local` and restart the service.

---

## URLs

| Page | URL |
|------|-----|
| Sales (presale) | party.timaeus.ai |
| Staff terminal | party.timaeus.ai/terminal |
| Fulfillment dashboard | party.timaeus.ai/dashboard |

## Pricing config

Edit `lib/config.ts` to update prices or package names before the event.
