// "Outside work" for S1. Sources: ~/satframe, ~/dev/flightportraitOSS, ~/dev/ledposter, Desktop BLE recorder notes,
// homelab notes (Proxmox host, GPU box; no hostnames, IPs or media-acquisition tools on purpose), Steam localconfig.vdf playtime (Oct 2026), YouTube @TANUJDARGAN, Unsplash @tanuj_dargan. Photos are Tanuj's own,
// EXIF stripped. Swap in real build photos when he sends them.
export interface LifeItem { name: string; note?: string; img?: string; pixel?: boolean }
export interface LifePart {
  id: string
  title: string
  body: string
  items?: LifeItem[]
  video?: { src: string; poster: string; caption: string }
  links?: { label: string; href: string }[]
}

export const life: { intro: string; parts: LifePart[] } = {
  intro: 'Away from the day job I build small gadgets, run too many servers at home, play too much Counter-Strike, and point cameras at the sky.',
  parts: [
    {
      id: 'electronics',
      title: 'Things on the bench',
      body: 'Hardware I tinker with on evenings and weekends: microcontrollers, e-ink, LED panels, the odd PCB.',
      items: [
        { name: 'Satellite frame', note: 'An e-ink desk frame that shows MarmotSat’s live ground track and its next pass over Victoria. ESP32-S3; a gift for a teammate.', img: '/life/satframe.png' },
        { name: 'Flight portrait', note: 'A colour e-ink poster of whichever plane is overhead right now, drawn in its airline’s livery from live ADS-B data.', img: '/life/flightportrait.png' },
        { name: 'LED wall', note: 'Six 64×64 panels on a Raspberry Pi: pixel scenes, music visualisers, and a flash when I get a kill in game.', img: '/life/ledwall.png', pixel: true },
        { name: 'Tiny BLE recorder', note: 'A coin-cell Bluetooth recorder that holds a day of audio. On the schematic stage.', img: '/life/ble.png' },
      ],
    },
    {
      id: 'lab',
      title: 'The homelab',
      body: 'A Proxmox server and a GPU tower at home, running things I would otherwise pay for. Nothing is port-forwarded: everything comes in through a Cloudflare Tunnel behind a Zero Trust login.',
      items: [
        { name: 'Proxmox host', note: 'Around twenty LXC containers and a Home Assistant VM on one box. NVMe for the containers, 16 TB of disks for media.' },
        { name: 'GPU box', note: 'Headless Ubuntu with an RTX 4070 Ti, CUDA and Docker, for ML experiments. SSH through Cloudflare Access.' },
        { name: 'Home Assistant', note: 'Runs the house, and the PC too: wake it, sleep it, change its RGB, from a dashboard or Google Home over a Matter bridge.' },
        { name: 'Cooler screen', note: 'Reverse-engineered the USB protocol of my AIO’s 480×480 LCD, backlight included, and wrote a daemon for it. It shows what Claude Code is working on.' },
        { name: 'Jellyfin', note: 'Films and music for everyone in the house.' },
        { name: 'Paperless and Plane', note: 'Scanned documents I can search, and a self-hosted project tracker.' },
      ],
    },
    {
      id: 'games',
      title: 'PC gaming',
      body: 'Mostly tactical shooters, plus sim racing when I want to slow down. Hours from Steam.',
      items: [
        { name: 'Counter-Strike 2', note: '1,400+ hours', img: '/life/g-cs2.jpg' },
        { name: 'Apex Legends', note: '200+ hours', img: '/life/g-apex.jpg' },
        { name: 'Rainbow Six Siege', note: '200+ hours', img: '/life/g-siege.jpg' },
        { name: 'Assetto Corsa', note: 'Sim racing', img: '/life/g-assetto.jpg' },
        { name: 'THE FINALS', note: '80 hours', img: '/life/g-finals.jpg' },
        { name: 'Flight Simulator', note: 'For the planes', img: '/life/g-msfs.jpg' },
      ],
    },
    {
      id: 'photo',
      title: 'Photography & timelapses',
      body: 'Sunsets from Mount Tolmie, star trails, the moon. Shot on a Canon EOS 1200D, with a lot of patience for timelapses.',
      video: { src: '/life/tolmie.mp4', poster: '/life/tolmie.jpg', caption: 'Sunset over Victoria from Mount Tolmie, timelapse' },
      items: [
        { name: 'Dusk over the ridge', img: '/life/DbFz9.jpg' },
        { name: 'Blood moon, March 2025 eclipse', img: '/life/eclipse.jpg' },
        { name: 'Sunset over the water', img: '/life/ocean.jpg' },
        { name: 'Snow line', img: '/life/peaks.jpg' },
        { name: 'Moon and stars', img: '/life/moon.jpg' },
      ],
      links: [
        { label: 'Timelapses on YouTube', href: 'https://www.youtube.com/@TANUJDARGAN' },
        { label: 'Photos on Unsplash', href: 'https://unsplash.com/@tanuj_dargan' },
      ],
    },
  ],
}
