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
2. **"Path to the Crown" Permutations Engine**:
   - Calculates the target driver's maximum achievable points.
   - Shows the exact maximum points the current leader is allowed to score.
   - Translates points limits into finish positions (e.g. *"Leader must average P4 or worse"*).
   - Generates a **Rival Contenders Threshold Matrix** detailing point buffers and finish restrictions for every driver.
3. **Interactive Race-by-Race Simulator**:
   - Complete remaining race calendar including Sprint weekends.
   - Set custom finishes (P1 to P10, DNF, Fastest Lap) for selected driver and leader.
   - 1-Click Presets: *Clean Sweep*, *Leader DNF*, *Leader P2 Squeeze*, *Reset*.
   - Live Projected Standings identifying the exact race round where the title is clinched.
4. **Authentic Formula 1 Design**:
   - Official F1 red accents (`#E10600`), carbon weave textures, aerodynamic curves.
   - Official team livery styling for all teams (McLaren, Ferrari, Red Bull, Mercedes, Aston Martin, Alpine, Williams, Haas, Audi, RB, Cadillac).
   - Fast responsive layout across mobile, tablet, and desktop screens.
5. **Zero Build Steps / Zero Node.js Required**:
   - Built with pure modern Vanilla HTML5, CSS3, and ES modules.
   - Works immediately right out of the box in any browser or static web host.

---

## 📡 Recommended F1 Public APIs

### 1. **Jolpica F1 API (Recommended & Default)**
- **Base URL:** `https://api.jolpi.ca/ergast/f1/`
- **Cost:** **100% Free** (Open Source community successor to Ergast)
- **API Key Required:** **NO** (Zero configuration, works immediately)
- **Rate Limits:** 4 requests/second, 500 requests/hour (more than enough for personal & community projects)
- **CORS:** Enabled out of the box.
- **Data Provided:** Real-time driver standings, constructor standings, race calendars, sprint sessions, lap records, and historic seasons back to 1950.

### 2. **API-Sports (Formula 1 via RapidAPI)**
- **Website:** [api-sports.io](https://api-sports.io)
- **Cost:** Free tier available
- **API Key Required:** Yes (Stored in Netlify environment variables or browser `localStorage`)
- **Rate Limits:** 100 requests / day on free tier
- **Use Case:** If you prefer a dashboard with usage analytics or telemetry widgets.

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
