# API Keys Security Setup - Summary

## ✅ What Was Done

Your API keys have been successfully separated from your code and secured!

### 1. Created Configuration Files

- **`config.js`** - Contains your actual Airtable API keys (excluded from git)
- **`config.example.js`** - Template file showing the required structure (safe to commit)

### 2. Created `.gitignore`

The `.gitignore` file now prevents sensitive files from being committed to git:
- `config.js` (your API keys)
- `.DS_Store` (macOS system files)
- `.env` files
- `node_modules/`
- Log files

### 3. Updated Code Files

Modified the following files to use the external config:
- `script.js` - Now loads config from `CONFIG.sponsors`
- `led_c_scripts.js` - Now loads config from `CONFIG.agenda`

### 4. Updated HTML Files

Added `config.js` script tag to all HTML files that need it:
- `led_a_sponsors.html`
- `treasury_stage_sponsors.html`
- `genesis_stage_sponsors.html`
- `led_c_title_bitcoin_asia.html`

### 5. Created Documentation

- **`README.md`** - Setup and usage instructions

## 🔒 Security Status

✅ **Verified:** `config.js` is properly ignored by git (won't be committed)

```bash
# Verification command showed:
bitcoinAmsterdam2025/.gitignore:2:config.js	config.js
```

## 📝 Next Steps for Other Team Members

If someone else clones this repository, they need to:

1. Copy the example config:
   ```bash
   cp config.example.js config.js
   ```

2. Edit `config.js` and add their own Airtable API keys

3. The application will then work with their credentials

## ⚠️ Important Reminders

- **NEVER** commit `config.js` to git
- **ALWAYS** use `config.example.js` as a template for others
- **DON'T** share your Airtable access tokens publicly
- If you accidentally commit `config.js`, you should:
  1. Immediately revoke the API keys in Airtable
  2. Generate new API keys
  3. Update your local `config.js` with the new keys
  4. Remove the sensitive commit from git history

## 🎯 What's Protected

Your Airtable credentials:
- Access Token: `patPGv6SXBw6QmAnw...` (now in config.js only)
- Base IDs for both sponsors and agenda displays
- Table Names

These are no longer hardcoded in your JavaScript files!

