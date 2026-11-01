# Winter Arc 2026: offline app

The "codex" you asked about is called **source code**. This folder is a complete offline app (a "PWA", Progressive Web App). It is plain HTML, CSS and JavaScript with no libraries, about 60 KB in total, so it runs fast even on 2 GB of RAM.

Files: `index.html`, `style.css`, `app.js`, `data.js` (all the plan content), `sw.js` (makes it work offline), `manifest.json`, `icons/`.

Your data (ticks, check-ins) is saved on the phone only. Use Progress > "Show backup text" now and then and paste it into a notes app.

---

## Option A: Install it as an app (easiest, no APK needed)

A PWA needs to be served from a web address once (HTTPS). After the first load it works with no internet.

1. Put these files online for free:
   - GitHub Pages: create a repo, upload this folder's contents, then Settings > Pages > Deploy from branch (main, root). Or use Netlify Drop (drag the folder onto app.netlify.com/drop) or Cloudflare Pages.
2. On the Redmi A3, open that link in Chrome.
3. Chrome menu (three dots) > **Add to Home screen** (or **Install app**).
4. Open it once while online, then try airplane mode: it should still open.

Works on any Android with Chrome, and on iPhone with Safari (Share > Add to Home Screen).

---

## Option B: Make a real APK with PWABuilder (no coding, needs the site from Option A)

1. Go to pwabuilder.com and paste your site's link.
2. Choose **Package for stores > Android**, download the package.
3. Inside the zip, use the generated `.apk` (the `.aab` is only for Play Store).
4. Copy the APK to your phone, open it, and allow "Install unknown apps" for your file manager or browser when asked.

---

## Option C: Build an APK yourself on your laptop with Capacitor (fully offline, no hosting)

Needs: Node.js (LTS), Android Studio (includes the Android SDK and Java). Your laptop (i7, 16 GB RAM) is fine.

```bash
mkdir winter-arc && cd winter-arc
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Winter Arc" com.example.winterarc --web-dir=www
mkdir www
# copy ALL files from this folder into www/ (index.html, app.js, data.js, style.css, manifest.json, sw.js, icons/)
npx cap add android
npx cap sync android
npx cap open android
```

In Android Studio: wait for Gradle to finish, then **Build > Build Bundle(s) / APK(s) > Build APK(s)**. It shows "locate" when done; the file is `android/app/build/outputs/apk/debug/app-debug.apk`. Copy it to the phone and install.

Notes:
- The debug APK is fine for personal use. Only a signed release build is needed for the Play Store.
- Change `com.example.winterarc` to your own id (like `com.yourname.winterarc`) if you prefer.
- In Capacitor the app is served from inside the APK, so it works offline immediately.

---

## Updating the plan

All text lives in `data.js`. If you edit it, also bump the version in `sw.js` (`winter-arc-v1` to `winter-arc-v2`) so phones fetch the new files.

## Test on your laptop first

```bash
cd <this folder>
python -m http.server 8000
```

Then open http://localhost:8000 in Chrome.

## Notes

- General information adapted from a video, not medical advice. See the Safety tab.
- Tested here in a simulated browser (screens load, ticks, streak, check-ins). It has not been installed on a real Redmi A3, so test Option A or C on your phone before relying on it.
