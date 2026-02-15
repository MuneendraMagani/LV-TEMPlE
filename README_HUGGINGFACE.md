# 🚀 Deploy LV Temple to Hugging Face Spaces

## Quick Deployment Steps

### 1️⃣ Create Hugging Face Space

1. Go to https://huggingface.co/spaces
2. Click **"Create new Space"**
3. Settings:
   - Name: `lv-temple-display`
   - SDK: **Docker** ⚠️ (Important!)
   - Visibility: Public or Private
4. Click **"Create Space"**

### 2️⃣ Set Environment Secrets

In your Space settings, add these secrets:

```
ADMIN_USERNAME = admin
ADMIN_PASSWORD = YourSecurePassword123
```

**Optional** (only if using Snowflake):
```
SNOWFLAKE_ACCOUNT = your_account
SNOWFLAKE_USERNAME = your_username
SNOWFLAKE_PASSWORD = your_password
SNOWFLAKE_WAREHOUSE = COMPUTE_WH
SNOWFLAKE_ROLE = ACCOUNTADMIN
SNOWFLAKE_DATABASE = LVTEMPLE
SNOWFLAKE_SCHEMA = LV
```

⚠️ **If you skip Snowflake secrets**, the app will use JSON files (simpler!)

### 3️⃣ Push Your Code

```bash
# Add Hugging Face remote
git remote add hf https://huggingface.co/spaces/YOUR_USERNAME/lv-temple-display

# Push your code
git push hf main
```

If you get authentication error:
```bash
# Use Hugging Face token
git remote set-url hf https://YOUR_USERNAME:YOUR_HF_TOKEN@huggingface.co/spaces/YOUR_USERNAME/lv-temple-display
git push hf main
```

Get your token from: https://huggingface.co/settings/tokens

### 4️⃣ Wait for Build

- Build takes 3-5 minutes
- Watch "Logs" tab for progress
- App will start automatically when ready

### 5️⃣ Access Your App

Your app will be live at:
```
https://YOUR_USERNAME-lv-temple-display.hf.space
```

- **TV Display**: https://YOUR_USERNAME-lv-temple-display.hf.space/
- **Admin Panel**: https://YOUR_USERNAME-lv-temple-display.hf.space/admin

## 📁 Files Required for Deployment

✅ **Dockerfile** - Docker configuration (created)
✅ **.dockerignore** - Exclude unnecessary files (created)
✅ **package.json** - Dependencies
✅ **server.js** - Application server
✅ **public/** - All frontend files
✅ **db/** - Database module

## 🎯 Storage Options

### Option 1: JSON Files (Easiest)
- Don't set Snowflake secrets
- App uses `data/pujas.json` and `data/admins.json`
- ⚠️ Data may reset on Space restarts

### Option 2: Snowflake Database
- Set all Snowflake secrets
- Persistent storage
- Better for production

## 🔒 Default Admin Access

After deployment, login with:
- **Username**: Value from `ADMIN_USERNAME` secret (default: admin)
- **Password**: Value from `ADMIN_PASSWORD` secret (default: admin123)

⚠️ **Change the password immediately** after first login!

## 🔄 Updating Your App

```bash
# Make changes locally
git add .
git commit -m "Update message"

# Push to Hugging Face
git push hf main
```

The Space will rebuild automatically (takes 3-5 minutes).

## ⚡ Quick Test Locally with Docker

Before deploying, test locally:

```bash
# Build image
docker build -t lv-temple .

# Run container
docker run -p 7860:7860 -e ADMIN_USERNAME=admin -e ADMIN_PASSWORD=admin123 lv-temple

# Open browser
http://localhost:7860
```

## 🆘 Troubleshooting

### Build Fails
- Check Logs tab in your Space
- Verify all files are pushed (especially `Dockerfile`)
- Ensure `package.json` has all dependencies

### App Shows Error
- Check if PORT=7860 is set
- Verify secrets are configured
- Check application logs in Space

### Can't Login
- Verify `ADMIN_USERNAME` and `ADMIN_PASSWORD` secrets
- Default is `admin` / `admin123` if not set

### Data Not Saving
- Using JSON storage? Data resets on restart
- Switch to Snowflake for persistence
- Or implement Hugging Face Datasets integration

## 💡 Pro Tips

1. **Use Private Space** initially to test
2. **Set strong admin password** in secrets
3. **Monitor logs** during first deployment
4. **Test all features** before sharing URL
5. **Use Snowflake** for production data persistence

## 🌟 Features That Work on Hugging Face

✅ TV Display with auto-refresh
✅ Admin panel with authentication
✅ Add/Edit/Delete pujas
✅ User management (for super admins)
✅ Change password feature
✅ Responsive design (mobile, tablet, TV)
✅ Om symbol animated background
✅ Automatic event filtering

## 📞 Support

- Hugging Face Docs: https://huggingface.co/docs/hub/spaces-overview
- Docker Spaces: https://huggingface.co/docs/hub/spaces-sdks-docker

---

**That's it!** Your temple display system will be live on Hugging Face in under 10 minutes! 🙏
