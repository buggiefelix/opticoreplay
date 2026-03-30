# Opticore Play

Opticore Play is a static frontend plus a Node/Express API for game sessions, auth, wallet flows, social features, and live Ludo/Whot gameplay.

## Deployment Layout

- Frontend: Vercel
- Backend API: Render
- Persistent data: MongoDB Atlas

## Local Development

1. Install root dependencies:
   `npm install`
2. Start the local app:
   `npm start`
3. Open:
   `http://127.0.0.1:3000`

If `MONGODB_URI` is not set, the backend uses the local file store. If `MONGODB_URI` is set, it uses MongoDB Atlas and seeds the store from `database/app-data.seed.json` when no Atlas document exists yet.

## Vercel Frontend

This repo ships with [vercel.json](./vercel.json). Vercel runs:

`npm run build:frontend`

That copies `frontend/` into `dist/` and writes `dist/config.js` from `OPTICORE_API_BASE`.

Set this environment variable in Vercel:

`OPTICORE_API_BASE=https://your-render-backend.onrender.com`

## Mobile Apps

This repo can now be packaged as Android and iPhone apps with Capacitor.

1. Point the mobile shell to your deployed backend:

`OPTICORE_MOBILE_API_BASE=https://your-render-backend.onrender.com`

2. Build and sync the native projects:

`npm run mobile:sync`

3. Open Android Studio:

`npm run mobile:android`

4. Open the iPhone project on macOS with Xcode:

`npm run mobile:ios`

Notes:

- Mobile builds use the bundled `dist/` frontend, so they should target a deployed backend instead of same-origin `/api`.
- Include `capacitor://localhost,http://localhost` in `CORS_ORIGIN` on the backend so the mobile WebViews can call the API.
- Android builds can be opened from Windows in Android Studio.
- iPhone builds still require macOS and Xcode for compiling/signing even though the project files live in this repo.

## Render Backend

This repo ships with [render.yaml](./render.yaml) for the backend web service.

Render expects the repository to be pushed to GitHub, GitLab, or Bitbucket before you can create the service from the Blueprint.

Set these Render environment variables:

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `MONGODB_COLLECTION`
- `MONGODB_DOCUMENT_ID`
- `CORS_ORIGIN`

Notes:

- `NODE_ENV=production` is already declared in `render.yaml`.
- Do not set `PORT` manually on Render. Render injects it automatically.
- `CORS_ORIGIN` accepts a comma-separated list and supports `*` wildcards, so you can allow both your production Vercel domain and preview URLs.
- For mobile app builds, include `capacitor://localhost,http://localhost` in `CORS_ORIGIN`.
- The backend now refuses to boot in production without `MONGODB_URI`, which prevents accidental deploys on Render's ephemeral filesystem.

The API health endpoint is:

`/api/health`

## MongoDB Atlas

Create an Atlas cluster, create a database user, allow network access from Render, and copy the Node connection string into `MONGODB_URI`.

Recommended initial values:

- Database name: `opticoreplay`
- Collection name: `app_store`
- Document id: `primary`

## GitHub And Cloud Checklist

1. Create a new GitHub repository.
2. Add it as `origin`.
3. Push this repo.
4. Create MongoDB Atlas credentials and copy the connection string.
5. Deploy the backend to Render from the GitHub repo.
6. Deploy the frontend to Vercel from the same GitHub repo.
7. Set `OPTICORE_API_BASE` in Vercel to the Render backend URL.
8. Set `CORS_ORIGIN` in Render to the Vercel production domain, any preview domains you want to allow, plus `capacitor://localhost,http://localhost` for the mobile apps.
9. Redeploy both services after env vars are saved.

## Notes

- Local-only runtime data is intentionally ignored from Git via `.gitignore`.
- The public seed file is sanitized and contains no live users.
