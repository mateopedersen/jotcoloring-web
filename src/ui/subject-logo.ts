import subjects from '../content/subject-logos.json';
import reviews from '../content/subject-logo-reviews.json';
import {nbaTeamLogo} from './team-logo';

export interface SubjectLogo {
 src:string;
 kind:'team'|'brand';
 surface:'none'|'light'|'dark';
 shape:'square'|'wide'|'tall';
}

/** Resolve only an explicitly reviewed subject, never a guessed name or parent. */
export function subjectLogo(topicId:string):SubjectLogo|undefined {
 const team=nbaTeamLogo(topicId);
 if(team)return {src:team.src,kind:'team',surface:'none',shape:'square'};
 if(!Object.prototype.hasOwnProperty.call(subjects.subjects,topicId))return;
 const logo=subjects.subjects[topicId as keyof typeof subjects.subjects];
 if(!logo.reviewed_at||!Object.prototype.hasOwnProperty.call(reviews.subjects,topicId))return;
 const review=reviews.subjects[topicId as keyof typeof reviews.subjects];
 if(review.asset_sha256!==logo.sha256||review.src!==logo.src||review.surface!==logo.surface||review.shape!==logo.shape||review.identity_reference!==logo.identity_reference)return;
 return {src:logo.src,kind:'brand',surface:logo.surface as SubjectLogo['surface'],shape:logo.shape as SubjectLogo['shape']};
}
