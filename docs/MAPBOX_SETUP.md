# Mapbox Configuration Guide for Contractors Mall

## Overview

This guide explains how to properly configure Mapbox for the Contractors Mall application, including security best practices for token management.

## 1. Token Security Model

**Important**: Mapbox access tokens are **designed to be public**. They are used in frontend JavaScript code and will be visible to users. This is secure because:

- Tokens are **read-only** by default (can only fetch map tiles/styles)
- Security comes from **URL restrictions** configured on Mapbox
- Tokens can be **rotated** anytime if compromised
- **Rate limiting** prevents abuse

## 2. Required Scopes

When creating your Mapbox token, ensure these scopes are enabled:

- ✅ `styles:tiles` - Display map tiles (Essential)
- ✅ `styles:read` - Read style configurations (Essential)
- ✅ `fonts:read` - Display text/labels on map (Essential)

## 3. Setting Up URL Restrictions

### Step 1: Access Mapbox Dashboard
1. Go to https://account.mapbox.com/access-tokens/
2. Find your token: `pk.eyJ1IjoibXNoZWlraDk0IiwiYSI6ImNtaHhnMmp5eDAwdnIybHNiendnZ3piNDEifQ.MNLaFv5se7nVvDxQq2hCqg`
3. Click on the token to edit it

### Step 2: Add URL Restrictions

Add these URLs to the "URL restrictions" section:

#### Development URLs:
```
http://localhost:*
http://127.0.0.1:*
```

#### Production URLs (Vercel):
```
https://contractors-mall.vercel.app
https://*.contractors-mall.vercel.app
https://contractorsmall.com
https://www.contractorsmall.com
```

#### Preview/Staging URLs:
```
https://contractors-mall-*.vercel.app
```

### Step 3: Save Changes
Click "Save" to apply the restrictions.

## 4. Environment Configuration

### Local Development (.env.local)
```bash
# Mapbox Configuration
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoibXNoZWlraDk0IiwiYSI6ImNtaHhnMmp5eDAwdnIybHNiendnZ3piNDEifQ.MNLaFv5se7nVvDxQq2hCqg
```

### Vercel Production
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - **Name**: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
   - **Value**: Your Mapbox token
   - **Environment**: ✅ Production, ✅ Preview, ✅ Development
3. Redeploy your application

## 5. Testing the Map

### Local Testing:
```bash
# Restart dev server to load env variables
pnpm dev

# Visit
http://localhost:3000/suppliers

# Click "خريطة" (Map) button
```

### Check Browser Console:
You should see:
```
🗺️ Mapbox Configuration: {tokenExists: true, tokenLength: 107, ...}
✅ Mapbox map loaded successfully
```

### Common Issues:

#### Map Not Showing:
1. **Check Environment Variable**: Ensure `.env.local` has the correct variable name
2. **Restart Dev Server**: Environment variables only load on startup
3. **Check Browser Console**: Look for Mapbox-specific errors
4. **Verify Token Scopes**: Ensure all required scopes are enabled on Mapbox

#### "Unauthorized" Error:
1. URL restrictions don't match your domain
2. Token has expired or been revoked
3. Required scopes are not enabled

## 6. Monitoring & Rotation

### Monitor Usage:
- Check Mapbox dashboard for usage statistics
- Set up alerts for unusual activity
- Review access logs periodically

### Token Rotation:
If you need to rotate the token:
1. Create a new token on Mapbox
2. Apply same URL restrictions and scopes
3. Update in `.env.local` and Vercel
4. Delete the old token from Mapbox

## 7. Production Checklist

Before going live:
- [ ] Token has URL restrictions configured
- [ ] Production domain is in the allowed URLs list
- [ ] Token is set in Vercel environment variables
- [ ] Map loads correctly on preview deployments
- [ ] Error fallback UI works when token is invalid
- [ ] No console errors in production build

## 8. Debugging

Enable debug logging by adding to `MapView.tsx`:
```javascript
// Add after imports
if (typeof window !== 'undefined') {
  window.mapboxgl = mapboxgl;
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
  console.log('Mapbox Debug:', {
    version: mapboxgl.version,
    supported: mapboxgl.supported(),
    token: MAPBOX_ACCESS_TOKEN ? 'Set' : 'Missing'
  });
}
```

## Support

If maps still don't work after following this guide:
1. Check the [Mapbox Status Page](https://status.mapbox.com/)
2. Verify your account isn't rate-limited
3. Try with a fresh token
4. Contact Mapbox support with your token ID (not the token itself)