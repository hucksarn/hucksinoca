# VPS Deployment Guide

## Requirements
- Node.js 18+ (install via `nvm` — no sudo needed)
- No other dependencies needed

## Setup (all in your home folder)

```bash
# 1. Install nvm (no sudo)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# 2. Clone/upload your project
cd ~
# upload your project to ~/myapp

# 3. Install dependencies
cd ~/myapp
npm install

# 4. Build frontend
npm run build

# 5. Set environment variables
export JWT_SECRET="your-secure-random-string-here"
export PORT=6002

# 6. Start server
node server/index.js
```

## First Run
- A default admin is auto-created: `admin@company.com` / `admin123`
- You'll be forced to change password on first login
- Data is stored in `~/myapp/data/app.db` (SQLite)

## Frontend Configuration
When deploying to VPS, create a `.env` file with:
```
VITE_API_MODE=local
VITE_API_URL=http://your-vps-ip:6002
```
Then rebuild: `npm run build`

## Running as a Service (no sudo)
```bash
# Using pm2 (install globally via npm, no sudo)
npm install -g pm2
pm2 start server/index.js --name myapp
pm2 save
pm2 startup  # follow the instructions it gives you

# Or using a simple script
nohup node server/index.js > ~/myapp.log 2>&1 &
```

## File Structure on VPS
```
~/myapp/
├── server/
│   ├── index.js    # Express server (all routes)
│   ├── db.js       # SQLite setup & schema
│   └── auth.js     # JWT authentication
├── dist/           # Built frontend (served by Express)
├── data/
│   └── app.db      # SQLite database (auto-created)
└── package.json
```

## Backup
Just copy `~/myapp/data/app.db` — it's a single file with all your data.
