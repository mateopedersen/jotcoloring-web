export const CONTACT_FORM_URL='https://docs.google.com/forms/d/e/1FAIpQLSfiWbd8xm_Kn2laCsbukOqS37ibQwmJUZk1ymsGWl0FYtNbJA/viewform';
export const CONTACT_DRAFT_KEY='jotcoloring:contact-draft';
export const CONTACT_TOPICS=[
 {id:'pages',title:'Pages & Downloads',value:'Coloring pages and downloads',icon:'pdf',hint:'Printing, files, or a page you love.'},
 {id:'studio',title:'Studio & Creative Tools',value:'Coloring Studio',icon:'nav-studio',hint:'Colors, saved artwork, and using Studio.'},
 {id:'photo',title:'Photo & AI Tools',value:'Photo to Coloring Page or AI tools',icon:'nav-photo',hint:'Photo outlines or creating a new page.'},
 {id:'licensing',title:'Commercial Licensing',value:'Commercial licensing',icon:'nav-commercial',hint:'Permission for a product or project.'},
 {id:'accessibility',title:'Accessibility',value:'Accessibility',icon:'nav-help',hint:'Tell us what would make the site easier to use.'},
 {id:'privacy',title:'Privacy & Data',value:'Privacy or data request',icon:'nav-license',hint:'Questions about your information.'},
 {id:'feedback',title:'Ideas & Feedback',value:'Feedback or another question',icon:'nav-contact',hint:'An idea, a suggestion, or something else.'}
] as const;
export function contactFormURL(topic='',message='',page=''){
 const url=new URL(CONTACT_FORM_URL);url.searchParams.set('embedded','true');
 const choice=CONTACT_TOPICS.find(x=>x.id===topic);
 if(choice)url.searchParams.set('entry.1628966971',choice.value);
 if(message)url.searchParams.set('entry.202951885',message.slice(0,7000));
 if(page)url.searchParams.set('entry.2137937066',page.slice(0,1500));
 return url.href;
}
