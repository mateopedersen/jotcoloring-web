import type {Env} from './types';
import {aiConfiguration} from './ai';
export function configurationReadiness(env:Env){
 const publicReady=!!env.CATALOG_DB&&!!env.SEARCH_DB&&!!env.ORIGINALS&&!!env.PUBLISHED;
 const adminReady=publicReady&&!!env.BACKUPS&&!!env.ACCESS_TEAM_DOMAIN&&!!env.ACCESS_APPLICATION_AUD&&!!(env.ADMIN_ALLOWED_SUBJECTS||env.ADMIN_ALLOWED_SERVICE_TOKENS||env.ADMIN_ALLOWED_EMAILS)&&!!env.INGEST_QUEUE&&!!env.MEDIA_VALIDATION_SECRET;
 const aiReady=aiConfiguration(env).ready;
 return {publicReady,adminReady,aiReady,invalidEnabledFeature:env.AI_ENABLED==='true'&&!aiReady};
}
