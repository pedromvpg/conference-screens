# Bitcoin Amsterdam 2025 Conference Screens

This project contains display screens for the Bitcoin Amsterdam 2025 conference.

## Setup Instructions

### 1. API Configuration

This project uses Airtable to fetch data. Before using the project, you need to set up your API configuration:

1. Copy the example configuration file:
   ```bash
   cp config.example.js config.js
   ```

2. Edit `config.js` and replace the placeholder values with your actual Airtable credentials:
   - `accessToken`: Your Airtable Personal Access Token
   - `baseId`: Your Airtable Base ID
   - `tableName`: Your Airtable Table Name

### 2. Security Note

**IMPORTANT:** The `config.js` file contains sensitive API keys and is excluded from git via `.gitignore`. 

- ✅ **DO** keep your API keys in `config.js`
- ❌ **DON'T** commit `config.js` to git
- ✅ **DO** commit `config.example.js` as a template for others
- ❌ **DON'T** share your API keys publicly

### 3. Files Structure

- `config.js` - Your actual API keys (not committed to git)
- `config.example.js` - Template for API configuration
- `script.js` - Main sponsors display script
- `led_c_scripts.js` - LED C display script
- Various HTML files for different screen displays

### 4. Screen Types

- **LED A Sponsors** (`led_a_sponsors.html`)
- **Treasury Stage Sponsors** (`treasury_stage_sponsors.html`)
- **Genesis Stage Sponsors** (`genesis_stage_sponsors.html`)
- **LED C Title** (`led_c_title_bitcoin_asia.html`)
- **Price Display** (`price.html`)
- **Hashrate Display** (`hashrate.html`)

## Development

Simply open the HTML files in a web browser to view the screens. Make sure `config.js` is properly set up before running.

## Git Ignore

The following files are excluded from git:
- `config.js` (contains API keys)
- `.DS_Store` (macOS system file)
- `node_modules/` (if using npm packages)
- `.env` files (environment variables)

