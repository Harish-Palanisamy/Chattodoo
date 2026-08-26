export type LeagueDefinition = {
  id: string
  name: string
  shortName: string
  code: string
  country: string
  icon: string
}

export type LeagueStanding = {
  position: number

  teamId: string
  team: string
  shortName: string

  logo?: string

  played: number
  wins: number
  draws: number
  losses: number

  goalsFor: number
  goalsAgainst: number
  goalDifference: number

  points: number

  form?: string
}

/* =========================================================
   CHATTODOO LEAGUES
========================================================= */

export const FOOTBALL_LEAGUES: LeagueDefinition[] = [
  {
    id: 'premier-league',
    name: 'Premier League',
    shortName: 'Premier League',
    code: 'eng.1',
    country: 'England',
    icon: '🏴',
  },

  {
    id: 'la-liga',
    name: 'La Liga',
    shortName: 'La Liga',
    code: 'esp.1',
    country: 'Spain',
    icon: '🇪🇸',
  },

  {
    id: 'champions-league',
    name: 'UEFA Champions League',
    shortName: 'Champions League',
    code: 'uefa.champions',
    country: 'Europe',
    icon: '⭐',
  },

  {
    id: 'serie-a',
    name: 'Serie A',
    shortName: 'Serie A',
    code: 'ita.1',
    country: 'Italy',
    icon: '🇮🇹',
  },

  {
    id: 'bundesliga',
    name: 'Bundesliga',
    shortName: 'Bundesliga',
    code: 'ger.1',
    country: 'Germany',
    icon: '🇩🇪',
  },

  {
    id: 'ligue-1',
    name: 'Ligue 1',
    shortName: 'Ligue 1',
    code: 'fra.1',
    country: 'France',
    icon: '🇫🇷',
  },
]

/* =========================================================
   ESPN RESPONSE TYPES
========================================================= */

type EspnStat = {
  name?: string
  abbreviation?: string
  displayName?: string

  value?: number
  displayValue?: string
}

type EspnTeam = {
  id?: string
  displayName?: string
  shortDisplayName?: string
  abbreviation?: string

  logos?: Array<{
    href?: string
  }>

  logo?: string
}

type EspnEntry = {
  team?: EspnTeam

  stats?: EspnStat[]
}

type EspnStandingsGroup = {
  name?: string

  standings?: {
    entries?: EspnEntry[]
  }

  children?: EspnStandingsGroup[]
}

type EspnStandingsResponse = {
  name?: string

  children?: EspnStandingsGroup[]
}

/* =========================================================
   HELPERS
========================================================= */

export function getLeague(
  leagueId: string,
): LeagueDefinition | undefined {
  return FOOTBALL_LEAGUES.find(
    (league) =>
      league.id === leagueId,
  )
}

function numberValue(
  stats: EspnStat[],
  names: string[],
) {
  for (const name of names) {
    const stat =
      stats.find(
        (item) =>
          item.name === name ||
          item.abbreviation === name,
      )

    if (!stat) {
      continue
    }

    if (
      typeof stat.value ===
      'number'
    ) {
      return stat.value
    }

    const value =
      Number(
        stat.displayValue,
      )

    if (
      !Number.isNaN(value)
    ) {
      return value
    }
  }

  return 0
}

function stringValue(
  stats: EspnStat[],
  names: string[],
) {
  for (const name of names) {
    const stat =
      stats.find(
        (item) =>
          item.name === name ||
          item.abbreviation === name,
      )

    if (
      stat?.displayValue
    ) {
      return stat.displayValue
    }
  }

  return ''
}

/* =========================================================
   FIND ALL STANDING ENTRIES

   Some ESPN competitions return one group.
   Some return nested groups.

   This recursively collects everything.
========================================================= */

function collectEntries(
  groups: EspnStandingsGroup[],
): EspnEntry[] {
  const result: EspnEntry[] = []

  for (const group of groups) {
    const entries =
      group.standings
        ?.entries ?? []

    result.push(
      ...entries,
    )

    if (
      group.children?.length
    ) {
      result.push(
        ...collectEntries(
          group.children,
        ),
      )
    }
  }

  return result
}

/* =========================================================
   CONVERT TABLE ENTRY
========================================================= */

function convertEntry(
  entry: EspnEntry,
): LeagueStanding | null {
  if (!entry.team) {
    return null
  }

  const stats =
    entry.stats ?? []

  const points =
    numberValue(
      stats,
      [
        'points',
        'PTS',
      ],
    )

  const played =
    numberValue(
      stats,
      [
        'gamesPlayed',
        'GP',
      ],
    )

  const wins =
    numberValue(
      stats,
      [
        'wins',
        'W',
      ],
    )

  const draws =
    numberValue(
      stats,
      [
        'ties',
        'draws',
        'D',
      ],
    )

  const losses =
    numberValue(
      stats,
      [
        'losses',
        'L',
      ],
    )

  const goalsFor =
    numberValue(
      stats,
      [
        'pointsFor',
        'goalsFor',
        'GF',
      ],
    )

  const goalsAgainst =
    numberValue(
      stats,
      [
        'pointsAgainst',
        'goalsAgainst',
        'GA',
      ],
    )

  let goalDifference =
    numberValue(
      stats,
      [
        'pointDifferential',
        'goalDifference',
        'GD',
      ],
    )

  if (
    goalDifference === 0 &&
    (
      goalsFor !== 0 ||
      goalsAgainst !== 0
    )
  ) {
    goalDifference =
      goalsFor -
      goalsAgainst
  }

  const position =
    numberValue(
      stats,
      [
        'rank',
        'position',
      ],
    )

  return {
    position,

    teamId:
      entry.team.id ??
      entry.team.displayName ??
      crypto.randomUUID(),

    team:
      entry.team.displayName ??
      entry.team.shortDisplayName ??
      'Unknown team',

    shortName:
      entry.team.shortDisplayName ??
      entry.team.displayName ??
      'Unknown',

    logo:
      entry.team.logos?.[0]
        ?.href ??
      entry.team.logo,

    played,
    wins,
    draws,
    losses,

    goalsFor,
    goalsAgainst,
    goalDifference,

    points,

    form:
      stringValue(
        stats,
        [
          'streak',
          'form',
        ],
      ),
  }
}

/* =========================================================
   LOAD STANDINGS
========================================================= */

export async function getLeagueStandings(
  leagueId: string,
): Promise<LeagueStanding[]> {
  const league =
    getLeague(
      leagueId,
    )

  if (!league) {
    throw new Error(
      'League not supported.',
    )
  }

  /*
   * ESPN uses season=2026 for the
   * 2026/27 European season.
   */

  const url =
    `https://site.api.espn.com/apis/v2/sports/soccer/${league.code}/standings?season=2026`

  const response =
    await fetch(url)

  if (!response.ok) {
    throw new Error(
      `${league.name} standings request failed.`,
    )
  }

  const data:
    EspnStandingsResponse =
    await response.json()

  const rawEntries =
    collectEntries(
      data.children ?? [],
    )

  const converted =
    rawEntries
      .map(
        convertEntry,
      )
      .filter(
        (
          entry,
        ): entry is LeagueStanding =>
          entry !== null,
      )

  /*
   * Remove duplicate teams.
   *
   * Useful for competitions where ESPN
   * returns nested sections.
   */

  const unique =
    Array.from(
      new Map(
        converted.map(
          (entry) => [
            entry.teamId,
            entry,
          ],
        ),
      ).values(),
    )

  /*
   * Normally ESPN already supplies rank.
   *
   * Fallback:
   * points → GD → goals scored.
   */

  return unique.sort(
    (a, b) => {
      if (
        a.position > 0 &&
        b.position > 0 &&
        a.position !==
          b.position
      ) {
        return (
          a.position -
          b.position
        )
      }

      if (
        a.points !==
        b.points
      ) {
        return (
          b.points -
          a.points
        )
      }

      if (
        a.goalDifference !==
        b.goalDifference
      ) {
        return (
          b.goalDifference -
          a.goalDifference
        )
      }

      return (
        b.goalsFor -
        a.goalsFor
      )
    },
  )
}