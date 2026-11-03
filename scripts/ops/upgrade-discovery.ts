import {remoteContext} from './release-context';
import {upgradeDiscoverySchema} from './discovery-schema';
const stage=process.argv[2];if(stage!=='production'&&stage!=='staging')throw Error('Select an explicit existing environment');
const {env}=await remoteContext(stage,{requestLimit:100});
console.log(JSON.stringify(await upgradeDiscoverySchema(env,process.argv.includes('--apply')),null,2));
