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
  stack?: string[]
  groups?: LifeGroup[]
  video?: { src: string; poster: string; caption: string }
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
      body: 'A Proxmox server, a GPU tower and Home Assistant tying them to the house. Nothing is port-forwarded: it all comes in through a Cloudflare Tunnel behind a Zero Trust login.',
      stack: ['Proxmox VE 9', '~20 LXC containers', 'Home Assistant OS', 'Cloudflare Tunnel + Access', 'UniFi', 'RTX 4070 Ti · CUDA', 'Jellyfin', 'Paperless-ngx', 'Plane'],
      items: [
        { name: 'A cooler screen with no Linux driver', note: 'The AIO’s 480×480 LCD only had a Windows app. I wrote a daemon from two community protocol ports, then found the undocumented backlight command by probing USB packets. It now shows what my coding agent is working on.' },
        { name: 'A PC that woke itself up', note: 'Sleep from Home Assistant aborted instantly. The wake came from the chipset USB controller: the cooler’s panel re-enumerates as USB idles. Disabling wake on just that controller, with Wake-on-LAN kept over Wi-Fi, made sleep and wake work from Google Home.' },
        { name: 'A server that fell off the network', note: 'The Proxmox host kept dropping off the LAN while running fine. The journal showed the Intel I219 NIC logging “Hardware Unit Hang”. Offload features off on that interface, persisted across reboots.' },
        { name: '4 GB a week to GitHub', note: 'UniFi’s traffic API showed the host pulling 4.3 GB a week. A leftover monitoring agent’s self-heal timer was re-downloading a release every five minutes, failing, and trying again.' },
      ],
    },
    {
      id: 'photo',
      title: 'Photography & timelapses',
      body: 'Night skies, fog, city lights and a lot of plane windows. Timelapses on a Canon EOS 1200D; most of the rest on my phone.',
      video: { src: '/life/tolmie.mp4', poster: '/life/tolmie.jpg', caption: 'Sunset over Victoria from Mount Tolmie, timelapse' },
      items: [
        { name: 'Bare tree on a hilltop under a night sky', img: '/life/p-img-2628.jpg' },
        { name: 'Snow-capped peaks from a plane window, moon above', img: '/life/p-no-fusion-0430-047.jpg' },
        { name: 'City skyline at night across the water', img: '/life/p-img-0425.jpg' },
        { name: 'Dusk over a ridge', img: '/life/DbFz9.jpg' },
        { name: 'Foggy path under a street lamp, black and white', img: '/life/p-no-fusion-0206-020.jpg' },
        { name: 'Snowy volcano above the clouds', img: '/life/p-img-2255.jpg' },
        { name: 'Long exposure of clouds over a harbour', img: '/life/p-img-3399.jpg' },
        { name: 'Blood moon during the March 2025 lunar eclipse', img: '/life/eclipse.jpg' },
        { name: 'Wing at twilight above the clouds', img: '/life/p-img-1588.jpg' },
        { name: 'Picnic table under a tree at night', img: '/life/p-img-2623.jpg' },
        { name: 'Neon theatre sign on a dark street', img: '/life/p-no-fusion-0320-001.jpg' },
        { name: 'Pink alpenglow on a peak across the water', img: '/life/p-img-0013.jpg' },
        { name: 'Stars through bare branches', img: '/life/p-img-2551.jpg' },
        { name: 'Harbour lights reflected at night', img: '/life/p-img-3425.jpg' },
        { name: 'Trees in fog under lamplight', img: '/life/p-no-fusion-0206-024.jpg' },
        { name: 'Wing over islands and low cloud', img: '/life/p-img-2237.jpg' },
        { name: 'The moon', img: '/life/moon.jpg' },
        { name: 'Sunset over the water', img: '/life/ocean.jpg' },
        { name: 'Volcano and moon from a plane', img: '/life/p-no-fusion-0430-031.jpg' },
        { name: 'Snowy peaks', img: '/life/peaks.jpg' },
      ],
      links: [
        { label: 'Timelapses on YouTube', href: 'https://www.youtube.com/@TANUJDARGAN' },
        { label: 'Photos on Unsplash', href: 'https://unsplash.com/@tanuj_dargan' },
      ],
    },
    {
      id: 'campus',
      title: 'Around campus',
      body: 'Organising things people show up to.',
      items: [
        { name: 'VikeLabs, Director of Events', note: 'UVic’s student club that builds software for local non-profits.' },
        { name: 'CDE 2026, VP Communications', note: 'The Conference on Diversity in Engineering (CFES), hosted at UVic.' },
      ],
    },
    {
      id: 'games',
      title: 'PC gaming',
      body: 'Story games first, then racing and sims, then shooters.',
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
      { title: 'Racing and sims', items: [
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
