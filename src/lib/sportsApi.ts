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

  state: 'pre' | 'in' | 'post' | string
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
  id?: string
  name?: string
  state?: string
  completed?: boolean
  description?: string
  detail?: string
  shortDetail?: string
}

type EspnCompetition = {
  id?: string
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
  return {
    from: '20260701',
    to: '20270630',
  }
}

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

/*
 * Prefer competition.status first.
 *
 * ESPN's competition object contains the
 * live clock/state used by the scoreboard.
 */
function getStatusType(
  event: EspnEvent,
): EspnStatusType {
  return (
    event.competitions?.[0]
      ?.status?.type ??
    event.status?.type ??
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

  const status =
    getStatusType(event)

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
    competition.date ??
    event.date ??
    ''

  if (!time) {
    return null
  }

  return {
    id:
      event.id ??
      competition.id ??
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
      status.name ?? '',

    statusText:
      getStatusText(
        event,
      ),

    state:
      status.state ?? '',

    completed:
      Boolean(
        status.completed,
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

async function fetchScoreboard(
  league: FootballLeague,
  query = '',
): Promise<SportMatch[]> {
  /*
   * Cache-buster is intentional.
   * We want fresh live score/status data.
   */
  const separator =
    query
      ? '&'
      : '?'

  const url =
    `${ESPN_BASE}/${league.code}/scoreboard` +
    query +
    `${separator}_=${Date.now()}`

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
 * Most important request for live matches.
 *
 * NO date filter.
 */
async function fetchLeagueLiveFeed(
  league: FootballLeague,
) {
  return fetchScoreboard(
    league,
    '?limit=1000',
  )
}

async function fetchLeagueDateRange(
  league: FootballLeague,
  from: string,
  to: string,
) {
  return fetchScoreboard(
    league,
    `?limit=1000&dates=${from}-${to}`,
  )
}

function mergeMatches(
  dateMatches: SportMatch[],
  liveMatches: SportMatch[],
) {
  const byId =
    new Map<
      string,
      SportMatch
    >()

  for (
    const match of
      dateMatches
  ) {
    byId.set(
      match.id,
      match,
    )
  }

  /*
   * Insert live feed last so its latest
   * score/status overwrites stale schedule data.
   */
  for (
    const live of
      liveMatches
  ) {
    const previous =
      byId.get(
        live.id,
      )

    byId.set(
      live.id,
      previous
        ? {
            ...previous,
            ...live,
            homeScore:
              live.homeScore ??
              previous.homeScore,
            awayScore:
              live.awayScore ??
              previous.awayScore,
          }
        : live,
    )
  }

  return Array.from(
    byId.values(),
  )
}

async function fetchLeagueCurrentWindow(
  league: FootballLeague,
  from: string,
  to: string,
) {
  const [
    liveResult,
    dateResult,
  ] =
    await Promise.allSettled([
      fetchLeagueLiveFeed(
        league,
      ),

      fetchLeagueDateRange(
        league,
        from,
        to,
      ),
    ])

  const liveMatches =
    liveResult.status ===
    'fulfilled'
      ? liveResult.value
      : []

  const dateMatches =
    dateResult.status ===
    'fulfilled'
      ? dateResult.value
      : []

  if (
    liveResult.status ===
    'rejected'
  ) {
    console.error(
      `${league.name} live scoreboard failed:`,
      liveResult.reason,
    )
  }

  if (
    dateResult.status ===
    'rejected'
  ) {
    console.error(
      `${league.name} date scoreboard failed:`,
      dateResult.reason,
    )
  }

  const merged =
    mergeMatches(
      dateMatches,
      liveMatches,
    )

  /*
   * Useful while we validate production.
   */
  console.table(
    merged.map(
      (match) => ({
        league:
          match.competition,
        home:
          match.home,
        away:
          match.away,
        score:
          `${match.homeScore ?? '-'}-${match.awayScore ?? '-'}`,
        state:
          match.state,
        status:
          match.status,
        statusText:
          match.statusText,
        live:
          isLiveMatch(
            match,
          ),
      }),
    ),
  )

  return merged
}

export function isLiveMatch(
  match: SportMatch,
) {
  const state =
    match.state
      .trim()
      .toLowerCase()

  if (
    state === 'in' ||
    state === 'live'
  ) {
    return true
  }

  const status =
    `${match.status} ${match.statusText}`
      .toLowerCase()

  return (
    status.includes(
      'status_in_progress',
    ) ||
    status.includes(
      'in progress',
    ) ||
    status.includes(
      'in_progress',
    ) ||
    status.includes(
      'in-progress',
    ) ||
    status.includes('live') ||
    status.includes(
      'halftime',
    ) ||
    status.includes(
      'half time',
    ) ||
    status.includes(
      '1st half',
    ) ||
    status.includes(
      '2nd half',
    ) ||
    status.includes(
      'extra time',
    ) ||
    status.includes(
      'penalties',
    )
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
    status.includes(
      'status_final',
    ) ||
    status.includes(
      'final',
    ) ||
    status.includes(
      'finished',
    ) ||
    status.includes(
      'full time',
    ) ||
    status.includes(
      'fulltime',
    )
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

let cachedCurrent:
  SportMatch[] | null =
    null

let cachedCurrentAt =
  0

export async function getFootballMatches(): Promise<
  SportMatch[]
> {
  /*
   * Only cache for 15 seconds.
   * A 60-second cache is too slow
   * for a live-match UI.
   */
  if (
    cachedCurrent &&
    Date.now() -
      cachedCurrentAt <
      15_000
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
    await fetchLeagueDateRange(
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
      // Keep trying remaining leagues.
    }
  }

  throw new Error(
    'Match not found.',
  )
}

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
