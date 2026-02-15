# Deploy on cPanel using Git (from Cursor)

You can push your code from Cursor to a Git host (e.g. GitHub), then have cPanel pull from that repo to deploy.

---

## Part 1: From Cursor – push to a Git remote

### 1.1 Make sure the project is a Git repo

In Cursor (or a terminal in the project folder):

```bash
git status
```

If you see "not a git repository", run:

```bash
git init
```

### 1.2 Create a .gitignore (so secrets and build junk aren’t pushed)

You should ignore at least:

- `.env` (never commit passwords or API keys)
- `node_modules/`
- `client/build/` (you can build on the server or in CI)
- `server/warehouse_crm.db` (if you ever use SQLite again)
- `.DS_Store`, `*.log`

Example `.gitignore` in the project root:

```
.env
.env.local
.env.*.local
node_modules/
client/node_modules/
client/build/
server/warehouse_crm.db
*.log
.DS_Store
```

### 1.3 Add a remote and push

1. Create a **new repository** on **GitHub** (or GitLab/Bitbucket). Do **not** add a README/license if your folder already has files.
2. In your project folder in Cursor (terminal):

```bash
git add .
git commit -m "Initial commit - Refined CRM"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

Use your real GitHub username and repo name. If you use SSH:

```bash
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

From here on, when you want to deploy:

- In Cursor: commit and push (e.g. `git add .` → `git commit -m "Your message"` → `git push`).
- On cPanel: pull (see Part 2).

---

## Part 2: On cPanel – use Git Version Control

### 2.1 Open Git Version Control

1. Log in to **cPanel**.
2. In the **Files** or **Software** section, open **Git™ Version Control** (or **Git Version Control**).

### 2.2 Create the repository (clone)

1. Click **Create** or **Clone a Repository**.
2. Fill in:
   - **Repository URL**: your repo clone URL, e.g.  
     `https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git`  
     (Use **HTTPS** if you don’t use SSH keys on cPanel.)
   - **Repository Path**: directory where the app should live, e.g.  
     `refined-crm` or `public_html/connect`  
     This will be the folder that contains `server`, `client`, `package.json`, etc.
3. Click **Create** (or **Clone**). cPanel will clone the repo into that path.

### 2.3 Pull to deploy (after you push from Cursor)

Whenever you’ve pushed from Cursor and want to update the live site:

1. In cPanel, open **Git Version Control**.
2. Find your repository (the path you chose).
3. Click **Pull** or **Update from Remote** to run `git pull origin main` (or your default branch).

So the flow is: **Cursor → commit & push** → **cPanel → Pull**.

### 2.4 One-time setup after first clone

- **Add `.env` on the server**  
  The repo doesn’t (and shouldn’t) contain `.env`. In cPanel **File Manager**, go to the repo folder and create a file named `.env` with your live settings (copy from `env.cpanel.txt` and use real DB password, etc.).

- **Install dependencies and build (if you build on the server)**  
  In the repo folder on the server you need to run:
  - `npm install` (and optionally `cd client && npm install` if you use a separate client install).
  - If you deploy the built frontend from the server: `npm run build` (so `client/build` is created).
  Or use **Setup Node.js App** and use **Run NPM Install** there; set **Application root** to the same repo folder.

- **Point Node.js app at the repo folder**  
  In **Setup Node.js App**, set **Application root** to the same path you used as **Repository Path** in Git (e.g. `refined-crm`). Start command: `node server/index.js`. Start the app after the first pull and after creating `.env`.

---

## Summary

| Step | Where | Action |
|------|--------|--------|
| 1 | Cursor | `git init` (if needed), add `.gitignore`, commit, add remote, push to GitHub |
| 2 | cPanel | Git Version Control → Create → paste repo URL, set path → Create |
| 3 | cPanel | File Manager → create `.env` in repo folder (from env.cpanel.txt) |
| 4 | cPanel | Setup Node.js App → Application root = repo path, NPM Install, Start |
| 5 | Cursor | When you change code: commit, then `git push` |
| 6 | cPanel | Git Version Control → your repo → **Pull** to deploy |

Yes – you can deploy the site on cPanel using Git by pushing from Cursor to a remote (e.g. GitHub) and having cPanel clone/pull that repo into the folder where your Node app and (optionally) built frontend run.
