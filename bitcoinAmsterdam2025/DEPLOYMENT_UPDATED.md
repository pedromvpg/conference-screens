# 🎯 Updated Deployment Instructions

## Repository Structure

This project is in a **subdirectory** of the git repository:

```
conference-screens/           ← Git repository root
├── .git/
├── .github/
│   └── workflows/
│       └── static.yml       ← GitHub Actions workflow
├── .gitignore               ← Root gitignore
├── README.md                ← Root README
└── bitcoinAmsterdam2025/    ← Conference screens (THIS FOLDER)
    ├── index.html
    ├── config.js
    ├── config.example.js
    └── ... (all screen files)
```

## 🚀 Deployment Steps (Updated)

### Option 1: GitHub Actions (Recommended) ✅

The repository is already configured with GitHub Actions!

1. **Just push your changes:**
   ```bash
   cd /Users/pedro/Desktop/git/conference-screens
   git add .
   git commit -m "feat: Conference screens ready for deployment"
   git push origin main
   ```

2. **GitHub Pages will auto-deploy from the subdirectory:**
   - The workflow at `.github/workflows/static.yml` is configured
   - It deploys from `./bitcoinAmsterdam2025` directory
   - Your site will be live at: `https://yourusername.github.io/conference-screens/`

3. **First time only - Enable GitHub Pages:**
   - Go to repository **Settings** → **Pages**
   - Under **Source**, select: **GitHub Actions**
   - That's it! The workflow will handle everything

### Option 2: Manual Deploy from Folder

If you prefer manual configuration:

1. **Go to repository Settings → Pages**
2. Under **Source**, select:
   - Deploy from a branch
   - Branch: `main`
   - Folder: `/bitcoinAmsterdam2025`
3. Click **Save**

## 🔄 What Happens on Deploy

When you push to `main`:

1. GitHub Actions workflow triggers automatically
2. It checks out the repository
3. It deploys **only** the `bitcoinAmsterdam2025` folder to GitHub Pages
4. Your site is live at the root URL (not `/bitcoinAmsterdam2025/`)

Example:
- GitHub Pages URL: `https://yourusername.github.io/conference-screens/`
- Shows content from: `bitcoinAmsterdam2025/index.html`

## 📝 Important Notes

### Configuration Files

The root `.gitignore` now includes:
```
bitcoinAmsterdam2025/config.js
```

This means `config.js` in the subdirectory is properly protected!

### Workflow Location

- **Workflow file:** `/Users/pedro/Desktop/git/conference-screens/.github/workflows/static.yml`
- **Deploys from:** `./bitcoinAmsterdam2025` directory
- **Lives at:** Repository root (not in subdirectory)

### Making Changes

Always work from the repository root:

```bash
cd /Users/pedro/Desktop/git/conference-screens

# Edit files in bitcoinAmsterdam2025/
# Then commit and push
git add .
git commit -m "Update screens"
git push origin main
```

## 🧪 Testing Locally

```bash
# From repository root
cd conference-screens

# Test the conference screens
cd bitcoinAmsterdam2025
python3 -m http.server 8000

# Visit http://localhost:8000
```

## ✅ Verification

Check that everything is set up correctly:

```bash
cd /Users/pedro/Desktop/git/conference-screens

# 1. Verify workflow exists
ls -la .github/workflows/static.yml

# 2. Verify gitignore includes config.js
grep "config.js" .gitignore

# 3. Verify subdirectory structure
ls -la bitcoinAmsterdam2025/index.html

# All should show files exist!
```

## 🎉 You're Ready!

Just push to deploy:

```bash
cd /Users/pedro/Desktop/git/conference-screens
git add .
git commit -m "feat: Bitcoin Amsterdam 2025 conference screens"
git push origin main
```

Then enable GitHub Pages (choose "GitHub Actions" as the source), and you're live! 🚀

---

**Note:** The original `DEPLOYMENT.md` has general instructions. This file has the **updated, subdirectory-specific** instructions for your repository structure.

