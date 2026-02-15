# Local development – getting login to work

Login on **http://localhost:3000** only works if:

1. The **backend** is running (Node server on port 5000).
2. The backend can connect to **MySQL** (database running and correct `.env`).
3. An **admin user** exists (e.g. `admin@company.com` / `admin123`).

---

## Why "Login failed" on localhost

- **ECONNREFUSED on port 3306** means nothing is listening for MySQL on your machine. So either:
  - MySQL is **not installed** on your PC, or  
  - MySQL is **installed but not running**.

Until the app can connect to MySQL, the backend can’t look up users or create the default admin, so login will always fail.

---

## Option A: Use MySQL locally (recommended for daily dev)

1. **Install MySQL** on your PC (e.g. [MySQL Installer for Windows](https://dev.mysql.com/downloads/installer/)).
2. **Start the MySQL service** (e.g. from Services, or run `mysql` and keep it running).
3. **Create a local database and user** (optional; you can use root):
   - Either create a database named `refined_crm` and a user with password, or use root with no password for local only.
4. **Add a `.env` file** in the project root (same folder as `package.json`) with your **local** MySQL settings, for example:
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=refined_crm
   JWT_SECRET=local-dev-secret
   PORT=5000
   ```
   (Use your real local DB user/password if not root.)
5. **Create the default admin:**
   ```bash
   node server/scripts/create-admin.js
   ```
   You should see: `Default admin user created` or `Admin password reset to: admin123`.
6. **Start the backend:**
   ```bash
   npm run server
   ```
   Or: `node server/index.js`
7. In the browser, open **http://localhost:3000** and log in with **admin@company.com** / **admin123**.

---

## Option B: No local MySQL – use the live site

- Don’t run the backend locally. Use the **live site** (e.g. **https://connect.refined-digital.co.za**) and log in there with **admin@company.com** / **admin123** after the Node app is set up on cPanel.

---

## Option C: Connect local app to cPanel MySQL (advanced)

- Some hosts allow **Remote MySQL** from your IP.
- In cPanel, add your home/work IP in **Remote MySQL**.
- In your local `.env`, set `DB_HOST` to your hosting MySQL host (not `localhost`), and use the same `DB_USER`, `DB_PASSWORD`, `DB_NAME` as on cPanel.
- Then run `node server/scripts/create-admin.js` and `npm run server` locally; the app will use the live database. Use only for testing; avoid for production data.

---

## Quick check

- **Backend running?** Open **http://localhost:5000/api/health** in the browser. You should see `{"ok":true}`. If the page doesn’t load, start the server with `npm run server`.
- **Admin exists?** Run `node server/scripts/create-admin.js`. If it says "Admin user created" or "Admin password reset", then log in with **admin@company.com** / **admin123**.
