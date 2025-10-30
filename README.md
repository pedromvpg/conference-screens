# Conference Screens

This repository contains display screens for various Bitcoin conferences.

## 📁 Projects

### [Bitcoin Amsterdam 2025](./bitcoinAmsterdam2025/)

Conference display screens for Bitcoin Amsterdam 2025, including:
- Sponsor displays (LED A, Treasury Stage, Genesis Stage)
- Event schedule and agenda
- Live Bitcoin price display
- Network hashrate display
- Professional landing page

[→ View Full Documentation](./bitcoinAmsterdam2025/README.md)

## 🌐 GitHub Pages

This repository is configured to deploy the Bitcoin Amsterdam 2025 screens to GitHub Pages.

**Live Site:** `https://yourusername.github.io/conference-screens/`

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/conference-screens.git
cd conference-screens

# Navigate to a specific conference
cd bitcoinAmsterdam2025

# Set up configuration
cp config.example.js config.js
# Edit config.js with your API credentials

# Run locally
python3 -m http.server 8000
# Visit http://localhost:8000
```

## 📖 Documentation

Each conference folder contains its own complete documentation:
- Setup instructions
- Deployment guides
- Configuration details
- Screen descriptions

## 🔒 Security

API keys and sensitive configuration are stored in `config.js` files which are:
- ✅ Excluded from git via `.gitignore`
- ✅ Template provided as `config.example.js`
- ✅ Required only for local development

The deployed GitHub Pages site works without exposing API credentials.

## 🤝 Contributing

Each conference project is self-contained in its own directory. To add a new conference:

1. Create a new directory with the conference name
2. Follow the structure of existing conferences
3. Include proper documentation
4. Update this README with a link to your conference

## 📞 Support

For issues or questions about specific conferences, see the README in each conference directory.

---

Made with ⚡ for the Bitcoin community

