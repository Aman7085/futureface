# Future Face — AI Skin Analysis

## Quick Start

### 1. Install
```bash
npm install
```

### 2. Add your API key
```bash
cp .env.local.example .env.local
```
Open `.env.local` and paste your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-your_key_here
```
Get your key at: https://console.anthropic.com/settings/keys

### 3. Run
```bash
npm run dev
```
Open http://localhost:3000

---

## Deploy to Vercel
1. Push to GitHub
2. Import at https://vercel.com
3. Add `ANTHROPIC_API_KEY` in Project → Settings → Environment Variables
4. Deploy ✅

---

## File Structure
```
pages/
  index.jsx            ← Full app UI (Upload → Age → Analyzing → Results)
  _app.jsx             ← Global CSS import
  api/
    analyze-skin.js    ← Server-side Claude API proxy (key is safe)
styles/
  globals.css          ← Brand fonts + animations
.env.local.example     ← Copy to .env.local
```
