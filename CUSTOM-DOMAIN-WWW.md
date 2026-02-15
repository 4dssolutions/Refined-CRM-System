# Use your paid domain: https://www.connect.refined-digital.co.za

Follow these steps so the app is served at **https://www.connect.refined-digital.co.za** and the blank page is fixed.

---

## 1. Fix the blank page (use relative asset paths)

The repo is updated so the client builds with **relative** asset paths (works on both onrender.com and your domain).

- **Commit and push** so Render gets the change:
  ```bash
  cd "c:\Users\linda\OneDrive\Desktop\Red"
  git add client/package.json
  git commit -m "Use relative paths so app works on any domain"
  git push
  ```
- Render will auto-deploy. After that, **https://refined-crm-system.onrender.com** should show the app (login page), not a blank screen.

---

## 2. Set environment variables for www

In **Render** → your **Refined-CRM-System** service → **Environment**:

Set these to your **www** URL (no trailing slash):

| Key | Value |
|-----|--------|
| `APP_URL` | `https://www.connect.refined-digital.co.za` |
| `REACT_APP_API_URL` | `https://www.connect.refined-digital.co.za/api` |
| `PUBLIC_URL` | *(leave empty or delete this key so the build uses relative paths)* |

Keep your other vars (`NODE_ENV`, `JWT_SECRET`, `DB_USE_SQLITE`, `DB_PATH`, etc.).

**Important:** If `PUBLIC_URL` is set to a full URL, the build will use that for asset URLs and you can get a blank page on one of the domains. Leaving it **empty** (or removing it) avoids that.

Save, then trigger a **Manual Deploy** so the new env is used.

---

## 3. Add your custom domain in Render

1. In the same service, go to **Settings**.
2. Find **Custom Domains** → **Add Custom Domain**.
3. Add: **`www.connect.refined-digital.co.za`**
4. (Optional) Also add **`connect.refined-digital.co.za`** if you want the non-www URL to work.
5. Render will show the DNS record you need (usually a **CNAME**).

---

## 4. Point DNS to Render

Where you manage DNS for **refined-digital.co.za** (registrar, Cloudflare, etc.):

**For www:**

- **Type:** CNAME  
- **Name / Host:** `www.connect` or `connect` (depending on how your host labels subdomains; you want the hostname to be **www.connect.refined-digital.co.za**).  
- **Target / Value:** the hostname Render gave you, e.g. **`refined-crm-system.onrender.com`**

**If you also added connect.refined-digital.co.za (no www):**

- **Type:** CNAME  
- **Name:** `connect`  
- **Target:** `refined-crm-system.onrender.com`

Save the DNS changes. SSL for your domain is handled by Render.

---

## 5. Check

- Wait a few minutes (up to an hour for DNS).
- Open **https://www.connect.refined-digital.co.za** — you should see the Refined CRM login.
- Log in (e.g. `admin@company.com` / `admin123`).

You’re done. Future pushes to `main` will auto-deploy to the same service and domain.
