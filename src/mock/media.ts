import type {
  Collection,
  Genre,
  MediaItem,
  MediaRow,
  Episode,
  Season,
  Trailer,
  Review,
  CastMember,
  CrewMember,
  ProductionCompany,
  AgeRating,
  MediaStatus,
  Language,
} from "@/types/media";

/**
 * Realistic mock data. Images are served from TMDB's public image CDN
 * (image.tmdb.org) and are only used as placeholders while we wire up the
 * frontend. Swap the entire module out for an API adapter in a later
 * milestone — component contracts (`MediaItem`) stay the same.
 */

/**
 * Deterministic placeholder imagery from picsum.photos. Each id maps to a
 * stable, cinematic photo so posters/backdrops don't shuffle on refresh.
 * Replace with a real image CDN (TMDB, custom) in a later milestone.
 */
const poster = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}-poster/500/750`;
const backdrop = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}-back/1600/900`;
const still = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}-still/800/450`;
const avatar = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}-avatar/200/200`;

function m(
  id: string,
  title: string,
  _poster: string,
  _backdrop: string,
  overview: string,
  opts: Partial<MediaItem> = {},
): MediaItem {
  return {
    id,
    kind: "movie",
    title,
    poster: poster(id),
    backdrop: backdrop(id),
    overview,
    genres: opts.genres ?? ["Drama"],
    runtime: opts.runtime ?? 120,
    releaseDate: opts.releaseDate ?? "2024-01-01",
    rating: opts.rating ?? 7.8,
    cast: opts.cast ?? [],
    tagline: opts.tagline,
    ...opts,
  };
}

function t(
  id: string,
  title: string,
  poster: string,
  backdrop: string,
  overview: string,
  opts: Partial<MediaItem> = {},
): MediaItem {
  return m(id, title, poster, backdrop, overview, { ...opts, kind: "tv" });
}

const cast = (names: string[]): { id: string; name: string }[] =>
  names.map((n, i) => ({ id: `${n}-${i}`, name: n }));

export const MOVIES: MediaItem[] = [
  m(
    "dune-2",
    "Dune: Part Two",
    "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    "/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
    {
      genres: ["Sci-Fi", "Adventure"],
      runtime: 166,
      releaseDate: "2024-02-27",
      rating: 8.3,
      tagline: "Long live the fighters.",
      cast: cast(["Timothée Chalamet", "Zendaya", "Rebecca Ferguson", "Javier Bardem"]),
    },
  ),
  m(
    "oppenheimer",
    "Oppenheimer",
    "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    "/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
    "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II.",
    {
      genres: ["Drama", "History"],
      runtime: 180,
      releaseDate: "2023-07-19",
      rating: 8.1,
      tagline: "The world forever changes.",
      cast: cast(["Cillian Murphy", "Emily Blunt", "Robert Downey Jr.", "Matt Damon"]),
    },
  ),
  m(
    "interstellar",
    "Interstellar",
    "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    "/pbrkL804c8yAv3zBZR4QPEafpAR.jpg",
    "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    {
      genres: ["Sci-Fi", "Adventure"],
      runtime: 169,
      releaseDate: "2014-11-05",
      rating: 8.6,
      tagline: "Mankind was born on Earth. It was never meant to die here.",
      cast: cast(["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"]),
    },
  ),
  m(
    "blade-runner-2049",
    "Blade Runner 2049",
    "/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    "/ilRyazdMJwN05exqhwK4tMKBYZs.jpg",
    "Young Blade Runner K's discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard.",
    { genres: ["Sci-Fi", "Mystery"], runtime: 164, releaseDate: "2017-10-06", rating: 8.0 },
  ),
  m(
    "the-batman",
    "The Batman",
    "/74xTEgt7R36Fpooo50r9T25onhq.jpg",
    "/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg",
    "When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate.",
    { genres: ["Crime", "Mystery"], runtime: 176, releaseDate: "2022-03-04", rating: 7.8 },
  ),
  m(
    "everything-everywhere",
    "Everything Everywhere All at Once",
    "/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
    "/nGxUxi3PfXDRm7Vg95VBNgNM8yc.jpg",
    "An aging Chinese immigrant is swept up in an adventure where she alone can save existence by exploring other universes.",
    { genres: ["Sci-Fi", "Comedy"], runtime: 139, releaseDate: "2022-03-25", rating: 8.0 },
  ),
  m(
    "inception",
    "Inception",
    "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
    "/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
    "A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.",
    { genres: ["Action", "Sci-Fi"], runtime: 148, releaseDate: "2010-07-16", rating: 8.4 },
  ),
  m(
    "spider-verse",
    "Across the Spider-Verse",
    "/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    "/4HodYYKEIsGOdinkGi2Ucfxts0h.jpg",
    "After reuniting with Gwen Stacy, Miles Morales is catapulted across the Multiverse.",
    { genres: ["Animation", "Action"], runtime: 140, releaseDate: "2023-06-02", rating: 8.6 },
  ),
  m(
    "poor-things",
    "Poor Things",
    "/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg",
    "/hRHf3jUEqiySOs42rHhSalUX7Ju.jpg",
    "The incredible tale about the fantastical evolution of Bella Baxter, a young woman brought back to life.",
    { genres: ["Drama", "Romance"], runtime: 141, releaseDate: "2023-12-08", rating: 8.0 },
  ),
  m(
    "past-lives",
    "Past Lives",
    "/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg",
    "/yE5d3BUhE8hCnkMUJOo1QDoOGNz.jpg",
    "Nora and Hae Sung, two deeply connected childhood friends, are reunited in New York two decades later.",
    { genres: ["Drama", "Romance"], runtime: 105, releaseDate: "2023-06-02", rating: 7.9 },
  ),
  m(
    "civil-war",
    "Civil War",
    "/sh7Rg8Er3tFcN9BpKIPOMvALgZd.jpg",
    "/kZR8FBpq4EKJ8XvbulmvNqoUsCk.jpg",
    "In the near future, journalists travel across a fractured United States during a rapidly-escalating civil war.",
    { genres: ["Action", "Drama"], runtime: 109, releaseDate: "2024-04-12", rating: 7.2 },
  ),
  m(
    "furiosa",
    "Furiosa: A Mad Max Saga",
    "/iADOJ8Zymht2JPMoy3R7xceZprc.jpg",
    "/8hRLwwGhq0nOhaOXCVwjyvvY6QK.jpg",
    "The origin story of renegade warrior Furiosa before her encounter with Mad Max.",
    { genres: ["Action", "Adventure"], runtime: 148, releaseDate: "2024-05-24", rating: 7.6 },
  ),
];

export const SHOWS: MediaItem[] = [
  t(
    "house-of-dragon",
    "House of the Dragon",
    "/z2yahl2uefxDCl0nogcRBstwruJ.jpg",
    "/etj8E2o4Bud7HkLMMcnjSpnrhH1.jpg",
    "The Targaryen dynasty is at the absolute apex of its power, with more than 15 dragons under its yoke.",
    { genres: ["Fantasy", "Drama"], runtime: 60, releaseDate: "2022-08-21", rating: 8.4 },
  ),
  t(
    "the-last-of-us",
    "The Last of Us",
    "/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg",
    "/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg",
    "Twenty years after modern civilization has been destroyed, Joel is hired to smuggle Ellie out of a quarantine zone.",
    { genres: ["Drama", "Sci-Fi"], runtime: 52, releaseDate: "2023-01-15", rating: 8.6 },
  ),
  t(
    "shogun",
    "Shōgun",
    "/7O4iVfOMQmdCSxhOg0cybnQF6bB.jpg",
    "/kMYPryhndm7hDlD9WcYRUuGImmy.jpg",
    "In Japan in the year 1600, at the dawn of a century-defining civil war, Lord Yoshii Toranaga is fighting for his life.",
    { genres: ["Drama", "History"], runtime: 60, releaseDate: "2024-02-27", rating: 8.6 },
  ),
  t(
    "severance",
    "Severance",
    "/lFf6LLrQjYldcZItzOkGmMMigP7.jpg",
    "/oIutmyRXfKPFtNaHydcnLGZ6XwB.jpg",
    "Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives.",
    { genres: ["Sci-Fi", "Thriller"], runtime: 55, releaseDate: "2022-02-18", rating: 8.7 },
  ),
  t(
    "the-bear",
    "The Bear",
    "/zPyHKzr2TmnQEsJPtSPBhFmZUqB.jpg",
    "/tKw3XvNyDCf8N9Gc3q3o0eBEuTM.jpg",
    "A young chef from the fine dining world returns to Chicago to run his late brother's sandwich shop.",
    { genres: ["Drama", "Comedy"], runtime: 30, releaseDate: "2022-06-23", rating: 8.6 },
  ),
  t(
    "arcane",
    "Arcane",
    "/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg",
    "/q8eejQcg1bAqImEV8jh8RtBD4uH.jpg",
    "Amid the stark discord of twin cities Piltover and Zaun, two sisters fight on rival sides.",
    { genres: ["Animation", "Action"], runtime: 45, releaseDate: "2021-11-06", rating: 9.0 },
  ),
  t(
    "3-body-problem",
    "3 Body Problem",
    "/ykY7lPmPZocMWpBEsX5CFHqIfnn.jpg",
    "/yUgDeWFbaDOnwuvUvJ0KLQVQB2H.jpg",
    "A young woman's fateful decision reverberates across space and time into the lives of five brilliant friends.",
    { genres: ["Sci-Fi", "Mystery"], runtime: 60, releaseDate: "2024-03-21", rating: 7.6 },
  ),
  t(
    "true-detective-4",
    "True Detective: Night Country",
    "/6TXLd2gTaPr3EutubvKehSGVQwT.jpg",
    "/gTx1lJ4vGnwjIfoV6ZR6O5oOJUx.jpg",
    "When the long winter night falls in Ennis, Alaska, six men vanish without a trace.",
    { genres: ["Crime", "Mystery"], runtime: 55, releaseDate: "2024-01-14", rating: 7.4 },
  ),
  t(
    "fallout",
    "Fallout",
    "/AnsSKI0qkY5g6iqXtT8gBpJOxLh.jpg",
    "/gYgYaVxSRUyeKNaOZ1x9OrIQqhx.jpg",
    "In a future post-apocalyptic Los Angeles, inhabitants of luxurious fallout shelters return to a violent surface.",
    { genres: ["Sci-Fi", "Drama"], runtime: 60, releaseDate: "2024-04-10", rating: 8.4 },
  ),
  t(
    "the-boys",
    "The Boys",
    "/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg",
    "/mGVrXeIjyecj6TKmwPVpHlscEmw.jpg",
    "A group of vigilantes set out to take down corrupt superheroes who abuse their superpowers.",
    { genres: ["Action", "Sci-Fi"], runtime: 60, releaseDate: "2019-07-26", rating: 8.4 },
  ),
];

// ---------------------------------------------------------------------------
// Enrichment: attach richer metadata (cast, crew, gallery, trailers, reviews,
// production companies, etc.) to every hand-curated title. Uses deterministic
// seeded pseudo-random values so refreshes stay stable.
// ---------------------------------------------------------------------------

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
function seeded(seed: string) {
  let s = hash(seed);
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822507);
    s = Math.imul(s ^ (s >>> 13), 3266489909);
    return ((s ^ (s >>> 16)) >>> 0) / 4294967296;
  };
}
function pick<T>(rand: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function pickMany<T>(rand: () => number, arr: readonly T[], n: number): T[] {
  const c = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && c.length; i++) {
    out.push(c.splice(Math.floor(rand() * c.length), 1)[0]);
  }
  return out;
}

const FIRST_NAMES = ["Alex","Maya","Jordan","Rowan","Sofia","Kai","Leo","Nina","Owen","Priya","Ryu","Sana","Theo","Yuki","Zara","Ethan","Mia","Noah","Lila","Ivan","Ada","Ren","Lex","Iris","Cass","Milo","Nova","Rhea","Jules","Ben"];
const LAST_NAMES = ["Vance","Kim","Ito","Reyes","Okafor","Lang","Marlowe","Voss","Rhee","Fox","Chen","Petrov","Silva","Bekova","Osei","Hart","Nakamura","Delacroix","Torres","Aoki"];
function personName(rand: () => number) {
  return `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`;
}

const DIRECTORS = ["Denis Villeneuve","Christopher Nolan","Greta Gerwig","Bong Joon-ho","Chloé Zhao","Ari Aster","Jane Campion","Ryan Coogler","Céline Sciamma","Alfonso Cuarón"];
const WRITERS = ["Charlie Kaufman","Aaron Sorkin","Emerald Fennell","Phoebe Waller-Bridge","Taika Waititi","Jesse Armstrong","Sarah Polley","Tony Gilroy"];
const COMPANIES: ProductionCompany[] = [
  { id: "lumen-pictures", name: "Lumen Pictures", country: "US" },
  { id: "aurora-studios", name: "Aurora Studios", country: "US" },
  { id: "meridian-films", name: "Meridian Films", country: "GB" },
  { id: "koto-works", name: "Koto Works", country: "JP" },
  { id: "nordlys", name: "Nordlys Media", country: "SE" },
  { id: "solstice", name: "Solstice Entertainment", country: "US" },
];
const NETWORKS = ["Lumen+","Aurora","Meridian","Koto","Solstice Streaming"];
const AGE_RATINGS: AgeRating[] = ["PG","PG-13","R","TV-14","TV-MA"];
const LANGS: Language[] = ["English","Japanese","Korean","Spanish","French","German","Italian"];
const QUALITIES = ["4K UHD","HDR10","Dolby Vision","Dolby Atmos","1080p HD"];

function makeTrailers(seed: string, rand: () => number): Trailer[] {
  return Array.from({ length: 1 + Math.floor(rand() * 2) }).map((_, i) => ({
    id: `${seed}-trailer-${i}`,
    title: i === 0 ? "Official Trailer" : "Teaser",
    thumbnail: still(`${seed}-tr-${i}`),
    url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    duration: 90 + Math.floor(rand() * 120),
  }));
}
function makeReviews(seed: string, rand: () => number): Review[] {
  const templates = [
    "A masterclass in tension and craft — every frame earns its place.",
    "Ambitious, occasionally uneven, but impossible to look away from.",
    "One of the year's most quietly devastating pieces of storytelling.",
    "Feels engineered to be a modern classic — and it mostly succeeds.",
    "A slow burn that rewards patience with a truly cathartic finale.",
  ];
  return Array.from({ length: 3 + Math.floor(rand() * 3) }).map((_, i) => ({
    id: `${seed}-rev-${i}`,
    author: personName(rand),
    avatar: avatar(`${seed}-rev-${i}`),
    rating: 6 + Math.round(rand() * 40) / 10,
    createdAt: new Date(2024, Math.floor(rand() * 11), 1 + Math.floor(rand() * 27)).toISOString(),
    content: pick(rand, templates),
  }));
}
function makeGallery(seed: string, rand: () => number): string[] {
  return Array.from({ length: 6 + Math.floor(rand() * 4) }).map((_, i) => still(`${seed}-g-${i}`));
}
function makeCrew(seed: string, rand: () => number): CrewMember[] {
  const roles = [
    { role: "Director of Photography", department: "Camera" },
    { role: "Editor", department: "Editing" },
    { role: "Production Designer", department: "Art" },
    { role: "Costume Designer", department: "Costume" },
    { role: "Composer", department: "Sound" },
  ];
  return roles.map((r, i) => ({
    id: `${seed}-crew-${i}`,
    name: personName(rand),
    role: r.role,
    department: r.department,
    photo: avatar(`${seed}-crew-${i}`),
  }));
}
function ensureCast(seed: string, existing: MediaItem["cast"], rand: () => number): CastMember[] {
  const characters = ["The Warden","Ada","Kestrel","Mira","Silas","Yona","Ruben","Ines","Toma","Bex"];
  const base: CastMember[] = existing.length ? (existing as CastMember[]) : Array.from({ length: 6 }).map((_, i) => ({
    id: `${seed}-cast-${i}`,
    name: personName(rand),
  } as CastMember));
  return base.map((c, i) => ({
    ...c,
    character: (c as CastMember).character ?? characters[i % characters.length],
    photo: (c as CastMember).photo ?? avatar(`${c.id}-${seed}`),
  }));
}

function enrichMovie(item: MediaItem): MediaItem {
  const rand = seeded(item.id);
  return {
    ...item,
    ageRating: item.ageRating ?? pick(rand, AGE_RATINGS.slice(0, 3)),
    status: "Released",
    originalLanguage: "English",
    spokenLanguages: pickMany(rand, LANGS, 2),
    budget: 20_000_000 + Math.floor(rand() * 220_000_000),
    revenue: 50_000_000 + Math.floor(rand() * 900_000_000),
    director: pick(rand, DIRECTORS),
    writers: pickMany(rand, WRITERS, 2),
    productionCompanies: pickMany(rand, COMPANIES, 2),
    crew: makeCrew(item.id, rand),
    gallery: makeGallery(item.id, rand),
    trailers: makeTrailers(item.id, rand),
    reviews: makeReviews(item.id, rand),
    qualities: pickMany(rand, QUALITIES, 3),
    cast: ensureCast(item.id, item.cast, rand),
  };
}

function makeSeasons(showId: string, rand: () => number, count: number, epRuntime: number): Season[] {
  return Array.from({ length: count }).map((_, sIdx) => {
    const seasonNumber = sIdx + 1;
    const epCount = 6 + Math.floor(rand() * 5);
    const airYear = 2020 + Math.floor(rand() * 5);
    const episodes: Episode[] = Array.from({ length: epCount }).map((_, eIdx) => {
      const epNum = eIdx + 1;
      return {
        id: `${showId}-s${seasonNumber}e${epNum}`,
        showId,
        seasonNumber,
        episodeNumber: epNum,
        title: EPISODE_TITLES[Math.floor(rand() * EPISODE_TITLES.length)],
        overview: "Alliances fracture, secrets surface, and the past refuses to stay buried as the season builds toward a reckoning.",
        runtime: epRuntime,
        airDate: new Date(airYear, sIdx, epNum * 3).toISOString().slice(0, 10),
        still: still(`${showId}-s${seasonNumber}e${epNum}`),
        rating: 7 + Math.round(rand() * 25) / 10,
        progress: sIdx === 0 && eIdx < 2 ? Math.round(rand() * 90) / 100 : undefined,
      };
    });
    return {
      id: `${showId}-s${seasonNumber}`,
      showId,
      seasonNumber,
      name: `Season ${seasonNumber}`,
      overview: "A new chapter deepens the mythology and raises the stakes for everyone.",
      poster: poster(`${showId}-s${seasonNumber}`),
      airDate: `${airYear}-0${1 + Math.floor(rand() * 8)}-01`,
      episodes,
    };
  });
}

const EPISODE_TITLES = [
  "Pilot","Reckoning","The Long Night","Ashes","Homecoming","The Cartographer","Blood & Silk","Vespers","Undertow","The Last Signal","North of Nowhere","Bright Wire","The Quiet Room","Threshold","Winter's Edge","Salt","The Hollow Crown","Prism","Aria","Sunrise",
];

function enrichShow(item: MediaItem): MediaItem {
  const rand = seeded(item.id);
  const seasonCount = 2 + Math.floor(rand() * 4);
  const seasons = makeSeasons(item.id, rand, seasonCount, item.runtime);
  const totalEps = seasons.reduce((n, s) => n + s.episodes.length, 0);
  const firstYear = 2018 + Math.floor(rand() * 5);
  return {
    ...item,
    ageRating: item.ageRating ?? pick(rand, ["TV-14","TV-MA"] as const),
    status: pick(rand, ["Returning Series","Ended"] as const),
    originalLanguage: "English",
    spokenLanguages: pickMany(rand, LANGS, 2),
    network: pick(rand, NETWORKS),
    firstAirDate: `${firstYear}-0${1 + Math.floor(rand() * 8)}-01`,
    lastAirDate: `${firstYear + seasonCount}-0${1 + Math.floor(rand() * 8)}-01`,
    numberOfSeasons: seasonCount,
    numberOfEpisodes: totalEps,
    seasons,
    director: pick(rand, DIRECTORS),
    writers: pickMany(rand, WRITERS, 2),
    productionCompanies: pickMany(rand, COMPANIES, 2),
    crew: makeCrew(item.id, rand),
    gallery: makeGallery(item.id, rand),
    trailers: makeTrailers(item.id, rand),
    reviews: makeReviews(item.id, rand),
    qualities: pickMany(rand, QUALITIES, 3),
    cast: ensureCast(item.id, item.cast, rand),
  };
}

// ---------------------------------------------------------------------------
// Procedural fill: expand catalogue to ≥100 movies and ≥60 shows.
// Titles are composed from evocative fragments; ids stay stable.
// ---------------------------------------------------------------------------
const TITLE_A = ["Silent","Northern","Crimson","Hollow","Bright","Broken","Distant","Last","Golden","Neon","Velvet","Iron","Winter","Summer","Midnight","Paper","Salt","Ghost","Blue","Silver"];
const TITLE_N = ["Cartographer","River","Signal","Kingdom","Harbor","Season","Empire","Hour","Machine","Tide","Chapel","Circuit","Country","Requiem","Threshold","Ledger","Lantern","Meridian","Compass","Bloom"];
const GENRE_NAMES = ["Action","Drama","Sci-Fi","Comedy","Romance","Thriller","Animation","Horror","Documentary","Fantasy","Mystery","Adventure"] as const;

function generateExtras(kind: "movie" | "tv", target: number, existing: MediaItem[]): MediaItem[] {
  const out: MediaItem[] = [];
  const need = Math.max(0, target - existing.length);
  for (let i = 0; i < need; i++) {
    const rand = seeded(`${kind}-extra-${i}`);
    const title = `${pick(rand, TITLE_A)} ${pick(rand, TITLE_N)}${rand() > 0.7 ? " " + (2 + Math.floor(rand() * 3)) : ""}`;
    const id = `${kind}-${i.toString().padStart(3, "0")}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const gs = pickMany(rand, GENRE_NAMES, 2);
    const releaseYear = 2015 + Math.floor(rand() * 10);
    const base: MediaItem = {
      id,
      kind,
      title,
      poster: poster(id),
      backdrop: backdrop(id),
      overview:
        "Against a backdrop of quiet dread and shifting loyalties, a lone figure confronts the machinery of a world that no longer makes room for them.",
      genres: gs,
      runtime: kind === "tv" ? 45 + Math.floor(rand() * 20) : 95 + Math.floor(rand() * 60),
      releaseDate: `${releaseYear}-0${1 + Math.floor(rand() * 8)}-${10 + Math.floor(rand() * 18)}`,
      rating: 6.2 + Math.round(rand() * 32) / 10,
      cast: [],
      tagline: pick(rand, ["Every ending begins somewhere.","Nothing burns quite like the truth.","Some silences are louder than screams.","The distance between us is a country."]),
    };
    out.push(kind === "tv" ? enrichShow(base) : enrichMovie(base));
  }
  return out;
}

const CURATED_MOVIES = MOVIES.map(enrichMovie);
const CURATED_SHOWS = SHOWS.map(enrichShow);
const EXTRA_MOVIES = generateExtras("movie", 100, CURATED_MOVIES);
const EXTRA_SHOWS = generateExtras("tv", 60, CURATED_SHOWS);

// Overwrite the exported arrays so importers get the enriched catalogue.
// (These re-assignments are safe: MOVIES/SHOWS are `let`-style const arrays of
// objects, so we mutate their contents in place.)
MOVIES.length = 0; MOVIES.push(...CURATED_MOVIES, ...EXTRA_MOVIES);
SHOWS.length = 0; SHOWS.push(...CURATED_SHOWS, ...EXTRA_SHOWS);

export const ALL_MEDIA: MediaItem[] = [...MOVIES, ...SHOWS];

export const HERO_ITEMS: MediaItem[] = [
  MOVIES[0], // Dune 2
  SHOWS[2], // Shogun
  MOVIES[7], // Spider-Verse
  SHOWS[1], // Last of Us
  MOVIES[11], // Furiosa
];

export const GENRES: Genre[] = [
  { id: "action", name: "Action", gradient: "linear-gradient(135deg,#ef4444,#f97316)" },
  { id: "drama", name: "Drama", gradient: "linear-gradient(135deg,#8b5cf6,#6366f1)" },
  { id: "scifi", name: "Sci-Fi", gradient: "linear-gradient(135deg,#06b6d4,#3b82f6)" },
  { id: "comedy", name: "Comedy", gradient: "linear-gradient(135deg,#f59e0b,#ec4899)" },
  { id: "romance", name: "Romance", gradient: "linear-gradient(135deg,#ec4899,#f43f5e)" },
  { id: "thriller", name: "Thriller", gradient: "linear-gradient(135deg,#0f172a,#7c3aed)" },
  { id: "animation", name: "Animation", gradient: "linear-gradient(135deg,#10b981,#06b6d4)" },
  { id: "horror", name: "Horror", gradient: "linear-gradient(135deg,#111827,#ef4444)" },
  { id: "documentary", name: "Documentary", gradient: "linear-gradient(135deg,#64748b,#0ea5e9)" },
  { id: "fantasy", name: "Fantasy", gradient: "linear-gradient(135deg,#a855f7,#6366f1)" },
  { id: "mystery", name: "Mystery", gradient: "linear-gradient(135deg,#1e293b,#0ea5e9)" },
  { id: "adventure", name: "Adventure", gradient: "linear-gradient(135deg,#f97316,#eab308)" },
];

export const COLLECTIONS: Collection[] = [
  {
    id: "oscar-winners",
    title: "Oscar Winners",
    subtitle: "Best Picture across the years",
    cover: MOVIES[1].backdrop,
    itemIds: ["oppenheimer", "everything-everywhere", "poor-things"],
  },
  {
    id: "mind-benders",
    title: "Mind-bending Sci-Fi",
    subtitle: "Reality is negotiable",
    cover: MOVIES[2].backdrop,
    itemIds: ["interstellar", "inception", "blade-runner-2049", "severance"],
  },
  {
    id: "prestige-tv",
    title: "Prestige TV",
    subtitle: "Television at its finest",
    cover: SHOWS[2].backdrop,
    itemIds: ["shogun", "severance", "the-bear", "the-last-of-us"],
  },
  {
    id: "date-night",
    title: "Date Night",
    subtitle: "Curated to make sparks fly",
    cover: MOVIES[9].backdrop,
    itemIds: ["past-lives", "poor-things", "everything-everywhere"],
  },
];

/** Compose the home rails. */
export const HOME_ROWS: MediaRow[] = [
  { id: "trending", title: "Trending Now", subtitle: "What everyone is watching", items: [MOVIES[0], SHOWS[2], MOVIES[8], SHOWS[8], MOVIES[11], SHOWS[3], MOVIES[7]] },
  { id: "popular-movies", title: "Popular Movies", items: [MOVIES[0], MOVIES[1], MOVIES[4], MOVIES[7], MOVIES[6], MOVIES[3], MOVIES[10]] },
  { id: "popular-tv", title: "Popular TV Shows", items: [SHOWS[0], SHOWS[1], SHOWS[2], SHOWS[3], SHOWS[4], SHOWS[8], SHOWS[9]] },
  { id: "top-rated", title: "Top Rated", items: [SHOWS[5], MOVIES[6], SHOWS[3], MOVIES[2], MOVIES[7], SHOWS[4]] },
  { id: "latest", title: "Latest Releases", items: [MOVIES[10], MOVIES[11], SHOWS[6], SHOWS[8], MOVIES[0]] },
  { id: "anime", title: "Anime & Animation", items: [MOVIES[7], SHOWS[5]] },
  { id: "recommended", title: "Recommended For You", items: [MOVIES[5], SHOWS[4], MOVIES[9], SHOWS[3], MOVIES[2]] },
  { id: "continue", title: "Continue Watching", subtitle: "Pick up where you left off", items: [SHOWS[2], MOVIES[0], SHOWS[3]] },
  { id: "recent", title: "Recently Added", items: [MOVIES[11], SHOWS[6], MOVIES[10], SHOWS[8]] },
];

export const TRENDING_SEARCHES = [
  "Dune Part Two",
  "Shōgun",
  "The Last of Us",
  "Furiosa",
  "Severance",
  "Fallout",
  "Oppenheimer",
  "Arcane",
];

export function searchMedia(q: string): MediaItem[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return ALL_MEDIA.filter(
    (it) =>
      it.title.toLowerCase().includes(s) ||
      it.genres.some((g) => g.toLowerCase().includes(s)) ||
      it.overview.toLowerCase().includes(s),
  ).slice(0, 24);
}