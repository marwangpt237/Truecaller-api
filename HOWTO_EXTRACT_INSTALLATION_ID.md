# 📱 How to Extract Your Truecaller InstallationId

You can get your `installationId` from the Truecaller app on your phone. Here are several methods:

---

## Method 1: Download Your Data (Easiest ✅)

1. Open the **Truecaller app** on your phone
2. Go to **Settings** → **Privacy Center** → **Download My Data**
3. Truecaller will send you a JSON file (via email or app notification)
4. Open the downloaded JSON file
5. Look for the `"id"` field — it looks like:
   ```json
   {
     "id": "a1k07--Vgdfyvv_rftf5uuudhuhnkljyvvtfftjuhbuijbhug",
     ...
   }
   ```
6. That's your **installationId**!

---

## Method 2: From a Rooted Android Phone

If your phone is rooted:

```bash
# Via adb
adb root
adb shell cat /data/data/com.truecaller/shared_prefs/com.truecaller_preferences.xml | grep installationId
```

---

## Method 3: Using the Truecallerjs Bot on Telegram

1. Open Telegram and search for [@truecallerjs_bot](https://t.me/truecallerjs_bot)
2. Send `/installation_id` to the bot
3. Paste your installationId (if you have it from Method 1)
4. The bot will let you search numbers directly

---

## Method 4: From Truecaller Web

1. Go to [https://www.truecaller.com/](https://www.truecaller.com/)
2. Log in with your phone number
3. Open your browser's Developer Tools (F12)
4. Go to the **Application** tab → **Local Storage**
5. Look for an `installationId` or `userId` key
6. Copy the value

---

## Once You Have It

Run this on your terminal:
```bash
truecaller-api setup
```

Then paste your `installationId` and country code (e.g., `DZ` for Algeria).

That's it! You can now search without needing Truecaller's clientSecret.
