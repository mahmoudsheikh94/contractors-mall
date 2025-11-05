# ⚡ Quick Commands - Copy & Paste These

## 🚀 To Start Working (Every Time):

### 1. Open Terminal
Press **Cmd + Space**, type "terminal", press **Enter**

### 2. Go to Project
```bash
cd "/Users/mahmoud/Desktop/Apps/Contractors Mall"
```

### 3. Start Development
```bash
pnpm dev
```

### 4. Open in Browser
- Contractor app: **http://localhost:3000**
- Admin app: **http://localhost:3001**

---

## 🛑 To Stop Working:

In Terminal, press: **Ctrl + C**

---

## 📦 First Time Only (Install Dependencies):

```bash
cd "/Users/mahmoud/Desktop/Apps/Contractors Mall"
pnpm install
```

Wait 1-3 minutes until finished.

---

## 🔧 If pnpm Not Installed:

```bash
npm install -g pnpm@9
```

---

## ✅ Check Everything Works:

```bash
# Check you're in the right place
pwd

# Should show:
# /Users/mahmoud/Desktop/Apps/Contractors Mall
```

---

## 🆘 Fix Common Problems:

### Port Already in Use:
```bash
lsof -ti:3000 | xargs kill -9
pnpm dev
```

### Clean Reinstall:
```bash
rm -rf node_modules
pnpm install
```

### Check Supabase Connection:
Open: **http://localhost:3000**
Look in browser console (F12) for errors

---

**That's it! Just these commands and you're coding! 🚀**