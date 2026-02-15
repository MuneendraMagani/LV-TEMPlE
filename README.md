# Puja TV Display – Lakshmi Venkateswara Temple

Webpage for TV display of puja events, with admin controls to add and delete pujas.

## Layout (2–3 sections only)

1. **Header** – Temple banner image
2. **Main event banner** – Large, prominent event details
3. **Sub-events** – Optional list (e.g. 15:30–15:30 Ganesh Pooja) shown inside the main banner

## Quick Start

```bash
cd "c:\Users\magan\OneDrive\Documents\LV TEMPLE"
npm start
```

Then open:

- **TV display:** http://localhost:3000/
- **Admin:** http://localhost:3000/admin

## Admin Features

- **Login** – Open http://localhost:3000/admin and enter username (default: `admin`) and password (default: `admin123`). Only logged-in admins can add or delete pujas.
- **Add puja** – Title, start/end date & time, optional sub-events
- **Delete puja** – Remove events from the display

**Admin credentials:** Username default `admin`, password default `admin123`. For production, set `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables.

Sub-events format (one per line):

```
15:30 - 15:30 | Ganesh Pooja
18:00 - 19:00 | Shiva Abhishekam
22:00 - 05:30 | Night Vigil / Jaagran
```

## Sample Data

The sample puja **2026 Mahashivaratri** (Feb 15 15:30 – Feb 16 5:30) with sub-events is pre-loaded.

## Main Website

- https://www.lvtemple.org/

## Header Image

Your temple banner is saved as `public/header-banner.png`. To replace it, overwrite that file with a new image.

## Database (Snowflake or JSON)

- **Default:** Puja data is stored in `data/pujas.json`. Admin login uses `ADMIN_USERNAME` and `ADMIN_PASSWORD` from env (or defaults).
- **Snowflake:** To use Snowflake, set these env vars (e.g. in a `.env` file; copy from `.env.example`):
  - `SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_USERNAME`, `SNOWFLAKE_PASSWORD`
  - `SNOWFLAKE_WAREHOUSE`, `SNOWFLAKE_DATABASE`
  - Optional: `SNOWFLAKE_SCHEMA` (default `PUBLIC`)

Then run once to create tables and seed an admin user:

```bash
npm run init-db
```

Admin passwords in Snowflake are stored hashed (bcrypt). You can change DB later by replacing the `db/` layer (e.g. for PostgreSQL).
