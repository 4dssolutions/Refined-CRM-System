# Deploying Refined CRM to cPanel (connect.refined-digital.co.za)

## 1. Environment variables

- **Server:** Copy `.env.example` to `.env` in the **project root** and set:
  - `PORT`, `APP_URL`, `JWT_SECRET`
  - `DB_PATH` if you want the SQLite file outside the server folder
  - SMTP vars if you use email
- **Client build:** Copy `client/.env.production.example` to `client/.env.production` and set:
  - `REACT_APP_API_URL` – full URL to your API (e.g. `https://connect.refined-digital.co.za/api`)
  - `PUBLIC_URL` – full URL of the app (e.g. `https://connect.refined-digital.co.za` or `https://connect.refined-digital.co.za/crm` if in a subfolder)

All config must come from `.env`; do not hardcode secrets.

## 2. Clean production build

From the **project root** (where the main `package.json` is):

```bash
# Install dependencies (if not already)
npm run install-all

# Clean previous build and build the client
cd client
rm -rf build
npm run build
cd ..
```

**Windows (PowerShell or CMD):**

```bash
npm run install-all
cd client
if exist build rmdir /s /q build
npm run build
cd ..
```

## 3. What to zip for cPanel (frontend)

Zip the **contents** of the **client build folder** so that `index.html` is at the root of the archive.

- **Folder to use:** `client/build`
- **What to zip:** Everything **inside** `client/build` (not the `build` folder itself).

So the zip should contain:

- `index.html`
- `favicon.svg`
- `.htaccess` (from `client/public`, copied into build by CRA)
- `static/` (folder with JS, CSS, media)

**Windows (PowerShell):** from project root:

```powershell
cd client\build
Compress-Archive -Path * -DestinationPath ..\..\refined-crm-frontend.zip
cd ..\..
```

**Windows (CMD):** use Explorer: open `client\build`, select all (Ctrl+A), right‑click → Send to → Compressed (zipped) folder, name it e.g. `refined-crm-frontend.zip`.

**macOS/Linux:**

```bash
cd client/build && zip -r ../../refined-crm-frontend.zip . && cd ../..
```

Upload `refined-crm-frontend.zip` to cPanel (e.g. File Manager), extract into the subfolder where the app should live (e.g. `public_html` or `public_html/crm`). Ensure the `.htaccess` is present in that folder so refreshes and direct URLs work (client-side routing).

## 4. Backend (Node API) on cPanel

The API is a Node.js app. On cPanel:

1. Use **Setup Node.js App** (or equivalent) and point the application root to the folder that contains `server/`, your root `package.json`, and `.env`.
2. Set **Start script** (or run command) to: `node server/index.js` (or `npm start` if you use a start script that runs the server).
3. Ensure `.env` is in that same root and contains `PORT`, `JWT_SECRET`, `APP_URL`, `DB_PATH` (if used), and SMTP vars as needed.
4. Use a reverse proxy or subdomain so that the frontend’s `REACT_APP_API_URL` (e.g. `https://connect.refined-digital.co.za/api`) points to this Node app.

## 5. Subfolder deployment

If the app is in a subfolder (e.g. `https://connect.refined-digital.co.za/crm`):

1. Set **client** `PUBLIC_URL` (in `client/.env.production`) to `https://connect.refined-digital.co.za/crm`.
2. Rebuild the client (`npm run build` from `client`).
3. In the extracted build folder on the server, edit **`.htaccess`**:
   - `RewriteBase /crm/`
   - Last rule: `RewriteRule . /crm/index.html [L]`

Then zip the contents of `client/build` again and re-upload as in section 3.
