# Leaders Hub (Google Apps Script)

Source for the password-protected form embedded on `leaders.html`. It runs in the Apps Script project
attached to the inventory Google Sheet, not on this website.

- `Code.gs` – server code: password check, materials requests, feedback/attendance, Archive & Purge menu
- `Index.html` – the form shown inside the Leaders Hub

## Updating the live form

1. Paste the changed file(s) into the Apps Script editor (Extensions → Apps Script from the sheet) and save.
2. **Deploy → Manage deployments → ✏️ → Version: New version → Deploy.**
   Don't use "New deployment": that creates a new URL and the website would still point at the old one.
3. Keep **Who has access** set to **Anyone**, or the form shows up blank on some devices.

The password is stored in **Project Settings → Script Properties → `FORM_PASSWORD`**, never in this code.
