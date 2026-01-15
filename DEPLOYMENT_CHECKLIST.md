# 🚀 Quick Deployment Checklist

## Files Created/Updated

✅ **server.js** - Custom Node.js server
- Listens on `0.0.0.0:3000` (all network interfaces)
- Properly handles Next.js requests
- Camera access enabled

✅ **nginx.conf** - Reverse proxy configuration
- Domain: `portal.northem.no`
- Proxies to `http://localhost:3000`
- WebSocket support enabled
- Proper headers forwarding

✅ **package.json** - Updated scripts
- `npm start` now uses `node server.js`
- Build works with `npm run build`

---

## 📋 Deployment Steps

### Step 1: Build Application
```bash
npm run build
```

### Step 2: Transfer Files to Server
```bash
# Copy nginx config to server
scp nginx.conf user@portal.northem.no:/tmp/

# Copy application
scp -r . user@portal.northem.no:/var/www/teateret/
```

### Step 3: Setup Nginx on Server
```bash
sudo cp /tmp/nginx.conf /etc/nginx/sites-available/portal.northem.no
sudo ln -s /etc/nginx/sites-available/portal.northem.no /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Setup SSL (HTTPS)
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d portal.northem.no
```

### Step 5: Start Application
```bash
cd /var/www/teateret
npm install --production
npm start
```

---

## 🔐 Environment Variables

Set these on your production server:

```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Optional: Remote image host whitelist
# If you use external image hosts (Framer, Cloudinary, Supabase storage, etc.)
# set NEXT_IMAGE_DOMAINS to a comma-separated list of hostnames so Next.js Image can load/optimize them.
# Example: NEXT_IMAGE_DOMAINS=framerusercontent.com,ucarecdn.com,res.cloudinary.com
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email (Brevo SMTP)
SMTP_SERVER=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_LOGIN=your_login
SMTP_PASSWORD=your_password
BREVO_FROM_EMAIL=noreply@teateret.no

# QR Security
QR_SIGNING_SECRET=your_secure_secret
```

---

## 🌐 Network Flow

```
User: https://portal.northem.no
         ↓
Nginx (port 80/443)
         ↓
Reverse Proxy
         ↓
Node.js Server (localhost:3000)
         ↓
Next.js App
         ↓
Response back to user
```

---

## ✨ Camera Access

With this setup:
- ✅ Camera works on `https://portal.northem.no` (secure context)
- ✅ QR scanner fully functional
- ✅ Manual ticket entry as fallback
- ✅ All admin features working

---

## 🧪 Testing

```bash
# Test locally
npm run build
npm start
curl http://localhost:3000

# Test after nginx setup
curl http://portal.northem.no -H "Host: portal.northem.no"

# Check processes
ps aux | grep node
ps aux | grep nginx

# Monitor logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🎯 Next Steps

1. ✅ Server configured
2. ✅ Nginx config created
3. ⏳ Deploy to production server
4. ⏳ Setup SSL/HTTPS
5. ⏳ Monitor application

---

**Status**: Ready for deployment
**Last Updated**: 2024-12-05
**QR Scanner**: ✅ Operational
