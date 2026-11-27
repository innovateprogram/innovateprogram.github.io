# Innovate building screens — setup

## Pages

- Public display: `/screens/`
- Signed-in controls: `/screens/control346927/`

The screen listens to Firebase Realtime Database and refreshes when the playlist or visitor notice changes. Uploaded media is stored in Cloudinary; the Firebase database stores the media URLs and slide settings.

## One-time Firebase setup

1. In Firebase Console, select project `innovateprogram-fd00c`.
2. **Authentication → Sign-in method**: enable **Email/Password**. Under **Settings → Authorized domains**, ensure `innovateprogram.github.io` is listed.
3. **Authentication → Users**: create the administrator account (email + password). Do not enable public sign-up.
4. Open that user's details and copy the **UID**.
5. Open **Realtime Database → Rules**. Paste the contents of [`firebase-database.rules.json`](firebase-database.rules.json), replacing `REPLACE_WITH_ADMIN_UID` with the administrator's actual UID, then publish the rules.
6. Ensure the Realtime Database is available at the database URL in `firebase.js`.

The database rules intentionally allow public reads only under `/screen` so the display can load without logging in. Only the configured Firebase Auth UID can change screen content. Do not replace the UID condition with a public write rule. If the Firebase account or project is not configured yet, the pages will render but they cannot sync until these steps are complete.

### Fixing `auth/api-key-not-valid`

The web API key in `firebase.js` was copied from the project details provided for this setup. This error means Google is rejecting that key, so a code change cannot generate or repair it. In Firebase Console, open **Project settings → General → Your apps**, copy the web app's current `apiKey` from its Firebase config, and replace only the `apiKey` value in `firebase.js`. Confirm the app and key belong to project `innovateprogram-fd00c` and that the key has not been deleted or disabled.

If the key is restricted in Google Cloud Console, check that its website referrers allow `https://innovateprogram.github.io/*` and that its API restrictions do not block Firebase Authentication / the Identity Toolkit API. Keep the key restricted appropriately for this website. A Firebase web API key is a public project identifier, not a password; Firebase Authentication and database rules provide access control.

### Firebase Realtime Database rules

Replace the placeholder before publishing:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "screen": {
      ".read": true,
      ".write": "auth != null && auth.uid === 'REPLACE_WITH_ADMIN_UID'"
    }
  }
}
```

This keeps all other database paths private. Screen text is also constrained in the admin UI (heading 75 characters, description 260, visitor notice 120). The rules make authenticated admin writes safe; if other trusted clients are later added, add explicit validation rules for their data rather than broadening write access.

## One-time Cloudinary setup

The app uses unsigned uploads to cloud `dgrmpcha9` with preset `Innovate`. In Cloudinary Console, confirm that the preset is **Unsigned** and permits the desired image and video formats. For safety, configure the preset's allowed formats, file-size limits, and upload restrictions to match your needs. The public upload preset is necessarily visible to browsers; it must not grant access to delete or manage existing assets.

## Media and playback

- Image slides, photo stories and custom backgrounds accept JPG, PNG or WebP.
- Videos accept MP4, WebM or MOV. They autoplay muted and advance when playback ends.
- YouTube links are embedded with autoplay and mute enabled; the slide duration setting controls how long the display stays on the YouTube slide.
- A notice is shown as a prominent bottom banner over the current slide. The message is capped at 120 characters.
- The control page offers a light/dark theme toggle, playlist ordering, editing and removal.

If Firebase rules deny writes, confirm the signed-in user's UID exactly matches the UID in the rules. If Cloudinary uploads fail, verify the preset name, unsigned mode, allowed formats and size limits.
