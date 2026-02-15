# Deploy Refined CRM from GitHub to connect.refined-digital.co.za

This guide gets your site live at **https://connect.refined-digital.co.za** with **automatic deploys** whenever you push to GitHub. No cPanel.

---

## Option A: Render.com (recommended, free tier)

Render runs your Node app, builds the React client, and serves everything. It connects to GitHub and redeploys on every push.

### 1. Push your code to GitHub

From Cursor (or your terminal) in the project folder:

```bash
git add .
git commit -m "Prepare for GitHub deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

If the repo already exists and is connected, just push:

```bash
git add .
git commit -m "Your message"
git push
```

### 2. Create a Render account and connect GitHub

1. Go to **[dashboard.render.com](https://dashboard.render.com)** and sign up or log in.
2. In the **top-right corner** of the dashboard, click the **"+ New"** button (it may look like a blue **New** with a **+**).
3. In the dropdown that appears, click **"Web Service"** (not Static Site—your app has a Node backend).
4. You’ll see a form. If you haven’t linked GitHub yet:
   - Click **“Connect account”** (or similar) for **GitHub** and authorize Render in the popup.
   - After connecting, you’ll see a **list of your GitHub repos**.
5. **Select your Refined CRM repo** from the list (search by name if you have many), then click **“Connect”** next to it.  
   - **Don’t see your repo?** In GitHub go to **Settings → Applications → Authorized OAuth Apps → Render** and make sure Render has access to the repository (or grant “All repositories”).
6. The form will expand. Configure:
   - **Name:** `refined-crm` (or any name).
   - **Region:** Choose one close to your users (e.g. Frankfurt).
   - **Branch:** `main`.
   - **Runtime:** **Node**.
   - **Build Command:**
     ```bash
     npm install && cd client && npm install --include=dev && npm run build
     ```
   - **Start Command:**
     ```bash
     node server/index.js
     ```
   - **Plan:** Free (or paid if you want a persistent disk for SQLite).

### 3. Environment variables (required)

In the same Web Service screen, open **Environment** and add:

| Key | Value | Notes |
|-----|--------|--------|
| `NODE_ENV` | `production` | |
| `APP_URL` | `https://connect.refined-digital.co.za` | Your live URL |
| `JWT_SECRET` | *(long random string)* | e.g. generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `REACT_APP_API_URL` | `https://connect.refined-digital.co.za/api` | Used at **build** time for the React app |
| `PUBLIC_URL` | `https://connect.refined-digital.co.za` | Used at **build** time for asset paths |
| `DB_USE_SQLITE` | `true` | Use SQLite (no MySQL needed) |
| `DB_PATH` | `/tmp/data/refined_crm.sqlite` | Free tier: data in `/tmp` (lost on restart). For persistent data use a paid **Disk** and e.g. `/data/refined_crm.sqlite` |

Optional (for emails):

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`

Then click **Create Web Service**. Render will build and start the app.

### 4. Add your custom domain

1. In the Render dashboard, open your **refined-crm** service.
2. Go to **Settings** → **Custom Domains**.
3. Click **Add Custom Domain** and enter: `connect.refined-digital.co.za`.
4. Render will show you DNS instructions (usually a **CNAME** or **A** record).
5. In your domain registrar (where refined-digital.co.za is managed), add the record Render gives you:
   - **CNAME:** `connect` → value Render shows (e.g. `refined-crm.onrender.com`),  
     **or**
   - **A:** `connect` → Render’s IP (if they provide one).
6. Wait for DNS to propagate (minutes to a few hours). Render will issue SSL for the domain.

### 5. Automatic deploys

- Every **git push** to the connected branch (e.g. `main`) triggers a new build and deploy.
- You can see build logs and deploy status in the Render dashboard.

---

## Option B: Railway

1. Go to **[railway.app](https://railway.app)** and sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → select this repo.
3. Railway will detect Node. Set:
   - **Build:** `npm install && cd client && npm install && npm run build`
   - **Start:** `node server/index.js`
4. In **Variables**, add the same env vars as in the table above. For Railway you can use a **Volume** for `DB_PATH` so SQLite data persists (e.g. mount at `/data` and set `DB_PATH=/data/refined_crm.sqlite`).
5. **Settings** → **Networking** → **Custom Domain** → add `connect.refined-digital.co.za` and follow Railway’s DNS instructions.

---

## Option C: Your own server (VPS) with GitHub Actions

If you have a VPS (DigitalOcean, Linode, etc.) and want to deploy there on every push:

1. On the server: install Node, clone the repo, run `npm install`, `npm run build`, and `node server/index.js` (e.g. with PM2).
2. Point `connect.refined-digital.co.za` to the server’s IP (A record) and use nginx (or similar) as a reverse proxy with SSL (e.g. Let’s Encrypt).
3. Use **GitHub Actions** to SSH into the server and run `git pull`, `npm install`, `npm run build`, then restart the Node process on every push to `main`.

A sample workflow file can be added under `.github/workflows/deploy.yml` if you want to use this option.

---

## Checklist after first deploy

- [ ] Site loads at **https://connect.refined-digital.co.za**
- [ ] Login works (default: `admin@company.com` / `admin123` — change password in the app)
- [ ] You pushed a small change to GitHub and saw a new deploy on Render (or your host)

---

## Troubleshooting

- **“Connection failed” or blank page:** Wait for the first build to finish (2–5 minutes). Then hard-refresh (Ctrl+F5) or open the site in a private window.
- **API 404 or wrong URL:** Ensure `REACT_APP_API_URL` and `APP_URL` are exactly `https://connect.refined-digital.co.za/api` and `https://connect.refined-digital.co.za` (no trailing slash), and that you **redeployed** after changing them (they are baked into the client at build time).
- **Database errors:** On Render free tier with `DB_PATH=/tmp/...`, the DB is recreated on each deploy/restart. For persistent data, use a Render Disk (paid) or MySQL/PostgreSQL add-on and configure `DB_HOST`, `DB_USER`, etc. instead of SQLite.

If you tell me which option you’re using (Render, Railway, or VPS), I can add a minimal GitHub Actions workflow for the VPS or tweak the Render/Railway steps for your exact repo and domain.
