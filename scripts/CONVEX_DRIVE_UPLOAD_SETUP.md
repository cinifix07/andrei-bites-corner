# Convex to Google Drive Upload Setup

This setup keeps image files in Google Drive and stores only image URLs in Convex.

```txt
Browser upload
-> Convex action
-> Google Apps Script Web App
-> Google Drive folder
-> Convex saves returned URL
```

Target Drive folder:

```txt
https://drive.google.com/drive/folders/1mti6gOf0rneQkhYilgGgoAQJAMlITDQG
```

Proof-of-payment Drive folder:

```txt
https://drive.google.com/drive/folders/1h0rp0TTLaZyXO71F4_h3WGdDxGrbwpl4
```

## 1. Install Apps Script

Paste the contents of:

```txt
scripts/google-apps-script-upload.js
```

into the Google Apps Script project.

In that script, change this value to a long private string:

```js
const UPLOAD_SECRET = "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET";
```

Example:

```js
const UPLOAD_SECRET = "abc-2026-long-private-upload-secret";
```

## 2. Deploy Apps Script

Deploy as a Web App:

```txt
Execute as: Me
Who has access: Anyone
```

Copy the Web App URL. It must look like this:

```txt
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

The Apps Script editor URL is not the upload URL.

## 3. Set Convex Env

Use the same secret you placed in Apps Script:

```bash
npx convex env set GOOGLE_APPS_SCRIPT_UPLOAD_URL "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
npx convex env set GOOGLE_APPS_SCRIPT_UPLOAD_SECRET "abc-2026-long-private-upload-secret"
npx convex env set GOOGLE_DRIVE_FOLDER_ID "1mti6gOf0rneQkhYilgGgoAQJAMlITDQG"
npx convex env set GOOGLE_DRIVE_PROOF_FOLDER_ID "1h0rp0TTLaZyXO71F4_h3WGdDxGrbwpl4"
```

## 4. Push Convex Functions

```bash
npx convex dev --once
```

## 5. Test New Uploads

Add or edit a product with a photo. The product row should save:

```js
imageUrl: "https://drive.google.com/thumbnail?id=FILE_ID&sz=w1000"
```

Customer proof uploads should save:

```js
proofOfPaymentUrl: "https://drive.google.com/thumbnail?id=FILE_ID&sz=w1000"
```

The actual proof image file should appear in:

```txt
https://drive.google.com/drive/folders/1h0rp0TTLaZyXO71F4_h3WGdDxGrbwpl4
```

## 6. Migrate Existing Convex Storage Images

Run in batches:

```bash
npx convex run migrateImages:migrateStorageImagesToDrive '{"limit":20}'
```

Run it again until it returns:

```txt
products.migrated: 0
orders.migrated: 0
```

Old Convex Storage IDs are kept as fallback fields, but the app will prefer the new Google Drive URLs.

## Optional Service Account Fallback

If `GOOGLE_APPS_SCRIPT_UPLOAD_URL` is not set, proof-of-payment uploads can still use the existing Google service-account flow:

```bash
npx convex env set GOOGLE_SERVICE_ACCOUNT_EMAIL "your-service-account@project.iam.gserviceaccount.com"
npx convex env set GOOGLE_PRIVATE_KEY "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
npx convex env set GOOGLE_DRIVE_PROOF_FOLDER_ID "1h0rp0TTLaZyXO71F4_h3WGdDxGrbwpl4"
```
