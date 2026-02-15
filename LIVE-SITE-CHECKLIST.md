# Live site login – checklist

Use this so the CRM works and you can log in at **https://connect.refined-digital.co.za**.

---

## 1. .env on the server (cPanel)

- In **File Manager**, go to the folder where your app lives (the one that contains the `server` folder).
- Create or edit a file named **`.env`** (no .txt) in that same folder.
- Paste in the **full contents** of your `env.cpanel.txt`, including:
  - **DB_USER**, **DB_PASSWORD**, **DB_NAME** (and **DB_HOST** if cPanel is not localhost).
  - **JWT_SECRET** (already set in the template; keep it secret).
  - **APP_URL** = `https://connect.refined-digital.co.za`
  - **REACT_APP_API_URL** and **PUBLIC_URL** if you use them for the frontend build.
- If cPanel added a prefix to the database/user (e.g. `linda_refinedd_crm`), use those **exact** names in **DB_USER** and **DB_NAME** in `.env`.
- Save the file. The password is **Winter@2024**; DB user is **refinedd_crm** (or the prefixed name from cPanel).

---

## 2. Node.js app running (cPanel)

- In cPanel, open **Setup Node.js App** (or **Application Manager**).
- Create an application (or edit the existing one):
  - **Application root**: the folder that contains `server` and `package.json` (your app root).
  - **Application URL**: your domain/subdomain (e.g. `connect.refined-digital.co.za`).
  - **Application startup file**: `server/index.js` **or** start script: `node server/index.js` (or `npm start` if your `package.json` has it).
- Install dependencies on the server (e.g. “Run NPM Install” in the Node.js app panel) so `mysql2` and others are installed.
- **Start** (or restart) the Node.js application.
- On first start, the app will connect to MySQL, create tables, and create the default admin user. Check the application log for errors; if there are none, the backend is running.

---

## 3. API reachable at the same URL as the frontend

- The frontend must call the API at the URL you used when building (e.g. `https://connect.refined-digital.co.za/api`).
- In cPanel you usually do one of:
  - **Proxy**: domain `connect.refined-digital.co.za` with `/api` proxied to the Node app (port 5000 or whatever you set in **PORT** in `.env`), **or**
  - **Subdomain / document root**: Node app is the main app for that domain and serves both the API and (optionally) the built frontend.
- So: **API base URL** in the browser = **REACT_APP_API_URL** you used when building (e.g. `https://connect.refined-digital.co.za/api`). If they match, the login request will hit your Node server.

---

## 4. Frontend build and deployment

- The site you open in the browser (e.g. `https://connect.refined-digital.co.za`) must be the **built** React app (contents of `client/build`), not the raw source.
- When you built the client, **REACT_APP_API_URL** must have been set to your live API URL (e.g. `https://connect.refined-digital.co.za/api`). If you build again, set that in `client/.env.production` or in the build command, then re-upload the new `client/build` contents.

---

## 5. First login

- Default admin (created on first successful DB init):
  - **Email:** `admin@company.com`
  - **Password:** `admin123`
- Open **https://connect.refined-digital.co.za** (or your exact URL), go to the login page, and use those. Change the password after first login (e.g. in Settings).

---

## 6. If login still fails

- **“Connection failed” / network error**: API not reachable. Check (2) and (3): Node app running and `/api` (or your API path) proxied to it; **REACT_APP_API_URL** matches that URL.
- **401 Unauthorized / “Invalid credentials”**: Backend is reached but auth fails. Check that `.env` is in the app root and has the correct **JWT_SECRET** (no typos). Restart the Node app after changing `.env`.
- **500 / “Database error”**: DB connection or permissions. Check **DB_USER**, **DB_PASSWORD**, **DB_NAME** (and prefix) in `.env`; ensure the MySQL user is added to the database with **All Privileges** in cPanel MySQL.

---

**Summary:**  
**.env on server (with DB password Winter@2024 and correct DB names)** + **Node.js app running** + **API URL matching the frontend** + **default login admin@company.com / admin123** = page able to login on the live site on cPanel and on the internet.
