# 🏎️ F1 Championship Contenders & Clinch Calculator

A modern, high-octane Formula 1 World Drivers' Championship (WDC) calculator and permutation simulator. Select any driver on the grid and calculate:
- **Can they still win the World Championship?**
- **What must happen with the championship leader and rival contenders?**
- **How many points can rivals score at most before the driver is eliminated?**
- **Interactive Race-by-Race "What-If" Permutations Simulator** (test custom finishes, clean sweeps, leader DNFs, and fastest laps).
- **Monte Carlo Odds Simulation** (2,500 seasons simulated based on form, points, and sprint formats).

---

## 🌟 Key Features

1. **Live Standings & Championship Status**:
   - 🏆 **CLINCHED**: Driver has mathematically secured the title.
   - ⚡ **IN CONTENTION**: Driver can still mathematically win the WDC.
   - ❌ **ELIMINATED**: Maximum achievable points is strictly lower than the current leader's points.
2. **Comprehensive Multi-Contender Permutations Engine**:
   - Rather than only checking the leader, evaluates **every active contender** simultaneously.
   - Calculates the **Points Buffer** and **Maximum Permissible Total Points** for all rivals to prevent any rival from overtaking the target driver.
   - Translates points limits into exact finish position constraints (e.g. *"Can finish at most P3 average"*, *"Must finish P5 or lower"*, *"Must score 0 points"*).
   - Identifies the **Primary Title Threat** (the contender with the smallest points margin).
   - Models **Pack Cannibalism & Points Sharing**: Demonstrates how rivals trading P2, P3, and P4 finishes prevents any single driver from hoarding points and allows the target driver to clinch!
3. **Interactive Multi-Car Race-by-Race Simulator**:
   - Assign custom finishes (P1 through P10, DNF, Fastest Lap) for **all top contenders** across every remaining Grand Prix and Sprint.
   - 1-Click Multi-Car Presets:
     - 🚀 *Clean Sweep (Rivals Share Podiums)*: Selected driver wins, rivals alternate P2/P3/P4 so points are divided.
     - 🥈 *Threat Monopolizes P2*: Tests the worst-case scenario where the #1 threat rival takes P2 in every race.
     - 💥 *Top Contenders DNF / Chaos*: High-attrition race where top rivals crash out.
     - ↺ *Reset Natural Order*.
   - Live **Projected Leaderboard** showing the final top 5 standings, deltas, and clinching round.
4. **Authentic Formula 1 Design**:
   - Official F1 red accents (`#E10600`), carbon weave textures, aerodynamic curves.
   - Official team livery styling for all teams (McLaren, Ferrari, Red Bull, Mercedes, Aston Martin, Alpine, Williams, Haas, Audi, RB, Cadillac).
   - Fast responsive layout across mobile, tablet, and desktop screens.
5. **Zero Build Steps / Zero Node.js Required**:
   - Built with pure modern Vanilla HTML5, CSS3, and ES modules.
   - Works immediately right out of the box in any browser or static web host.

---

## 🛡️ API Rate-Limit Shield & Weekly Monday Caching

### 1. Per-User Public IP Isolation (Client-Side Architecture)
Unlike architectures that proxy requests through a single backend server (where 10,000 visitors share 1 bottleneck IP address and quickly exceed API quotas), this app makes all API requests **directly from the visitor's browser (`fetch`)**:
- Every visitor connects using their **own unique public IP address** (home Wi-Fi, cellular 5G, office network).
- Jolpica/Ergast API rate limits (500 requests/hour per IP) are isolated per visitor, preventing one user from consuming another user's quota.

### 2. Weekly Monday Local Storage (`localStorage`)
F1 Grand Prix races take place on Sundays, with final classifications and steward decisions settled Sunday night.
- Standings and race calendars are stored in browser **`localStorage`**.
- The cache automatically refreshes on **Mondays at 06:00 UTC**.
- Return visits between Tuesday and Sunday load in **0ms with ZERO API requests**.
- Completed historical seasons (2025, 2024, 2021) are cached **permanently**.
- A manual **"🔄 Refresh"** button in the header ticker and settings modal allows on-demand cache busting anytime.

### 3. Graceful 429 Degradation & Burst Throttling
- Built-in minimum request delay (400ms) prevents accidental request bursts when switching seasons.
- If an external API returns HTTP 429 (Too Many Requests), the app automatically falls back to the local cached dataset and displays an informative warning chip without crashing.

---

## 🔒 Security Measures & Best Practices Implemented

The application implements defense-in-depth security best practices across headers, DOM rendering, input sanitization, and storage integrity:

1. **Content Security Policy (CSP)**:
   - Configured in `netlify.toml` and `<head>` of `index.html`.
   - Restricts scripts to `'self'`, fonts to trusted CDNs (`fonts.gstatic.com`), and network connections strictly to approved API endpoints (`api.jolpi.ca`, `api-sports.io`). Disallows inline object embeds (`object-src 'none'`) and frame hijacking (`frame-ancestors 'none'`).
2. **HTTP Hardening Headers**:
   - **HSTS (`Strict-Transport-Security`):** Enforces HTTPS encryption for 1 year with `includeSubDomains; preload`.
   - **Clickjacking Protection (`X-Frame-Options: DENY`):** Prevents the site from being framed inside malicious iframes.
   - **MIME Sniffing Defense (`X-Content-Type-Options: nosniff`):** Stops browsers from executing non-script files as code.
   - **Referrer Privacy (`Referrer-Policy: strict-origin-when-cross-origin`):** Strips sensitive path data from outbound referrers.
   - **Permissions Policy:** Restricts hardware capabilities (`camera=()`, `microphone=()`, `geolocation=()`, `payment=()`, `usb=()`).
   - **Cross-Origin Opener / Resource Policy (COOP & CORP):** Enforces `same-origin` isolation.
3. **DOM-Based XSS Sanitization**:
   - All dynamic strings returned by external APIs (driver names, codes, constructors, circuits) are sanitized using an `escapeHTML()` encoder before rendering into template literals or `innerHTML`.
4. **Input Validation & API Key Defense**:
   - API key inputs are strictly sanitized (`sanitizeApiKey`), removing non-alphanumeric characters, whitespace, and script injection payloads. Keys are stored with masked password fields.
5. **Cache Schema Validation**:
   - Stored `localStorage` JSON payloads are type-checked and validated before being accepted by the app, preventing prototype pollution or deserialization errors from tampered storage.
6. **Reverse Tabnabbing Protection**:
   - All external outbound links (`target="_blank"`) enforce `rel="noopener noreferrer"`.

---

## 🚀 Hosting on Netlify (Step-by-Step)

Netlify is the ideal free host for this website because it requires **no Node.js build process** (`publish = "."` in `netlify.toml`).

### Step 1: Push Code to GitHub
1. Create a new repository on your GitHub account (e.g. `f1-championship-calculator`).
2. Run in your terminal:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: F1 Championship Contenders Calculator"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   git push -u origin main
   ```

### Step 2: Connect to Netlify
1. Go to [Netlify.com](https://www.netlify.com/) and sign in with GitHub.
2. Click **Add new site** > **Import an existing project**.
3. Select your GitHub repository.
4. In the build settings:
   - **Build command:** *(Leave empty)*
   - **Publish directory:** `.` *(Defaults from netlify.toml)*
5. Click **Deploy Site**.

### Step 3: API Key & Environment Variables (Optional)
If you choose to use an API requiring a key (such as API-Sports):
1. In your Netlify Site dashboard, go to **Site configuration** > **Environment variables**.
2. Add:
   - Key: `F1_API_KEY`
   - Value: `YOUR_RAPIDAPI_KEY`
*(Note: If using the default Jolpica F1 API, no environment variables are needed).*

---

## 🌐 Alternative Free Web Hosts Compared

| Provider | Free Tier Bandwidth | Node Build Required? | Deployment Speed | Best For |
|---|---|---|---|---|
| **Netlify** (Recommended) | 100 GB / month | **No** (Static `./`) | ~10 seconds | Custom headers, drag-and-drop, env vars |
| **Cloudflare Pages** | **Unlimited** Bandwidth | **No** (Static `./`) | ~15 seconds | Ultra-high traffic & zero bandwidth limits |
| **Vercel** | 100 GB / month | **No** (Static `./`) | ~10 seconds | Next.js / Serverless integration |
| **GitHub Pages** | 100 GB / month | **No** | ~30 seconds | Direct in-repo deployment |

---

## 💻 Local Testing Without Node.js

Since you do not have Node.js installed, you can run and view the website locally using Python's built-in web server:

```bash
# In the project directory:
python3 -m http.server 3000
```
Then open your browser to:
```
http://localhost:3000
```
Or simply double-click `index.html` to open it directly in your browser.

---

## 🏎️ Points System Logic

- **Grand Prix Win:** 25 pts (P1=25, P2=18, P3=15, P4=12, P5=10, P6=8, P7=6, P8=4, P9=2, P10=1)
- **Sprint Win:** 8 pts (P1=8, P2=7, P3=6, P4=5, P5=4, P6=3, P7=2, P8=1)
- **Fastest Lap:** +1 pt (if finishing in top 10)
- **Max Standard GP Weekend:** 26 pts
- **Max Sprint GP Weekend:** 34 pts

**Elimination Condition:**
$$\text{Max Reachable Points}(D) = \text{CurrentPoints}(D) + \sum_{\text{remaining}} \text{MaxWeekendPoints}$$
If $\text{Max Reachable Points}(D) < \text{CurrentPoints}(\text{Leader})$, Driver $D$ is **Mathematically Eliminated**.
