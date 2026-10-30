export const DRAWING_PAPERS={landscape:[1200,800],portrait:[900,1200],square:[1000,1000]} as const;
export const DRAWING_IDEAS=['Draw a friendly monster with three eyes.','Make a garden full of your favorite flowers.','Design a rocket for a trip to a new planet.','Draw your dream treehouse.','Make a silly animal wearing a hat.','Draw an underwater world.','Create a colorful pattern using just circles.','Draw a place that makes you happy.'] as const;
export function drawingPaper(value:string|null){return DRAWING_PAPERS[value as keyof typeof DRAWING_PAPERS]||DRAWING_PAPERS.landscape;}
