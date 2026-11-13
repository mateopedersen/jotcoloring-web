import logos from '../content/wnba-team-logos.json';

/** League-specific, exact team IDs prevent similarly named subjects inheriting a logo. */
export function wnbaTeamLogo(topicId:string){
 return Object.prototype.hasOwnProperty.call(logos.teams,topicId)
  ?logos.teams[topicId as keyof typeof logos.teams]
  :undefined;
}
