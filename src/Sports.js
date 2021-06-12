const nba = Object.freeze({
    id: "nba",
    link: "basketball/nba",
    scoresID: "plays",
    name: "nba",
  });
  const nfl = Object.freeze({
    id: "nfl",
    link: "football/nfl",
    scoresID: "scoringPlays",
    name: "nfl",
  });
  
  export const SPORTS_ENUM = Object.freeze({ [nba.id]: nba, [nfl.id]: nfl });
  