import type {AgeBand} from './model';

export const AGE_DIRECTORY_INTRO=[
 'Find free printable coloring pages for different ages, interests, and levels of detail. Start with broad, open coloring spaces for younger children, explore richer drawings as confidence grows, or choose intricate pages for a longer coloring break.',
 'Pick a recommended age below to browse its collection. You can narrow the drawings by subject and detail, download a PDF or image, or open a page in Coloring Studio. Age recommendations are a starting point: choose the drawing that suits the person coloring.'
] as const;

/** Browsing guidance describes the existing detail bands, not developmental
 * promises or a fresh visual review of individual drawings. */
export const AGE_COLLECTION_INTROS:Record<AgeBand,readonly string[]>={
 '3-5':[
  'Little discoveries begin with a page that feels inviting. Browse printable coloring pages recommended for ages 3 to 5, with an emphasis on broad coloring spaces and fewer details. Choose a subject your child enjoys and take the drawing one shape at a time.',
  'Open a page for a closer look before choosing. Download its PDF for coloring with crayons or pencils, save the image, or try the online coloring tools together. There is no need to finish every space or stay with this age group if another page feels more comfortable.'
 ],
 '6-8':[
  'Give the next coloring session a little more to explore. These printable coloring pages are recommended for ages 6 to 8, balancing recognizable main shapes with manageable details. Let a favorite subject guide the choice, then make the drawing your own with color.',
  'Use the subject and detail filters to find a comfortable starting point. Each drawing opens to its own page, where you can download a PDF to print, save an image, or color online. Move between age groups whenever a simpler or more detailed picture feels like a better fit.'
 ],
 '9-12':[
  'Discover printable coloring pages for ages 9 to 12, with richer compositions and smaller spaces to explore at your own pace. This collection is a place to experiment with color combinations, work through details, and choose a drawing that matches your interests.',
  'Search for a subject or adjust the detail filter to narrow the collection. Open a drawing to inspect the whole page, download a printable PDF or image, or continue in Coloring Studio. The recommended age guides browsing; your experience and the kind of coloring session you want matter too.'
 ],
 '13-17':[
  'Make room for your own style with coloring pages recommended for ages 13 to 17. Browse drawings with layered compositions and finer details, then choose something that fits your interests, available time, and preferred level of challenge.',
  'Compare pages by subject and detail instead of choosing by age alone. Download a PDF for pencils or markers, save an image for your own projects, or use Coloring Studio in the browser. You can explore simpler pages for a quick break or try a more intricate drawing when you want to take your time.'
 ],
 adults:[
  'Set aside a moment for coloring with printable pages for adults. Explore fine outlines, smaller coloring spaces, and intricate compositions, choosing a subject and amount of detail that make you want to pick up your pencils.',
  'Filter the collection, inspect a drawing at full size, and download its PDF or image when you find a favorite. You can also color online in Coloring Studio. Prefer broader shapes or a shorter session? Other age collections remain open to you; the recommendation is a guide to detail, not a restriction.'
 ]
};
