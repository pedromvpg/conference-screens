# 🚀 Quick Start Guide

## For First-Time Setup

### 1. Clone the Repository
\`\`\`bash
git clone https://github.com/yourusername/bitcoin-amsterdam-2025.git
cd bitcoin-amsterdam-2025
\`\`\`

### 2. Configure API Keys (For Airtable Screens)
\`\`\`bash
# Copy the example config
cp config.example.js config.js

# Edit config.js and add your Airtable credentials
# You need:
# - Personal Access Token
# - Base ID
# - Table Name
\`\`\`

### 3. Run Locally
\`\`\`bash
# Option 1: Python (if installed)
python3 -m http.server 8000

# Option 2: Node.js (if installed)
npx http-server

# Option 3: Just open index.html in your browser
open index.html
\`\`\`

### 4. Access the Screens
- Landing page: http://localhost:8000
- Or directly open any HTML file in your browser

---

## For Deploying to GitHub Pages

### Quick Deploy
\`\`\`bash
# Ensure you're on main branch
git checkout main

# Push to GitHub
git push origin main
\`\`\`

### Enable GitHub Pages (First Time Only)
1. Go to repository Settings
2. Click "Pages" in left sidebar
3. Under "Source", select "main" branch and "/" root folder
4. Click "Save"
5. Wait 1-2 minutes
6. Visit: https://yourusername.github.io/repository-name/

---

## Available Screens

### ✅ Works Without Configuration
- **Bitcoin Price** (price.html) - Live BTC price + YTD chart
- **Network Hashrate** (hashrate.html) - Live hashrate + 1Y chart

### 🔑 Requires Airtable Configuration
- **LED A Sponsors** (led_a_sponsors.html)
- **Treasury Stage Sponsors** (treasury_stage_sponsors.html)
- **Genesis Stage Sponsors** (genesis_stage_sponsors.html)
- **Event Schedule** (led_c_title_bitcoin_asia.html)

---

## Troubleshooting

### "Config is not defined" Error
- You forgot to create \`config.js\`
- Copy \`config.example.js\` to \`config.js\`
- Add your Airtable credentials

### Screens Show "No Data"
- Check your Airtable credentials in \`config.js\`
- Verify the Base ID and Table Name are correct
- Ensure your Personal Access Token has proper permissions

### GitHub Pages Shows 404
- Wait 1-2 minutes after enabling GitHub Pages
- Check that the branch and folder are set correctly in Settings
- Verify you pushed the latest commits

---

## Need More Help?

- **Setup Instructions**: See \`README.md\`
- **Deployment Guide**: See \`DEPLOYMENT.md\`
- **Security Info**: See \`SETUP_SUMMARY.md\`

---

**Ready to go!** 🎉 Open \`index.html\` to see all available screens.
