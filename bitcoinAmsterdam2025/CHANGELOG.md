# Changelog

## [1.0.0] - 2024-10-30

### 🎉 Initial Release - GitHub Pages Ready

#### Added
- **Professional Landing Page** (`index.html`)
  - Modern, responsive design
  - Categorized screen listings
  - Setup instructions for new users
  - Visual status indicators for each screen
  
- **Security Configuration**
  - Separated API keys into `config.js` (gitignored)
  - Created `config.example.js` template
  - Updated `.gitignore` with comprehensive exclusions
  - Refactored code to use external configuration
  
- **Conference Display Screens**
  - LED A Sponsors display
  - Treasury Stage Sponsors display
  - Genesis Stage Sponsors display
  - LED C Event Schedule with live agenda
  - Bitcoin Price display (live from Mempool.space)
  - Network Hashrate display (live from Mempool.space)
  
- **Documentation**
  - `README.md` - Setup and usage guide
  - `DEPLOYMENT.md` - GitHub Pages deployment guide
  - `QUICK_START.md` - Quick start instructions
  - `SETUP_SUMMARY.md` - Security configuration summary
  - `GITHUB_PAGES_READY.md` - Deployment checklist
  - `CHANGELOG.md` - This file
  
- **GitHub Actions**
  - `.github/workflows/static.yml` - Automatic deployment workflow
  - Deploys to GitHub Pages on push to main branch
  
- **Configuration Structure**
  - `CONFIG.sponsors` - Airtable config for sponsor displays
  - `CONFIG.agenda` - Airtable config for event schedule

#### Changed
- Renamed `CONFIG.ledC` to `CONFIG.agenda` for better semantic naming
- Updated all HTML files to include `config.js` script tag
- Enhanced `.gitignore` with IDE, OS, and build exclusions

#### Security
- 🔒 API keys removed from source code
- 🔒 Configuration file properly gitignored
- 🔒 Example template provided for safe sharing

---

## Future Enhancements

### Planned Features
- [ ] Real-time auto-refresh for agenda screens
- [ ] QR code generator for screen sharing
- [ ] Multi-language support
- [ ] Dark/light theme toggle
- [ ] Screen preview thumbnails on landing page

### Ideas for Consideration
- Mobile-responsive versions of all screens
- PDF export of schedules
- Integration with other conference APIs
- Analytics dashboard
- Screen rotation scheduler

---

## Migration Notes

### Upgrading from Pre-1.0

If you have an older version with hardcoded API keys:

1. Create `config.js` from `config.example.js`
2. Move your API credentials to `config.js`
3. Remove old hardcoded credentials from `script.js` and `led_c_scripts.js`
4. Verify `.gitignore` includes `config.js`
5. Test all screens locally before deploying

---

## Version Naming

- **Major** (X.0.0): Breaking changes or major redesigns
- **Minor** (1.X.0): New features, screens, or significant improvements
- **Patch** (1.0.X): Bug fixes, minor tweaks, documentation updates

