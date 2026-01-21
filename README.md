# Infinite Flight - Procedurally Generated Flight Simulator

A visually polished, browser-based flight simulator featuring infinite procedurally generated terrain, realistic day/night cycles, dynamic weather, and particle effects. Built with Three.js and TypeScript.

![Infinite Flight](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

## Features

### Visual Polish
- **Post-Processing Pipeline**: Bloom and FXAA anti-aliasing for refined graphics
- **Advanced Materials**: PBR materials with proper metalness and roughness values
- **Tone Mapping**: ACES Filmic tone mapping for cinematic color grading
- **Smooth UI**: Glass morphism design with backdrop blur effects

### Flight Mechanics
- **Arcade Flight Model**: Easy-to-learn controls with satisfying physics
- **Realistic Aerodynamics**: Lift, drag, gravity, and momentum simulation
- **Multiple Camera Views**: Chase, cockpit, cinematic, and free camera modes
- **Smooth Camera Transitions**: Lerp-based camera movement for professional feel

### Terrain System
- **Satellite Imagery**: Optional Mapbox integration for real-world satellite textures
- **Procedural Fallback**: Beautiful procedurally generated textures when offline
- **Infinite Terrain**: Chunk-based terrain generation with automatic loading/unloading
- **Enhanced Heightmaps**: Multi-octave noise for realistic terrain features
- **Optimized Rendering**: Only visible chunks are generated and rendered

### Dynamic Sky System
- **Full Day/Night Cycle**: Realistic sun and moon movement across the sky
- **Time Phases**: Night, dawn, sunrise, day, sunset, dusk transitions
- **Dynamic Lighting**: Sun intensity changes throughout the day
- **Atmospheric Fog**: Color-matched fog that adapts to time of day
- **Time Controls**: Pause, 1x, 10x, and 50x speed options

### Weather & Atmosphere
- **Procedural Clouds**: 100+ volumetric clouds with natural drift
- **Cloud Dynamics**: Clouds change color based on time (white, orange, pink)
- **Infinite Cloud System**: Clouds wrap around player for endless coverage

### Particle Effects
- **Engine Exhaust Trail**: Throttle-responsive smoke particles
- **High-Altitude Contrails**: Realistic vapor trails above 150m
- **Soft Particles**: Gradient-based particle textures with proper blending
- **Performance Optimized**: Efficient GPU-based particle rendering

### Aircraft Design
- **Stylized Model**: Custom-built airplane with capsule fuselage
- **Transparent Cockpit**: Glass canopy with realistic materials
- **Position Lights**: Red (left) and green (right) navigation lights
- **Spinning Propeller**: Animated propeller blades
- **Metallic Surfaces**: Realistic material properties

## Controls

| Action | Keys |
|--------|------|
| Pitch Up/Down | W / S |
| Roll Left/Right | A / D |
| Yaw Left/Right | Q / E |
| Increase/Decrease Throttle | ↑ / ↓ |
| Change Camera View | C |

## Tech Stack

- **Three.js**: 3D rendering engine
- **TypeScript**: Type-safe development
- **Vite**: Fast development server and build tool
- **three-stdlib**: Post-processing effects
- **Custom Shaders**: Sky gradient system

## Getting Started

### Prerequisites
- Node.js 16+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/tanujdargan/portfolio.git
cd portfolio

# Install dependencies
npm install

# (Optional) Setup Mapbox for satellite imagery
# 1. Create a free account at https://account.mapbox.com/
# 2. Get your access token from https://account.mapbox.com/access-tokens/
# 3. Create a .env file: cp .env.example .env
# 4. Add your token: VITE_MAPBOX_TOKEN=your_token_here
# Note: The app works without Mapbox using procedural textures

# Start development server
npm run dev

# Build for production
npm run build
```

The simulator will be available at `http://localhost:5173/`

### Mapbox Integration (Optional)

The terrain system can use **Mapbox Satellite imagery** for realistic ground textures:

- **With Mapbox Token**: Real satellite imagery from around the world
- **Without Token**: Beautiful procedurally generated textures (no setup needed)

**Free Tier**: Mapbox offers 50,000 tile requests/month free, perfect for portfolio projects.

To enable Mapbox:
1. Sign up at [mapbox.com](https://account.mapbox.com/)
2. Copy your access token
3. Create `.env` file with: `VITE_MAPBOX_TOKEN=your_token_here`
4. Restart the dev server

## Architecture

```
src/
├── main.ts              # Main application setup and game loop
├── airplane.ts          # Aircraft model and physics
├── mapbox-terrain.ts    # Terrain with Mapbox satellite imagery
├── terrain.ts           # Legacy procedural terrain (backup)
├── camera.ts            # Camera system with multiple modes
├── input.ts             # Keyboard input handling
├── sky.ts               # Day/night cycle and sky rendering
├── clouds.ts            # Procedural cloud system
├── particles.ts         # Particle effects (trails, contrails)
└── postprocessing.ts    # Post-processing pipeline
```

## Performance Optimizations

- Chunk-based terrain rendering with automatic cleanup
- Efficient particle pooling system
- GPU-accelerated particle rendering
- Optimized material properties
- Proper render order for transparency
- Viewport-based pixel ratio limiting

## Future Enhancements

- Multiple aircraft types (jets, gliders, helicopters)
- Weather systems (rain, storms, varying wind)
- Improved terrain features (lakes, forests, cities)
- Audio system (engine sounds, wind ambience)
- Screenshot mode with filters
- Multiplayer support
- Mission system with waypoints

## Credits

Inspired by [Slow Roads](https://slowroads.io/) and [Bruno Simon's Portfolio](https://bruno-simon.com/)

## License

ISC
