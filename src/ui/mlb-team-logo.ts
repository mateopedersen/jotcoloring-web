import logos from '../content/mlb-team-logos.json';
/** Exact official team mapping; no alias or parent-based logo inference. */
export function mlbTeamLogo(topicId:string){
 return Object.prototype.hasOwnProperty.call(logos.teams,topicId) ? logos.teams[topicId as keyof typeof logos.teams] : undefined;
}
