/** Load suggestion UI on search intent; native form submission is always available. */
let loading:Promise<void>|undefined;
function loadSuggestions(event:Event){
 if(!(event.target instanceof Element)||!event.target.closest('[data-search-form]'))return;
 loading??=import('./search-suggestions').then(module=>module.initSearchSuggestions()).catch(()=>{loading=undefined;});
}
for(const type of ['pointerover','pointerdown','focusin','input'])document.addEventListener(type,loadSuggestions,{passive:true});
