export type SportMatch = {
  id: string

  sport: 'football'

  leagueId: string
  leagueCode: string

  home: string
  away: string

  homeLogo?: string
  awayLogo?: string

  homeScore: number | null
  awayScore: number | null

  status: string
  statusText: string

  state: string
  completed: boolean

  time: string

  competition: string
  competitionLogo?: string

  url?: string
}

export type FootballLeague = {
  id: string
  code: string
  name: string
  country: string
  icon: string
  priority: number
}

type EspnTeam = {
  id?: string
  displayName?: string
  shortDisplayName?: string
  name?: string
  logo?: string
}

type EspnCompetitor = {
  homeAway?: 'home' | 'away'
  team?: EspnTeam
  score?: string | number
}

type EspnStatusType = {
  name?: string
  state?: string
  completed?: boolean
  description?: string
  detail?: string
  shortDetail?: string
}

type EspnCompetition = {
  date?: string

  competitors?: EspnCompetitor[]

  status?: {
    type?: EspnStatusType
  }
}

type EspnEvent = {
  id?: string

  date?: string

  status?: {
    type?: EspnStatusType
  }

  competitions?: EspnCompetition[]

  links?: Array<{
    href?: string
  }>
}

type EspnScoreboardResponse = {
  events?: EspnEvent[]

  leagues?: Array<{
    logos?: Array<{
      href?: string
    }>
  }>
}

/* =========================================================
   CHATTODOO LEAGUES
========================================================= */

export const FOOTBALL_LEAGUES: FootballLeague[] = [
  {
    id: 'premier-league',
    code: 'eng.1',
    name: 'Premier League',
    country: 'England',
    icon: '🏴',
    priority: 1,
  },

  {
    id: 'la-liga',
    code: 'esp.1',
    name: 'La Liga',
    country: 'Spain',
    icon: '🇪🇸',
    priority: 2,
  },

  {
    id: 'champions-league',
    code: 'uefa.champions',
    name: 'UEFA Champions League',
    country: 'Europe',
    icon: '⭐',
    priority: 3,
  },

  {
    id: 'serie-a',
    code: 'ita.1',
    name: 'Serie A',
    country: 'Italy',
    icon: '🇮🇹',
    priority: 4,
  },

  {
    id: 'bundesliga',
    code: 'ger.1',
    name: 'Bundesliga',
    country: 'Germany',
    icon: '🇩🇪',
    priority: 5,
  },

  {
    id: 'ligue-1',
    code: 'fra.1',
    name: 'Ligue 1',
    country: 'France',
    icon: '🇫🇷',
    priority: 6,
  },
]

const ESPN_BASE =
  'https://site.api.espn.com/apis/site/v2/sports/soccer'

const DAY_MS =
  24 * 60 * 60 * 1000

/* =========================================================
   DATE HELPERS
========================================================= */

function formatEspnDate(
  date: Date,
) {
  const year =
    date.getUTCFullYear()

  const month =
    String(
      date.getUTCMonth() + 1,
    ).padStart(2, '0')

  const day =
    String(
      date.getUTCDate(),
    ).padStart(2, '0')

  return `${year}${month}${day}`
}

function getCurrentWindow() {
  const now =
    new Date()

  const from =
    new Date(
      now.getTime() -
        2 * DAY_MS,
    )

  const to =
    new Date(
      now.getTime() +
        7 * DAY_MS,
    )

  return {
    from:
      formatEspnDate(from),

    to:
      formatEspnDate(to),
  }
}

function getSeasonWindow() {
  /*
   * Current European season:
   * July 1 2026 → June 30 2027
   */

  return {
    from: '20260701',
    to: '20270630',
  }
}

/* =========================================================
   SCORE
========================================================= */

function convertScore(
  value:
    | string
    | number
    | undefined,
): number | null {
  if (
    value === undefined ||
    value === ''
  ) {
    return null
  }

  const number =
    Number(value)

  return Number.isNaN(number)
    ? null
    : number
}

/* =========================================================
   STATUS
========================================================= */

function getStatusType(
  event: EspnEvent,
) {
  return (
    event.status?.type ??
    event.competitions?.[0]
      ?.status?.type ??
    {}
  )
}

function getStatusText(
  event: EspnEvent,
) {
  const status =
    getStatusType(event)

  return (
    status.shortDetail ??
    status.detail ??
    status.description ??
    status.name ??
    ''
  )
}

function getCompetitor(
  competition: EspnCompetition,
  side:
    | 'home'
    | 'away',
) {
  return (
    competition.competitors ??
    []
  ).find(
    (item) =>
      item.homeAway === side,
  )
}

/* =========================================================
   CONVERT
========================================================= */

function convertEvent(
  event: EspnEvent,
  league: FootballLeague,
  leagueLogo?: string,
): SportMatch | null {
  const competition =
    event.competitions?.[0]

  if (!competition) {
    return null
  }

  const home =
    getCompetitor(
      competition,
      'home',
    )

  const away =
    getCompetitor(
      competition,
      'away',
    )

  if (
    !home?.team ||
    !away?.team
  ) {
    return null
  }

  const homeName =
    home.team.displayName ??
    home.team.shortDisplayName ??
    home.team.name ??
    'Home Team'

  const awayName =
    away.team.displayName ??
    away.team.shortDisplayName ??
    away.team.name ??
    'Away Team'

  const time =
    event.date ??
    competition.date ??
    ''

  if (!time) {
    return null
  }

  return {
    id:
      event.id ??
      `${league.code}-${homeName}-${awayName}-${time}`,

    sport:
      'football',

    leagueId:
      league.id,

    leagueCode:
      league.code,

    home:
      homeName,

    away:
      awayName,

    homeLogo:
      home.team.logo,

    awayLogo:
      away.team.logo,

    homeScore:
      convertScore(
        home.score,
      ),

    awayScore:
      convertScore(
        away.score,
      ),

    status:
      getStatusType(
        event,
      ).name ?? '',

    statusText:
      getStatusText(
        event,
      ),

    state:
      getStatusType(
        event,
      ).state ?? '',

    completed:
      Boolean(
        getStatusType(
          event,
        ).completed,
      ),

    time,

    competition:
      league.name,

    competitionLogo:
      leagueLogo,

    url:
      event.links?.[0]
        ?.href,
  }
}

/* =========================================================
   ESPN FETCH HELPERS
========================================================= */

async function fetchEspnScoreboard(
  league: FootballLeague,
  url: string,
): Promise<SportMatch[]> {
  const response =
    await fetch(
      url,
      {
        cache: 'no-store',
      },
    )

  if (!response.ok) {
    throw new Error(
      `${league.name} request failed: ${response.status}`,
    )
  }

  const data:
    EspnScoreboardResponse =
    await response.json()

  const leagueLogo =
    data.leagues?.[0]
      ?.logos?.[0]
      ?.href

  return (
    data.events ?? []
  )
    .map(
      (event) =>
        convertEvent(
          event,
          league,
          leagueLogo,
        ),
    )
    .filter(
      (
        match,
      ): match is SportMatch =>
        match !== null,
    )
}

/*
 * IMPORTANT:
 *
 * This endpoint intentionally has NO dates parameter.
 * ESPN's current scoreboard is the freshest source for
 * matches that are live right now.
 */
async function fetchLeagueCurrent(
  league: FootballLeague,
): Promise<SportMatch[]> {
  const url =
    `${ESPN_BASE}/${league.code}/scoreboard` +
    `?limit=1000`

  return fetchEspnScoreboard(
    league,
    url,
  )
}

/*
 * Used for recent results + upcoming fixtures.
 */
async function fetchLeagueRange(
  league: FootballLeague,
  from: string,
  to: string,
): Promise<SportMatch[]> {
  const url =
    `${ESPN_BASE}/${league.code}/scoreboard` +
    `?limit=1000` +
    `&dates=${from}-${to}`

  return fetchEspnScoreboard(
    league,
    url,
  )
}

/*
 * Merge by ESPN event id.
 *
 * Window matches are inserted first.
 * Current scoreboard matches are inserted second,
 * so LIVE/current score + status information wins.
 */
function mergeMatches(
  windowMatches: SportMatch[],
  currentMatches: SportMatch[],
): SportMatch[] {
  const map =
    new Map<
      string,
      SportMatch
    >()

  for (
    const match of
      windowMatches
  ) {
    map.set(
      match.id,
      match,
    )
  }

  for (
    const match of
      currentMatches
  ) {
    const existing =
      map.get(
        match.id,
      )

    map.set(
      match.id,
      existing
        ? {
            ...existing,
            ...match,

            /*
             * Prefer a real score from either source.
             */
            homeScore:
              match.homeScore ??
              existing.homeScore,

            awayScore:
              match.awayScore ??
              existing.awayScore,
          }
        : match,
    )
  }

  return Array.from(
    map.values(),
  )
}

/*
 * Fetch both sources for one league.
 *
 * This is the core live-score fix:
 *
 *   current scoreboard (no dates)
 *             +
 *   recent/upcoming date window
 *             ↓
 *          merged feed
 */
async function fetchLeagueCurrentWindow(
  league: FootballLeague,
  from: string,
  to: string,
): Promise<SportMatch[]> {
  const [
    currentResult,
    windowResult,
  ] =
    await Promise.allSettled([
      fetchLeagueCurrent(
        league,
      ),

      fetchLeagueRange(
        league,
        from,
        to,
      ),
    ])

  const currentMatches =
    currentResult.status ===
    'fulfilled'
      ? currentResult.value
      : []

  const windowMatches =
    windowResult.status ===
    'fulfilled'
      ? windowResult.value
      : []

  if (
    currentResult.status ===
    'rejected'
  ) {
    console.error(
      `${league.name} current scoreboard failed:`,
      currentResult.reason,
    )
  }

  if (
    windowResult.status ===
    'rejected'
  ) {
    console.error(
      `${league.name} date-window scoreboard failed:`,
      windowResult.reason,
    )
  }

  if (
    currentMatches.length ===
      0 &&
    windowMatches.length ===
      0
  ) {
    throw new Error(
      `${league.name} returned no scoreboard data.`,
    )
  }

  return mergeMatches(
    windowMatches,
    currentMatches,
  )
}

/* =========================================================
   STATUS HELPERS
========================================================= */

export function isLiveMatch(
  match: SportMatch,
) {
  const state =
    match.state
      .trim()
      .toLowerCase()

  /*
   * ESPN's canonical live state.
   */
  if (
    state === 'in' ||
    state === 'live'
  ) {
    return true
  }

  const status =
    `${match.status} ${match.statusText}`
      .toLowerCase()

  /*
   * Fallbacks for unusual ESPN competition states.
   */
  return (
    status.includes('live') ||
    status.includes('in progress') ||
    status.includes('in_progress') ||
    status.includes('in-progress') ||
    status.includes('in play') ||
    status.includes('in-play') ||
    status.includes('status_in_progress') ||
    status.includes('halftime') ||
    status.includes('half time') ||
    status.includes('1st half') ||
    status.includes('2nd half') ||
    status.includes('extra time') ||
    status.includes('penalties')
  )
}

export function isFinishedMatch(
  match: SportMatch,
) {
  const state =
    match.state
      .trim()
      .toLowerCase()

  if (
    match.completed ||
    state === 'post'
  ) {
    return true
  }

  const status =
    `${match.status} ${match.statusText}`
      .toLowerCase()

  return (
    status.includes('final') ||
    status.includes('finished') ||
    status.includes('full time') ||
    status.includes('fulltime') ||
    status.includes('status_final') ||
    status.includes('post')
  )
}

export function isUpcomingMatch(
  match: SportMatch,
) {
  if (
    isLiveMatch(match) ||
    isFinishedMatch(match)
  ) {
    return false
  }

  const state =
    match.state
      .trim()
      .toLowerCase()

  /*
   * ESPN's canonical pre-match state.
   */
  if (
    state === 'pre'
  ) {
    return true
  }

  const time =
    new Date(
      match.time,
    ).getTime()

  return (
    !Number.isNaN(time) &&
    time > Date.now()
  )
}

export function isRecentMatch(
  match: SportMatch,
) {
  if (
    !isFinishedMatch(match)
  ) {
    return false
  }

  const time =
    new Date(
      match.time,
    ).getTime()

  if (
    Number.isNaN(time)
  ) {
    return false
  }

  return (
    time >=
    Date.now() -
      2 * DAY_MS
  )
}

/* =========================================================
   CURRENT WINDOW

   Used by /sports.
========================================================= */

let cachedCurrent:
  SportMatch[] | null =
    null

let cachedCurrentAt =
  0

export async function getFootballMatches(): Promise<
  SportMatch[]
> {
  if (
    cachedCurrent &&
    Date.now() -
      cachedCurrentAt <
      30_000
  ) {
    return cachedCurrent
  }

  const {
    from,
    to,
  } =
    getCurrentWindow()

  const results =
    await Promise.allSettled(
      FOOTBALL_LEAGUES.map(
        (league) =>
          fetchLeagueCurrentWindow(
            league,
            from,
            to,
          ),
      ),
    )

  const matches =
    results.flatMap(
      (
        result,
        index,
      ) => {
        if (
          result.status ===
          'fulfilled'
        ) {
          return result.value
        }

        console.error(
          `Failed ${FOOTBALL_LEAGUES[index].name}:`,
          result.reason,
        )

        return []
      },
    )

  /*
   * Extra safety:
   * dedupe globally by ESPN event id.
   */
  const unique =
    Array.from(
      new Map(
        matches.map(
          (match) => [
            match.id,
            match,
          ],
        ),
      ).values(),
    )

  cachedCurrent =
    unique

  cachedCurrentAt =
    Date.now()

  return unique
}

/* =========================================================
   ONE LEAGUE - CURRENT WINDOW
========================================================= */

export async function getLeagueMatches(
  leagueId: string,
): Promise<
  SportMatch[]
> {
  const league =
    FOOTBALL_LEAGUES.find(
      (item) =>
        item.id ===
        leagueId,
    )

  if (!league) {
    throw new Error(
      'League not found.',
    )
  }

  const {
    from,
    to,
  } =
    getCurrentWindow()

  return fetchLeagueCurrentWindow(
    league,
    from,
    to,
  )
}

/* =========================================================
   WHOLE CURRENT SEASON

   Used on league hub.

   Finished + live + upcoming.
========================================================= */

export async function getLeagueSeasonMatches(
  leagueId: string,
): Promise<
  SportMatch[]
> {
  const league =
    FOOTBALL_LEAGUES.find(
      (item) =>
        item.id ===
        leagueId,
    )

  if (!league) {
    throw new Error(
      'League not found.',
    )
  }

  const {
    from,
    to,
  } =
    getSeasonWindow()

  const matches =
    await fetchLeagueRange(
      league,
      from,
      to,
    )

  return matches.sort(
    (a, b) =>
      new Date(
        a.time,
      ).getTime() -
      new Date(
        b.time,
      ).getTime(),
  )
}

/* =========================================================
   GROUP MATCHES BY LEAGUE
========================================================= */

export async function getMatchesGroupedByLeague() {
  const matches =
    await getFootballMatches()

  return FOOTBALL_LEAGUES.map(
    (league) => ({
      league,

      matches:
        matches.filter(
          (match) =>
            match.leagueId ===
            league.id,
        ),
    }),
  )
}

/* =========================================================
   SEARCH
========================================================= */

export async function searchTeamMatches(
  query: string,
) {
  const value =
    query
      .trim()
      .toLowerCase()

  if (!value) {
    return []
  }

  const matches =
    await getFootballMatches()

  return matches.filter(
    (match) =>
      [
        match.home,
        match.away,
        match.competition,
      ]
        .join(' ')
        .toLowerCase()
        .includes(value),
  )
}

/* =========================================================
   SINGLE MATCH
========================================================= */

export async function getMatch(
  sport: string,
  matchId: string,
): Promise<
  SportMatch
> {
  if (
    sport.toLowerCase() !==
    'football'
  ) {
    throw new Error(
      'Only football is supported.',
    )
  }

  const decoded =
    decodeURIComponent(
      matchId,
    )

  /*
   * Search current window first.
   */

  const current =
    await getFootballMatches()

  const currentMatch =
    current.find(
      (match) =>
        match.id === decoded,
    )

  if (currentMatch) {
    return currentMatch
  }

  /*
   * Fallback to each league's
   * full season.
   */

  for (
    const league of
      FOOTBALL_LEAGUES
  ) {
    try {
      const season =
        await getLeagueSeasonMatches(
          league.id,
        )

      const found =
        season.find(
          (match) =>
            match.id ===
            decoded,
        )

      if (found) {
        return found
      }
    } catch {
      // keep trying leagues
    }
  }

  throw new Error(
    'Match not found.',
  )
}

/* =========================================================
   BACKWARDS COMPATIBILITY
========================================================= */

export async function getMatches(
  sport = 'football',
) {
  if (
    sport.toLowerCase() !==
    'football'
  ) {
    return []
  }

  return getFootballMatches()
}

export async function getMajorMatches(
  sport = 'football',
) {
  return getMatches(
    sport,
  )
}

export type SportsMatch =
  SportMatch