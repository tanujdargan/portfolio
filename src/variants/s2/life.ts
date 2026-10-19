// "Outside work" for S2. Sources: ~/satframe, ~/dev/flightportraitOSS, ~/dev/ledposter, Desktop BLE recorder notes,
// homelab notes (Proxmox host, GPU box; no hostnames, IPs or media-acquisition tools on purpose), Steam localconfig.vdf playtime (Oct 2026), YouTube @TANUJDARGAN, Unsplash @tanuj_dargan. Photos are Tanuj's own,
// EXIF stripped. Swap in real build photos when he sends them.
export interface LifeItem { name: string; note?: string; img?: string; pixel?: boolean }
export interface LifeGroup { title: string; items: LifeItem[] }
export interface LifePart {
  id: string
  title: string
  body: string
  items?: LifeItem[]
  groups?: LifeGroup[]
  video?: { src: string; poster: string; caption: string }
  /** Muted looping clips shown in a row: 'wide' for landscape, 'tall' for portrait. */
  clips?: { src: string; poster: string; shape: 'wide' | 'tall' }[]
  links?: { label: string; href: string }[]
}

export const life: { intro: string; parts: LifePart[] } = {
  intro: 'Away from the day job I build small gadgets, run a homelab, point cameras at the sky, and play a lot of story games.',
  parts: [
    {
      id: 'electronics',
      title: 'Things on the bench',
      body: 'Hardware I tinker with on evenings and weekends: microcontrollers, e-ink, LED panels, the odd PCB.',
      items: [
        { name: 'Satellite frame', note: 'An e-ink desk frame that shows MarmotSat’s live ground track and its next pass over Victoria. ESP32-S3; a gift for a teammate.', img: '/life/satframe.png' },
        { name: 'Flight portrait', note: 'A colour e-ink poster of whichever plane is overhead right now, drawn in its airline’s livery from live ADS-B data.', img: '/life/flightportrait.png' },
        { name: 'LED wall', note: 'Six 64×64 panels on a Raspberry Pi: pixel scenes, music visualisers, and a flash when I get a kill in game.', img: '/life/ledwall.png', pixel: true },
      ],
    },
    {
      id: 'lab',
      title: 'The homelab',
      body: 'An i5 Proxmox box and a GPU tower at home. Everything public goes out through one Cloudflare Tunnel with a Zero Trust login in front; nothing is port-forwarded.',
    },
    {
      id: 'photo',
      title: 'Photography & timelapses',
      body: 'Night skies, fog, city lights and a lot of plane windows. Timelapses on a Canon EOS 1200D; most of the rest on my phone.',
      video: { src: '/life/tolmie.mp4', poster: '/life/tolmie.jpg', caption: 'Sunset over Victoria from Mount Tolmie, timelapse' },
      clips: [
        { src: '/life/v-toronto.mp4', poster: '/life/v-toronto.jpg', shape: 'wide' },
        { src: '/life/v-landing.mp4', poster: '/life/v-landing.jpg', shape: 'wide' },
      ],
      items: [
        { name: 'Bare tree on a hilltop under a night sky', img: '/life/p-img-2628.jpg' },
        { name: 'City skyline at night across the water', img: '/life/p-img-0425.jpg' },
        { name: 'Snowy volcano above the clouds', img: '/life/p-img-2255.jpg' },
        { name: 'Foggy path under a street lamp, black and white', img: '/life/p-no-fusion-0206-020.jpg' },
        { name: 'Blood moon during the March 2025 lunar eclipse', img: '/life/eclipse.jpg' },
        { name: 'Wing at twilight above the clouds', img: '/life/p-img-1588.jpg' },
        { name: 'Pink alpenglow on a peak across the water', img: '/life/p-img-0013.jpg' },
        { name: 'Snow-capped peaks from a plane window, moon above', img: '/life/p-no-fusion-0430-047.jpg' },
        { name: 'Harbour lights reflected at night', img: '/life/p-img-3425.jpg' },
      ],
      links: [
        { label: 'Timelapses on YouTube', href: 'https://www.youtube.com/@TANUJDARGAN' },
        { label: 'Photos on Unsplash', href: 'https://unsplash.com/@tanuj_dargan' },
      ],
    },
    {
      id: 'baking',
      title: 'Baking, and why Beri exists',
      body: 'I mostly bake. My cousin and I kept running into the same two problems: recipes scattered across screenshots, bookmarks and notes, and the recipes we saved we never actually made. So we started building Beri, an iOS app for both.',
      items: [
        { name: 'Home', note: 'Stories, then rails you can reorder.', img: '/beri/shipped/home.jpg' },
        { name: 'Library', note: 'Saved recipes, in folders.', img: '/beri/shipped/library.jpg' },
        { name: 'Pantry', note: 'What you have, what expires soon.', img: '/beri/shipped/pantry.jpg' },
        { name: 'Chat', note: 'Ask for a craving, get recipes back.', img: '/beri/shipped/chat.jpg' },
      ],
      links: [{ label: 'getberi.com', href: 'https://getberi.com' }],
    },
    {
      id: 'gigs',
      title: 'Live music',
      body: 'Most of my favourite videos are from shows.',
      clips: [
        { src: '/life/v-gig1.mp4', poster: '/life/v-gig1.jpg', shape: 'tall' },
        { src: '/life/v-gig2.mp4', poster: '/life/v-gig2.jpg', shape: 'tall' },
        { src: '/life/v-gig3.mp4', poster: '/life/v-gig3.jpg', shape: 'tall' },
      ],
    },
    {
      id: 'campus',
      title: 'Around campus',
      body: '',
      items: [
        { name: 'VikeLabs, Director of Events', note: 'UVic’s student club that builds software for local non-profits.' },
        { name: 'CDE 2026, VP Communications', note: 'The Conference on Diversity in Engineering (CFES), hosted at UVic.' },
      ],
    },
    {
      id: 'games',
      title: 'PC gaming',
      body: 'Story games first, then sim racing and sim flying, then shooters.',
      groups: [
        { title: 'Story', items: [
          { name: 'Cyberpunk 2077', img: '/life/g-cp2077.jpg' },
          { name: 'Detroit: Become Human', img: '/life/g-detroit.jpg' },
          { name: '007 First Light', img: '/life/g-007.jpg' },
          { name: 'God of War', img: '/life/g-gow.jpg' },
          { name: 'God of War Ragnarök', img: '/life/g-gowr.jpg' },
          { name: 'Alan Wake 2', img: '/life/g-aw2.jpg' },
          { name: 'The Last of Us Part I', img: '/life/g-tlou.jpg' },
          { name: 'Uncharted 4', img: '/life/g-uncharted4.jpg' },
          { name: 'Resident Evil Village', img: '/life/g-re8.jpg' },
          { name: 'Stray', img: '/life/g-stray.jpg' },
          { name: 'Split Fiction', img: '/life/g-splitfiction.jpg' },
          { name: 'Dispatch', img: '/life/g-dispatch.jpg' },
      ] },
      { title: 'Sim racing and flying', items: [
          { name: 'Assetto Corsa EVO', img: '/life/g-acevo.jpg' },
          { name: 'Forza Horizon 6', img: '/life/g-fh6.jpg' },
          { name: 'F1 25', img: '/life/g-f125.jpg' },
          { name: 'F1 22', img: '/life/g-f122.jpg' },
          { name: 'Euro Truck Simulator 2', img: '/life/g-ets2.jpg' },
          { name: 'TrackMania Nations Forever', img: '/life/g-tmnf.jpg' },
          { name: 'Assetto Corsa', img: '/life/g-assetto.jpg' },
          { name: 'Flight Simulator', img: '/life/g-msfs.jpg' },
      ] },
      { title: 'Shooters', items: [
          { name: 'Counter-Strike 2', img: '/life/g-cs2.jpg' },
          { name: 'Apex Legends', img: '/life/g-apex.jpg' },
          { name: 'Rainbow Six Siege', img: '/life/g-siege.jpg' },
          { name: 'THE FINALS', img: '/life/g-finals.jpg' },
      ] },
      ],
    },
  ],
}

/** The homelab in S2. Numbers read off the Proxmox host on 2026-10-19 (pct/qm list, pvesm status, cloudflared's
 *  tunnel config, Jellyfin playback reporting, Uptime Kuma). Media-acquisition containers left out on purpose. */
export interface LabService { icon: string; name: string; role: string }
export const lab = {
  numbers: [
    { n: '26', l: 'containers and VMs running' },
    { n: '21', l: 'public hostnames through one tunnel' },
    { n: '11 TB', l: 'of storage in use' },
    { n: '421 h', l: 'streamed from Jellyfin since July' },
  ],
  services: [
    { icon: 'homeassistant', name: 'Home Assistant', role: 'The house, as a VM' },
    { icon: 'jellyfin', name: 'Jellyfin', role: 'Films, shows and music' },
    { icon: 'paperlessngx', name: 'Paperless-ngx', role: 'Searchable documents' },
    { icon: 'gitea', name: 'Gitea', role: 'Private Git' },
    { icon: 'uptimekuma', name: 'Uptime Kuma', role: '25 monitors' },
    { icon: 'cloudflare', name: 'cloudflared', role: 'The tunnel, Zero Trust in front' },
    { icon: 'caddy', name: 'Caddy', role: 'Reverse proxy on the LAN' },
    { icon: 'tailscale', name: 'Tailscale', role: 'Private network' },
  ] as LabService[],
  hosts: [
    { icon: 'proxmox', name: 'Proxmox VE 9', meta: 'i5-8500 · 32 GB · NVMe + 2 × 8 TB' },
    { icon: 'nvidia', name: 'GPU box', meta: 'RTX 4070 Ti · CUDA, PyTorch, Docker · SSH via Cloudflare Access' },
  ],
  automations: [
    { icon: 'homeassistant', name: 'Wake, sleep and RGB for the GPU box' },
    { icon: 'homeassistant', name: 'The cooler’s LCD, on a daemon I wrote' },
    { icon: 'googlehome', name: 'All of it from Google Home, over a Matter bridge' },
  ],
}
