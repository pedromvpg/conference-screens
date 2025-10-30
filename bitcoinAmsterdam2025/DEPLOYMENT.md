# GitHub Pages Deployment Guide

## 📋 Pre-Deployment Checklist

Before deploying to GitHub Pages, ensure:

- [ ] `config.js` is properly configured locally (for development)
- [ ] `config.js` is in `.gitignore` (already done ✅)
- [ ] `config.example.js` is committed to the repository
- [ ] All HTML files are working locally
- [ ] README.md is up to date

## 🚀 Deployment Steps

### Option 1: Deploy from Root (Recommended)

1. **Create a GitHub Repository**
   ```bash
   # If not already initialized
   git init
   git add .
   git commit -m "Initial commit: Bitcoin Amsterdam 2025 conference screens"
   ```

2. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/yourusername/bitcoin-amsterdam-2025.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under **Source**, select:
     - Branch: `main`
     - Folder: `/ (root)`
   - Click **Save**

4. **Wait for Deployment**
   - GitHub will build your site (usually takes 1-2 minutes)
   - Your site will be available at: `https://yourusername.github.io/bitcoin-amsterdam-2025/`

### Option 2: Deploy from `/docs` Folder

If you prefer to use a `/docs` folder:

1. Move all HTML, CSS, JS files to a `docs` folder
2. In GitHub Settings → Pages, select folder: `/docs`

## 🔧 Post-Deployment Configuration

### For Screens Requiring Airtable Data

The deployed site will show the screens, but **users need to configure their own API keys**:

1. Users visit your deployed site
2. Download `config.example.js`
3. Rename to `config.js` and add their Airtable credentials
4. Use the screens locally with their own data

**Note:** Because `config.js` is gitignored, the deployed site won't have API credentials. This is intentional for security.

### Alternative: Environment Variables (GitHub Actions)

If you want the deployed site to work with data, you can use GitHub Actions with encrypted secrets:

1. Go to repository Settings → Secrets → Actions
2. Add secrets for:
   - `AIRTABLE_TOKEN_SPONSORS`
   - `AIRTABLE_BASE_SPONSORS`
   - `AIRTABLE_TABLE_SPONSORS`
   - `AIRTABLE_TOKEN_AGENDA`
   - `AIRTABLE_BASE_AGENDA`
   - `AIRTABLE_TABLE_AGENDA`

3. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Create config.js from secrets
        run: |
          cat > config.js << 'EOF'
          const CONFIG = {
              sponsors: {
                  accessToken: '${{ secrets.AIRTABLE_TOKEN_SPONSORS }}',
                  baseId: '${{ secrets.AIRTABLE_BASE_SPONSORS }}',
                  tableName: '${{ secrets.AIRTABLE_TABLE_SPONSORS }}'
              },
              agenda: {
                  accessToken: '${{ secrets.AIRTABLE_TOKEN_AGENDA }}',
                  baseId: '${{ secrets.AIRTABLE_BASE_AGENDA }}',
                  tableName: '${{ secrets.AIRTABLE_TABLE_AGENDA }}'
              }
          };
          EOF
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
```

## 🔗 Custom Domain (Optional)

To use a custom domain:

1. Create a file named `CNAME` in your repository root
2. Add your domain (e.g., `conference.bitcoinamsterdam.com`)
3. Configure DNS:
   - Add CNAME record pointing to: `yourusername.github.io`
   - Or A records pointing to GitHub Pages IPs
4. In GitHub Settings → Pages, add your custom domain

## 🧪 Testing Before Deployment

Test locally before deploying:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx http-server

# Then visit: http://localhost:8000
```

## 🔄 Updating the Deployed Site

To update after deployment:

```bash
git add .
git commit -m "Update conference screens"
git push origin main
```

GitHub Pages will automatically rebuild (1-2 minutes).

## 📊 Monitoring

- Check deployment status: Repository → Actions tab
- View live site: Your GitHub Pages URL
- Check for errors: Browser DevTools Console

## 🆘 Troubleshooting

### Site not loading
- Check GitHub Pages is enabled in Settings
- Verify branch and folder are correct
- Wait a few minutes for initial deployment

### Screens show errors
- For Airtable screens: Users need to configure `config.js` locally
- For price/hashrate screens: Should work immediately (use public APIs)

### 404 errors on assets
- Verify all file paths are relative (no absolute paths)
- Check file names match exactly (case-sensitive)

## 🎯 What Gets Deployed

✅ **Included in deployment:**
- All HTML files
- All CSS files
- All JavaScript files (except `config.js`)
- `config.example.js` template
- README.md and documentation
- Images and assets

❌ **Excluded from deployment:**
- `config.js` (in .gitignore)
- `.DS_Store` files
- `node_modules/`
- `.env` files

This ensures your API keys stay secure! 🔒

