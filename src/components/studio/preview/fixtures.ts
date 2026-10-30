/**
 * Neighbour videos for the feed preview. Every title, channel and number here
 * is made up; the images are the sample renders in public/samples.
 */
export type FeedVideo = {
  id: string;
  src: string;
  alt: string;
  title: string;
  channel: string;
  views: string;
  age: string;
  /** As printed on the badge, e.g. "12:48" or "1:02:15". */
  duration: string;
  /** Search results show two lines of it. */
  description: string;
  /** Hue (0-360) for the channel's avatar circle. */
  hue: number;
};

export const NEIGHBOURS: FeedVideo[] = [
  {
    id: 'frozen',
    src: '/samples/gaming-frozen.webp',
    alt: 'An explorer on an icy cliff under an aurora, with "Day 100" in large letters.',
    title: 'I survived 100 days in the frozen north (hardcore, no restarts)',
    channel: 'Frostline',
    views: '1.4M views',
    age: '6 days ago',
    duration: '48:12',
    description:
      'Day 100 of the frozen north series. The storm hit on day 71 and I lost the whole base, so this one is a rebuild from scratch.',
    hue: 200,
  },
  {
    id: 'ramen',
    src: '/samples/cooking-ramen.webp',
    alt: 'A steaming bowl of ramen with a soft egg, titled "10 min ramen".',
    title: 'Ten minute ramen that tastes like it took all day',
    channel: 'Pantry Hours',
    views: '287K views',
    age: '2 weeks ago',
    duration: '9:41',
    description:
      'A weeknight bowl from what is already in the cupboard: instant noodles, a jammy egg and a five-ingredient tare.',
    hue: 28,
  },
  {
    id: 'salary',
    src: '/samples/finance-salary.webp',
    alt: 'A woman holding a torn payslip beside a bar chart, titled "Where it goes".',
    title: 'Where a £2,400 salary actually goes, line by line',
    channel: 'Ledger & Loaf',
    views: '96K views',
    age: '3 days ago',
    duration: '14:05',
    description:
      'Rent, the commute, the subscriptions you forgot about. One real month of spending, sorted into the boxes that matter.',
    hue: 150,
  },
  {
    id: 'lisbon',
    src: '/samples/travel-lisbon.webp',
    alt: 'A traveller leaning out of a yellow tram on a steep street, titled "48 hours in Lisbon".',
    title: '48 hours in Lisbon on a tram pass and €60',
    channel: 'Small Trains Big Hills',
    views: '512K views',
    age: '1 month ago',
    duration: '22:37',
    description:
      'Two days, one tram pass and a budget. Where to eat, which hills to skip and the viewpoint nobody queues for.',
    hue: 48,
  },
  {
    id: 'headphones',
    src: '/samples/review-headphones.webp',
    alt: 'A reviewer holding green headphones, asking "Worth $399?".',
    title: 'Are $399 headphones worth it? Three weeks later',
    channel: 'Quiet Bench',
    views: '61K views',
    age: '5 days ago',
    duration: '11:58',
    description:
      'Noise cancelling, battery and comfort after three weeks of daily commuting, compared with the pair I paid half as much for.',
    hue: 110,
  },
  {
    id: 'run',
    src: '/samples/fitness-5am.webp',
    alt: 'A runner crossing a bridge before dawn, titled "30 days of 5am".',
    title: 'I ran at 5am for 30 days. Here is what changed',
    channel: 'Tempo Club',
    views: '734K views',
    age: '2 months ago',
    duration: '16:20',
    description:
      'Thirty mornings, one bridge and a lot of cold hands. Sleep, pace and mood tracked every single day.',
    hue: 260,
  },
  {
    id: 'podcast',
    src: '/samples/podcast-remote.webp',
    alt: 'Two hosts at microphones, one laughing and one doubtful, under "We were wrong".',
    title: 'We were wrong about remote work | Episode 112',
    channel: 'Two Mics Short',
    views: '38K views',
    age: '1 day ago',
    duration: '1:12:04',
    description:
      'Two years ago we said the office was finished. This week we go back through what we got right and what we did not.',
    hue: 330,
  },
  {
    id: 'api',
    src: '/samples/tech-api.webp',
    alt: 'A developer pointing at a glowing laptop beside the words "API in 15 min".',
    title: 'Build a REST API in 15 minutes (no framework)',
    channel: 'Patchwork Dev',
    views: '203K views',
    age: '4 weeks ago',
    duration: '15:02',
    description:
      'Routing, validation and a database in plain Node. Every line typed live, with the finished code linked below.',
    hue: 220,
  },
  {
    id: 'notes',
    src: '/samples/edit-notes.webp',
    alt: 'A woman surrounded by flying paper notes, titled "I tried 12 note apps".',
    title: 'I tried 12 note apps so you do not have to',
    channel: 'Margin Notes',
    views: '154K views',
    age: '9 days ago',
    duration: '19:44',
    description:
      'Twelve apps, one month of real work in each. The three I kept, and the one feature that decided it.',
    hue: 15,
  },
];

/** The video "playing" next to the Up next column. */
export const NOW_PLAYING = NEIGHBOURS[0];

/** Neighbours with `count` items, skipping any ids in `skip`. */
export const pickNeighbours = (
  count: number,
  offset = 0,
  skip: string[] = [],
) => {
  const pool = NEIGHBOURS.filter((v) => !skip.includes(v.id));
  return Array.from(
    { length: count },
    (_, i) => pool[(i + offset) % pool.length],
  );
};
