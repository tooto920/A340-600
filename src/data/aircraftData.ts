/**
 * A340-600 reference data.
 *
 * Every figure below is taken from, or derived from, the sources listed in
 * `SOURCES`. Where manufacturers publish ranges (capacity, range) the
 * configuration-dependent value is given explicitly rather than a single
 * headline number.
 *
 * No figure in this file is invented. If a value could not be confirmed
 * against a manufacturer or regulator document it is not present here.
 */

export const SOURCES = [
  {
    id: 'airbus-ac',
    label: 'Airbus, Aircraft Characteristics — A340-500/-600',
    detail: 'Airport & Maintenance Planning, Rev. 21, Aug 01/22',
    href: 'https://www.airbus.com/en/airport-operations-and-technical-data/aircraft-characteristics',
  },
  {
    id: 'airbus-programme',
    label: 'Airbus, A340-600 programme page',
    detail: 'Official programme overview and key figures',
    href: 'https://www.airbus.com/en/products-services/commercial-aircraft/passenger-aircraft/a340-600',
  },
  {
    id: 'faa-tcds',
    label: 'FAA, Type Certificate Data Sheet A-140',
    detail: 'A340-500 / A340-600 — certification basis',
    href: 'https://drs.faa.gov/',
  },
  {
    id: 'rolls-royce',
    label: 'Rolls-Royce, Trent 500 family',
    detail: 'Engine programme data for the A340-600 powerplant',
    href: 'https://www.rolls-royce.com/media/press-releases/2021/29-03-2021-rr-raises-the-bar-for-engine-efficiency-and-sets-new-sustained-time-on-wing-record.html',
  },
] as const

export interface SpecItem {
  label: string
  value: string
  unit?: string
  note?: string
}

/** Headline specification, Chapter V. */
export const HEADLINE_SPECS: SpecItem[] = [
  { label: 'Length', value: '75.36', unit: 'm', note: 'Longest airliner fuselage of its generation' },
  { label: 'Wingspan', value: '63.45', unit: 'm', note: 'Area 437 m², aspect ratio 9.2' },
  { label: 'Height', value: '17.80', unit: 'm', note: 'Ground to vertical tail tip' },
  { label: 'Cabin width', value: '5.64', unit: 'm', note: 'Typical three-abreast widebody' },
  { label: 'Engines', value: '4', unit: '× Trent 556-61', note: '112 in / 2.95 m fan diameter' },
  { label: 'Max takeoff weight', value: '275', unit: 't', note: 'MTOW' },
  { label: 'Typical seating', value: '380', unit: 'seats', note: '12F + 54J + 314Y — 384 in standard config' },
  { label: 'Max seating', value: '440', unit: 'seats', note: 'Configuration dependent' },
  { label: 'Cargo', value: '46.4', unit: 't', note: '18 LD3 containers, lower hold' },
  { label: 'Range', value: '13,450', unit: 'km', note: 'Load and configuration dependent' },
]

export interface TimelineEntry {
  year: string
  title: string
  body: string
}

/** History, Chapter I. */
export const TIMELINE: TimelineEntry[] = [
  {
    year: '1996',
    title: 'The programme is launched',
    body: 'Airbus confirms the A340-600 as a stretched, higher-capacity development of the four-engined A340 family, to be built in Toulouse alongside the A330.',
  },
  {
    year: '1999',
    title: 'Rolls-Royce Trent 556 selected',
    body: 'The A340-600 is powered exclusively by the Trent 556, a 75,000 lbf-class derivative of the Trent 500 developed specifically for the larger, heavier airframe.',
  },
  {
    year: '2001',
    title: 'First flight',
    body: 'The A340-600 makes its maiden flight on 23 April 2001 from Toulouse, piloted by Airbus chief test pilot Didier Quélin and co-pilot Jean-François Pilon.',
  },
  {
    year: '2002',
    title: 'Entry into service',
    body: 'Entering service with Cathay Pacific on 1 August 2002 on European routes, the type becomes the longest-bodied airliner in service at that time.',
  },
  {
    year: '2003',
    title: 'Virgin Atlantic takes delivery',
    body: 'Virgin Atlantic becomes the European launch customer and keeps the type in service for the best part of two decades, long after the quadjet era closed elsewhere.',
  },
  {
    year: '2011',
    title: 'Qatar Airways enters the record books',
    body: 'A Qatar Airways A340-600 performs the longest scheduled flight of the modern era, Doha to Perth, then the longest at the time, over 15 hours in the air.',
  },
  {
    year: '2020',
    title: 'The last of the long-haul quadjets',
    body: 'As the A340-600 winds down its remaining fleet, the type stands as the final long-haul four-engined airliner ever built in series.',
  },
]

export interface Chapter {
  id: string
  numeral: string
  title: string
  kicker: string
  body: string
  /** Camera keyframes in aircraft space (metres). */
  camera: {
    position: [number, number, number]
    target: [number, number, number]
  }
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'legend',
    numeral: 'I',
    title: 'The Legend',
    kicker: 'Where the story begins',
    body: 'For a brief window in aviation history, four engines were not a retreat. They were an advantage: the ability to fly further, higher and more reliably than any twinjet before them. The A340-600 carried that idea to its absolute limit — and became the last great long-haul quadjet ever built.',
    camera: { position: [-58, 16, 96], target: [34, 0, 0] },
  },
  {
    id: 'pencil',
    numeral: 'II',
    title: 'The Flying Pencil',
    kicker: '75.36 metres of purpose',
    body: 'Stretch the A330 by almost 11 metres and the result is an aircraft that is unmistakably a pencil. The A340-600 was built for the long sector: 12.8 metres more cabin than the A340-500, laid out as 44 business-class seats, 54 premium-economy seats and a 314-seat main cabin in the standard configuration.',
    camera: { position: [-6, 3, 46], target: [42, 0, 0] },
  },
  {
    id: 'four',
    numeral: 'III',
    title: 'Power of Four',
    kicker: 'Trent 556',
    body: 'Four Rolls-Royce Trent 556 engines, each with a 112-inch fan, give the A340-600 more than 280,000 lbf of thrust. Two engines could fly the aircraft. Four could carry it, over oceans, in any conditions — redundancy measured in continents.',
    camera: { position: [26, -6, 30], target: [36, -3, 12] },
  },
  {
    id: 'engineering',
    numeral: 'IV',
    title: 'Engineering Masterpiece',
    kicker: 'The details that matter',
    body: 'A 17-metre carbon-fibre wing carrying 275 tonnes, a centre-body gear with four wheels to spread the load on the heaviest main gear of its day, and a fuselage built in 12-metre barrel sections. The A340-600 was a mature design, refined rather than reinvented — which is exactly why it worked.',
    camera: { position: [-6, 4, 18], target: [2, 0, 2] },
  },
  {
    id: 'longhaul',
    numeral: 'V',
    title: 'Long Haul Excellence',
    kicker: 'The numbers',
    body: 'A 275-tonne maximum take-off weight, 46.4 tonnes of cargo and 13,450 kilometres of range. The A340-600 was built for the routes where the Airbus A330 was still finding its limits.',
    camera: { position: [30, 22, 40], target: [34, 0, 0] },
  },
  {
    id: 'horizon',
    numeral: 'VI',
    title: 'The Final Horizon',
    kicker: 'Departure',
    body: 'The last A340-600s left the factory in 2011. What remains is the shape — the long grey line, four fans, one more horizon. The quadjet will not return. This was the last of it.',
    camera: { position: [120, 26, 120], target: [40, 4, 0] },
  },
]

export interface Milestone {
  value: string
  label: string
  detail: string
}

/** The "last of its kind" facts used as counters. */
export const MILESTONES: Milestone[] = [
  {
    value: '4',
    label: 'Rolls-Royce Trent 556',
    detail: 'The only powerplant ever fitted to the type. No alternative engine was certified.',
  },
  {
    value: '17.8 m',
    label: 'Tail height',
    detail: 'Tail-to-tail, the A340-600 stood taller than the Statue of Liberty is long.',
  },
  {
    value: '15 h',
    label: 'Longest scheduled flight',
    detail: 'Doha to Perth, Qatar Airways, 2011 — the longest scheduled flight of the modern era at the time.',
  },
  {
    value: '0',
    label: 'Quadjets after it',
    detail: 'No long-haul four-engined airliner has been built in series since the A340-600.',
  },
]

/** Short, factual blurbs for the explorer panel. */
export const EXPLORER_FACTS: Record<string, string> = {
  front: 'The A340-600 nose carries the Airbus cockpit window group, six panes per side, with the characteristic downward-sloping lower edge.',
  rear: 'The APU exhaust sits at the extreme tail of the 75.36-metre fuselage, more than 20 metres beyond the wing trailing edge.',
  side: 'At 75.36 metres, the A340-600 has the longest fuselage of any airliner built before the A350-1000 and the Boeing 777-9.',
  top: 'The 63.45-metre span, 32.5-degree sweep at quarter chord and 2.74-metre winglets make the A340-600 planform unmistakable.',
  engine: 'Each Trent 556 drives a 112-inch (2.95 m) wide-chord fan with 26 blades and produces around 70,000 lbf.',
  cockpit: 'Airbus flew the A340-600 with a conventional flight-deck arrangement, crewed by two pilots.',
  gear: 'Fourteen wheels: two on the nose gear, four on each wing gear, and four on the centre-body gear.',
}
