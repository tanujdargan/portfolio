// Side projects for S2. Sources: ~/satframe, ~/dev/flightportraitOSS, ~/dev/ledposter.
// Swap in real build photos when he sends them.
export interface LifeItem { name: string; note?: string; img?: string; pixel?: boolean }
export interface LifePart {
  id: string
  title: string
  body: string
  items?: LifeItem[]
  links?: { label: string; href: string }[]
}

export const life: { parts: LifePart[] } = {
  parts: [
    {
      id: 'electronics',
      title: 'Some hardware side projects',
      body: 'Hardware I tinker with on evenings and weekends: microcontrollers, e-ink, LED panels, the odd PCB.',
      items: [
        { name: 'Satellite frame', note: 'An e-ink desk frame that shows MarmotSat’s live ground track and its next pass over Victoria. ESP32-S3; a gift for a teammate.', img: '/life/satframe.png' },
        { name: 'Flight portrait', note: 'A colour e-ink poster of whichever plane is overhead right now, drawn in its airline’s livery from live ADS-B data.', img: '/life/flightportrait.png' },
        { name: 'LED wall', note: 'Six 64×64 panels on a Raspberry Pi: pixel scenes, music visualisers, and a flash when I get a kill in game.', img: '/life/ledwall.png', pixel: true },
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
      id: 'campus',
      title: 'Around campus',
      body: '',
      items: [
        { name: 'VikeLabs, Director of Events', note: 'UVic’s student club that builds software for local non-profits.' },
        { name: 'CDE 2026, VP Communications', note: 'The Conference on Diversity in Engineering (CFES), hosted at UVic.' },
      ],
    },
  ],
}
