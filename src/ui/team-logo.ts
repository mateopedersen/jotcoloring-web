import logos from '../content/nba-team-logos.json';

/** Exact subject IDs keep similarly named collections out of the NBA logo map. */
export function nbaTeamLogo(topicId:string){
 return Object.prototype.hasOwnProperty.call(logos.teams,topicId)
  ?logos.teams[topicId as keyof typeof logos.teams]
  :undefined;
}
