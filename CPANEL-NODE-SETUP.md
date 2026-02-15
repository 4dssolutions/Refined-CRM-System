# Run the Node.js app on cPanel – step-by-step

This walks you through using **Setup Node.js App** so your CRM backend runs on cPanel.

---

## Before you start

- You’ve uploaded your project (folder that contains `server`, `package.json`, and `.env`).
- You’ve created the `.env` file in that same folder with your DB and other settings.
- Your hosting has **Setup Node.js App** (or **Application Manager**) in cPanel.

---

## Step 1: Open Setup Node.js App

1. Log in to **cPanel**.
2. In the **Software** section, click **Setup Node.js App** (or **Application Manager** / **Node.js Selector**, depending on your host).
3. If you see “Create Application”, you’re in the right place.

---

## Step 2: Create a new application

1. Click **Create Application**.
2. Fill in:

   - **Node.js version**  
     Choose a recent version (e.g. **18** or **20**). Avoid very old versions.

   - **Application root**  
     This must be the folder that contains:
     - `server` (folder)
     - `package.json` (file)
     - `.env` (file)  

     Examples:
     - If your app is in `refined-crm`: enter **refined-crm** (or the full path cPanel shows, e.g. `home/username/refined-crm`).
     - If it’s in `public_html/connect`: enter **public_html/connect** (or the equivalent path).
     - Do **not** point it only at the `server` folder; point at the **parent** folder that has both `server` and root `package.json`.

   - **Application URL**  
     The domain/subdomain where the app will run, e.g.:
     - **connect** (if your site is connect.yourdomain.com), or  
     - **connect.refined-digital.co.za** (or whatever your host shows in the dropdown).

   - **Application startup file** (if asked)  
     Enter: **server/index.js**  
     Or, if the form asks for a “run script” or “start command” instead, use: **node server/index.js**.

3. Click **Create**.

---

## Step 3: Set the start command (if the form has it)

- If there’s a field like **Run script**, **Start command**, or **Command to run**, set it to:
  - **node server/index.js**  
  or, if your root `package.json` has a `"start": "node server/index.js"` script:
  - **npm start**
- Save the application settings.

---

## Step 4: Run NPM Install

1. On the same **Setup Node.js App** page, find your application in the list.
2. Click **Open** or the app name so you see options for that app.
3. Find the button or link that says **Run NPM Install** (or **NPM Install**).
4. Click it and wait until it finishes. This installs `mysql2`, `express`, and all other dependencies from `package.json`.
5. If you see “Install completed” or no errors, you’re good.

---

## Step 5: Start the application

1. Still on your app’s page in **Setup Node.js App**.
2. Find **Start** or **Restart** (or a toggle to turn the app **On**).
3. Click **Start** (or turn the app **On**).
4. The first time you start:
   - The app loads `.env` (DB password, etc.).
   - It connects to MySQL and runs `init()`.
   - It creates all tables if they don’t exist.
   - It creates the default admin user: **admin@company.com** / **admin123**.

---

## Step 6: Point your domain to the Node app (proxy)

So that **https://connect.refined-digital.co.za/api** goes to your Node app:

1. In the same **Setup Node.js App** screen, there is often an option like **Add proxy** or **Configure proxy** for your app.
2. Or in **cPanel → Domains** or **Subdomains**, edit the domain/subdomain (e.g. **connect.refined-digital.co.za**).
3. Set the **document root** or **proxy** so that:
   - Requests to **/api** (or your chosen path) are proxied to the Node app (usually to the port shown in Setup Node.js App, e.g. **PORT=5000**).
4. Exact steps depend on your host:
   - Some have “Proxy to Node” with a checkbox and a port.
   - Others use **Application URL** so that the whole subdomain (e.g. connect.yourdomain.com) is handled by the Node app.

If you’re not sure, ask your host: “How do I proxy my subdomain (or /api) to my Node.js app port?”

---

## Step 7: Check that it’s running

1. In **Setup Node.js App**, check the **log** or **output** for your app. You want to see something like:
   - `Connected to MySQL database`
   - `Database tables created successfully`
   - `Server running on port 5000` (or the port in your `.env`)
2. If you see **Database error** or **connect ECONNREFUSED**, check:
   - `.env` is in the **application root** (same folder as `server` and `package.json`).
   - **DB_USER**, **DB_PASSWORD**, **DB_NAME** match cPanel MySQL (including any prefix, e.g. `linda_refinedd_crm`).
   - The MySQL user has **All Privileges** on that database.

---

## Step 8: Log in on the live site

1. Open **https://connect.refined-digital.co.za** (or your URL) in a browser.
2. Use:
   - **Email:** admin@company.com  
   - **Password:** admin123  
3. After first login, change the password in **Settings**.

---

## Quick reference

| What | Value |
|------|--------|
| Application root | Folder that contains `server` + `package.json` + `.env` |
| Startup file | `server/index.js` |
| Start command | `node server/index.js` or `npm start` |
| After Create | Run **NPM Install**, then **Start** |
| First login | admin@company.com / admin123 |

If your cPanel looks different (e.g. “Application Manager” instead of “Setup Node.js App”), the same ideas apply: set root folder, start command, run npm install, start app, then configure URL/proxy for your domain.
