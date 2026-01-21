# Mapbox Satellite Imagery Setup Guide

This guide will help you enable real satellite imagery in your flight simulator using Mapbox's free tier.

## Why Mapbox?

- **Free Tier**: 50,000 tile requests/month (plenty for development and demos)
- **High Quality**: Professional satellite imagery used by major companies
- **Global Coverage**: Satellite imagery for anywhere in the world
- **Easy Integration**: Simple REST API

## Setup Steps

### 1. Create a Mapbox Account

1. Go to [mapbox.com](https://account.mapbox.com/auth/signup/)
2. Sign up for a free account (no credit card required)
3. Verify your email address

### 2. Get Your Access Token

1. After logging in, go to [Access Tokens](https://account.mapbox.com/access-tokens/)
2. Copy your **Default public token** (starts with `pk.`)
3. Or create a new token with these scopes:
   - `styles:tiles` (for satellite imagery)
   - `styles:read` (optional)

### 3. Add Token to Your Project

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your token:
   ```env
   VITE_MAPBOX_TOKEN=pk.your_actual_token_here
   ```

3. Restart your development server:
   ```bash
   npm run dev
   ```

### 4. Verify It's Working

1. Open the app at `http://localhost:5173/`
2. Look at the terrain - you should see realistic satellite imagery
3. Check the browser console for any errors
4. If you see procedural textures, verify:
   - Your `.env` file exists in the project root
   - The token is correct (starts with `pk.`)
   - You restarted the dev server after adding the token

## What If I Don't Want to Use Mapbox?

No problem! The app automatically falls back to **beautiful procedurally generated textures** if:
- No Mapbox token is provided
- The token is invalid
- Network requests fail
- You're working offline

The procedural textures are designed to look realistic and varied, so your simulator will still look great!

## Changing Locations

Currently, the simulator defaults to **San Francisco, CA** (37.7749°N, 122.4194°W).

To change the starting location, edit `src/mapbox-terrain.ts`:

```typescript
private centerLat: number = 37.7749; // Your latitude
private centerLon: number = -122.4194; // Your longitude
```

Popular locations to try:
- **Grand Canyon**: 36.1069°N, -112.1129°W
- **New York City**: 40.7128°N, -74.0060°W
- **Swiss Alps**: 46.5586°N, 8.0879°E
- **Tokyo**: 35.6762°N, 139.6503°E
- **Sydney**: -33.8688°S, 151.2093°E

## Usage Limits

**Free Tier**: 50,000 requests/month

Typical usage:
- Initial load: ~10-20 tiles
- Flying around: ~5-10 tiles per minute
- One hour of flying: ~300-600 tiles

**Estimate**: With the free tier, you can easily fly for 80+ hours per month!

## Troubleshooting

### "Missing Mapbox Token" Console Warning
- This is normal if you haven't set up a token yet
- The app will use procedural textures instead

### Tiles Not Loading
1. Check browser console for errors
2. Verify token starts with `pk.`
3. Check network tab - API calls should be to `api.mapbox.com`
4. Try regenerating your token on Mapbox dashboard

### Rate Limit Errors
- You've exceeded 50,000 requests this month
- Wait until next month or upgrade to a paid plan
- The app will fall back to procedural textures

## Going to Production

For deployment:

1. **Environment Variables**: Add `VITE_MAPBOX_TOKEN` to your hosting platform
   - Vercel: Environment Variables in dashboard
   - Netlify: Site settings → Environment variables
   - GitHub Pages: Use GitHub Secrets

2. **Security**: Your public token is safe to expose in client-side code
   - Public tokens (pk.) are designed for browser use
   - They're restricted by domain/URL in Mapbox dashboard
   - No sensitive operations can be performed with them

3. **Monitoring**: Check your usage at [mapbox.com/account/statistics](https://account.mapbox.com/statistics/)

## Advanced: Custom Locations

Want to let users pick locations? Add this to your UI:

```typescript
// In your input controller or UI
terrain.setLocation(newLat, newLon);
```

This will reload all terrain chunks with imagery from the new location!

## Support

- **Mapbox Documentation**: [docs.mapbox.com](https://docs.mapbox.com/)
- **Mapbox Support**: [support.mapbox.com](https://support.mapbox.com/)
- **API Reference**: [Raster Tiles API](https://docs.mapbox.com/api/maps/raster-tiles/)

## Credits

Satellite imagery © Mapbox, © OpenStreetMap contributors
