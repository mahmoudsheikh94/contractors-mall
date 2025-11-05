# 💻 Terminal Guide for Beginners - Contractors Mall

## What is Terminal?
Terminal is an application on your Mac that lets you run commands by typing them. Think of it as a text-based way to control your computer.

---

## Step 1: Open Terminal

### Method 1 (Easiest):
1. Press **Cmd + Space** (opens Spotlight Search)
2. Type **"terminal"**
3. Press **Enter**

### Method 2:
1. Open **Finder**
2. Go to **Applications** → **Utilities**
3. Double-click **Terminal**

You should see a window that looks like this:
```
username@MacBook-Pro ~ %
```

---

## Step 2: Navigate to Your Project

You need to tell Terminal where your project is located.

### Copy and paste this command:
```bash
cd "/Users/mahmoud/Desktop/Apps/Contractors Mall"
```

**How to paste in Terminal:**
- Right-click and select "Paste"
- OR press **Cmd + V**

**Then press Enter**

### What you'll see:
```
username@MacBook-Pro Contractors Mall %
```

Notice it now says "Contractors Mall" - you're in the right place! ✅

---

## Step 3: Check if pnpm is Installed

Type this command and press Enter:
```bash
pnpm --version
```

### If you see a version number (like `9.0.0`):
✅ **Great!** pnpm is installed. Skip to Step 4.

### If you see "command not found":
❌ You need to install pnpm first.

**Install pnpm by running:**
```bash
npm install -g pnpm@9
```

Wait 10-20 seconds, then check again:
```bash
pnpm --version
```

Should now show a version number! ✅

---

## Step 4: Install Project Dependencies

This downloads all the code libraries your project needs.

**Run this command:**
```bash
pnpm install
```

**What you'll see:**
```
Lockfile is up to date, resolution step is skipped
Packages: +500
++++++++++++++++++++++++++++++++++++++
Progress: resolved 500, reused 500, downloaded 0, added 500
Done in 30s
```

**This will take 1-3 minutes.** You'll see lots of text scrolling by - that's normal!

**Wait until you see the cursor again:**
```
username@MacBook-Pro Contractors Mall %
```

✅ **Installation complete!**

---

## Step 5: Start the Development Servers

Now let's start your apps!

**Run this command:**
```bash
pnpm dev
```

**What you'll see:**
```
> contractors-mall@1.0.0 dev
> turbo dev

• Packages in scope: @contractors-mall/admin, @contractors-mall/web
• Running dev in 2 packages
• Remote caching disabled

@contractors-mall/web:dev: ready - started server on 0.0.0.0:3000
@contractors-mall/admin:dev: ready - started server on 0.0.0.0:3001

 READY  Application is ready!
```

✅ **Your apps are running!**

**IMPORTANT:** Leave this Terminal window open! Don't close it while you're developing.

---

## Step 6: Open Your Apps in Browser

Open your web browser (Chrome, Safari, Firefox) and go to:

### Contractor App:
```
http://localhost:3000
```

### Admin Portal:
```
http://localhost:3001
```

**What you should see:**
- Page loads with Arabic text: "مول المقاول"
- Buttons appear
- RTL (right-to-left) layout

✅ **Success! Everything is working!**

---

## Step 7: When You're Done Working

To stop the development servers:

1. Go back to the Terminal window
2. Press **Ctrl + C** (hold Control key, press C)

**You'll see:**
```
^C
username@MacBook-Pro Contractors Mall %
```

The cursor is back - servers are stopped. ✅

---

## 🔄 Daily Workflow

Every time you want to work on the project:

1. **Open Terminal**
2. **Navigate to project:**
   ```bash
   cd "/Users/mahmoud/Desktop/Apps/Contractors Mall"
   ```
3. **Start development:**
   ```bash
   pnpm dev
   ```
4. **Open browser:**
   - http://localhost:3000 (contractor app)
   - http://localhost:3001 (admin app)
5. **When done, press Ctrl + C** in Terminal

---

## 🐛 Common Issues & Solutions

### Issue: "pnpm: command not found"
**Solution:**
```bash
npm install -g pnpm@9
```

### Issue: "npm: command not found"
**Solution:** You need to install Node.js first
1. Go to: https://nodejs.org
2. Download the **LTS version** (left button)
3. Install it
4. Restart Terminal
5. Try again

### Issue: "Port 3000 already in use"
**Solution:** Something else is using that port
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Then try again
pnpm dev
```

### Issue: "Error: Cannot find module..."
**Solution:** Dependencies not installed properly
```bash
# Clean install
rm -rf node_modules
pnpm install
```

### Issue: Terminal shows weird characters or colors
**Solution:** That's normal! Modern terminals show colors and progress bars.

---

## 💡 Useful Terminal Tips

### Copy Text from Terminal:
- Select text with mouse
- Press **Cmd + C**

### Paste into Terminal:
- **Cmd + V** OR right-click → Paste

### Clear Terminal Screen:
```bash
clear
```
OR press **Cmd + K**

### Stop a Running Command:
- Press **Ctrl + C**

### See Previous Commands:
- Press **Up Arrow** key

### Auto-Complete:
- Type part of a command or filename
- Press **Tab** key

---

## 📂 What Each Command Does

### `cd "/path/to/folder"`
**CD** = **C**hange **D**irectory
Moves you to that folder in Terminal

### `pnpm install`
Downloads all the code libraries (dependencies) your project needs
Only need to run this once, or when dependencies change

### `pnpm dev`
**DEV** = **DEV**elopment
Starts the development servers so you can see your apps in the browser

### `Ctrl + C`
Stops whatever is currently running
Brings back the command prompt

---

## ✅ Success Checklist

After following this guide, you should have:

- [ ] Terminal opened
- [ ] Navigated to project folder
- [ ] pnpm installed
- [ ] Dependencies installed (`pnpm install`)
- [ ] Development servers running (`pnpm dev`)
- [ ] Contractor app visible at http://localhost:3000
- [ ] Admin app visible at http://localhost:3001
- [ ] Can see Arabic text and RTL layout

If you checked all boxes - **congratulations! You're ready to develop!** 🎉

---

## 🆘 Still Need Help?

If something isn't working:

1. **Check the error message** - read what it says
2. **Look in the "Common Issues" section above**
3. **Copy the error message and ask me** - I can help debug
4. **Make sure you're in the right folder** - run `pwd` to see current path

---

## 🚀 Next Steps

Now that your environment is running, you can:

1. **Start coding!** - Open the project in VS Code or your editor
2. **Edit files** - Changes will auto-reload in the browser
3. **Create test users** - Via Supabase Dashboard
4. **Build features** - Following the PRD.md and CLAUDE.md guidelines

Happy coding! 🎉