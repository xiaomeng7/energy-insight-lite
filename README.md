# Energy Insight Lite

**Product name: Lite.** Standalone landing page for the Lite product: instant energy profile + locked full result; unlock via Stripe ($199). Vanilla HTML/CSS/JS + Netlify Functions for checkout.

- **Front:** `index.html` (embedded CSS + JS)
- **Back:** `netlify/functions` — createLiteCheckoutSession, verifyLitePayment, stripeWebhook
- **Product:** Energy Insight (Lite), AUD $199 one-off (credit toward Pro)
- **Flow:** 2-minute check → free preview → Unlock $199 → Stripe Checkout → return → verify → show full result

## Run locally

Static only: open `index.html` in a browser. With Stripe/DB (Netlify):

```bash
npm install
netlify dev
```

## Deploy (Netlify)

1. Connect repo; publish directory: `.`; functions: `netlify/functions`.
2. Env vars (same DB as Pro/admin):
   - `NEON_DATABASE_URL` — Postgres (run migration 004 on this DB)
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET` — from Stripe Dashboard → Webhooks (endpoint: `/.netlify/functions/stripeWebhook`)
   - `LITE_SITE_URL` — deployed Lite URL (e.g. `https://lite.example.com`)
   - Optional: `STRIPE_PRICE_ID_LITE_199` — or price is created inline ($199 AUD)
3. Run migration 004 (in the Pro/landing-page repo):  
   `psql "$NEON_DATABASE_URL" -f migrations/004_advisory_lite_payment.sql`

## 如何接入真实 Stripe 支付页面

当前流程里，用户点击「Unlock full results — $199」后会跳转到 **Stripe 官方托管收款页**（Checkout）。要让它变成真实收款，按下面做即可。

### 1. 注册 Stripe 账号

- 打开 [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register) 注册。
- 完成邮箱/手机验证后进入 Dashboard。

### 2. 拿到 API 密钥（先测再用正式）

- 在 Stripe Dashboard 顶部可切换 **Test mode**（测试）和 **Live mode**（正式）。
- **开发/测试阶段**：保持 **Test mode**。
  - 左侧 **Developers** → **API keys**。
  - 复制 **Secret key**（形如 `sk_test_...`），这就是 `STRIPE_SECRET_KEY`。
- **正式收款**：切到 **Live mode**，再复制 **Secret key**（`sk_live_...`），用做线上的 `STRIPE_SECRET_KEY`。

（Publishable key 用于前端；我们这里只用后端 Secret key 创建 Checkout，不暴露在前端。）

### 3. 在 Netlify 里配置环境变量

- 打开你的 **Lite 站点** 对应的 Netlify 项目 → **Site configuration** → **Environment variables**。
- 添加（或确认已有）：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `STRIPE_SECRET_KEY` | 上一步复制的 Secret key（测试用 `sk_test_...`，正式用 `sk_live_...`） | `sk_test_xxxx` 或 `sk_live_xxxx` |
| `LITE_SITE_URL` | Lite 站点最终访问地址（用户付完款会回到这里） | `https://your-lite-site.netlify.app` |
| `STRIPE_WEBHOOK_SECRET` | 下一步创建 Webhook 后得到的「Signing secret」 | `whsec_xxxx` |
| `NEON_DATABASE_URL` | 与 Pro/Admin 共用的 Postgres 连接串 | `postgres://...` |

保存后重新部署一次，让函数读到新变量。

### 4. 在 Stripe 里添加 Webhook（必须）

这样即使用户关掉浏览器，Stripe 也会通知你「已付款」，数据库能正确更新为已付。

- Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**。
- **Endpoint URL** 填：  
  `https://你的Lite站点域名/.netlify/functions/stripeWebhook`  
  例如：`https://your-lite-site.netlify.app/.netlify/functions/stripeWebhook`
- **Events to send**：勾选（或搜索添加）：
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`（可选，异步支付成功时用）
- 保存后，点进该 Webhook → **Signing secret** → **Reveal**，复制 `whsec_...`，这就是 `STRIPE_WEBHOOK_SECRET`，填回 Netlify 环境变量并重新部署。

### 5. （可选）在 Stripe 里创建 $199 商品

- 不创建也可以：代码里会用 **price_data** 动态生成「$199 AUD 一次性」商品，用户看到的金额和名称一致。
- 若希望在 Dashboard 里统一管理商品：
  - **Product catalog** → **Add product**，名称如 "Energy Decision Tool — Full Result Unlock"。
  - 添加一个 **One-time** 价格，**$199.00 AUD**。
  - 复制该 **Price ID**（形如 `price_xxxx`），在 Netlify 里增加环境变量 `STRIPE_PRICE_ID_LITE_199`，值为该 ID。代码会优先使用这个 Price，否则继续用内联 price_data。

### 6. 测试真实支付流程（Test mode）

- 确保 Netlify 里 `STRIPE_SECRET_KEY` 是 **Test** 的 `sk_test_...`，`STRIPE_WEBHOOK_SECRET` 是 **Test** 环境下该 Webhook 的 signing secret。
- 在 Lite 页完成问卷 → 点「Unlock full results — $199」→ 应跳转到 Stripe 的 **测试** 收款页。
- Stripe 测试卡号（Test mode 下）：  
  - 成功：`4242 4242 4242 4242`  
  - 任意未来到期日、任意 CVC、任意邮编即可。
- 付完后应跳回你的 Lite 页并显示完整结果；Admin 里该条记录应为 **Payment: PAID**、**Source: LITE PAID**。

### 7. 上线真实收款（Live mode）

- 在 Stripe 完成 **账户激活**（身份、银行信息等）。
- 切到 **Live mode**，把 Netlify 里的 `STRIPE_SECRET_KEY` 换成 **Live** 的 `sk_live_...`。
- 在 **Developers** → **Webhooks** 里再 **Add endpoint**，URL 同上，但这是 **Live** 的 Webhook；把新的 **Signing secret** 填到 Netlify 的 `STRIPE_WEBHOOK_SECRET`。
- 若用了 `STRIPE_PRICE_ID_LITE_199`，在 Live 下也创建一个 $199 AUD 的 Price，并更新该环境变量。
- 重新部署 Lite 站点，之后用户就会看到真实的 Stripe 支付页面并完成真实扣款。

## Tracking

Events: `page_open`, `lite_unlock_click`, `lite_checkout_redirect`, `lite_payment_verified` (and existing snapshot events). Logged to `console` and `window.__events`.
