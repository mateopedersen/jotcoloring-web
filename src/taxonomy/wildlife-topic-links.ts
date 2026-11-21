interface RelatedWildlifeTopic {
  readonly id: string;
  readonly label: string;
}

interface WildlifeTopicLinks {
  readonly lead: string;
  readonly related: readonly [RelatedWildlifeTopic, RelatedWildlifeTopic];
  readonly factsLead: string;
  readonly source: {readonly href: string; readonly label: string};
}

export const WILDLIFE_TOPIC_LINKS: Readonly<Partial<Record<string, WildlifeTopicLinks>>> = {
  'fennec-fox': {
    lead: 'For more burrow scenes and long-eared animals, try',
    related: [
      {id: 'aardvark', label: 'aardvark coloring pages'},
      {id: 'rabbit', label: 'rabbit coloring pages'},
    ],
    factsLead: 'Learn how large ears help desert foxes in',
    source: {href: 'https://nationalzoo.si.edu/animals/fennec-fox', label: 'the Smithsonian’s fennec fox profile'},
  },
  gharial: {
    lead: 'Explore more wildlife at the water’s edge with',
    related: [
      {id: 'turtles', label: 'turtle coloring pages'},
      {id: 'shoebill', label: 'shoebill coloring pages'},
    ],
    factsLead: 'Read how a narrow snout helps this reptile catch fish in',
    source: {href: 'https://nationalzoo.si.edu/animals/gharial', label: 'the Smithsonian’s gharial profile'},
  },
  'musk-ox': {
    lead: 'Color more northern wildlife with',
    related: [
      {id: 'reindeer', label: 'reindeer coloring pages'},
      {id: 'seal', label: 'seal coloring pages'},
    ],
    factsLead: 'Learn how a shaggy coat helps in Arctic winters in',
    source: {href: 'https://www.nps.gov/cakr/learn/nature/muskox.htm', label: 'the National Park Service’s musk ox profile'},
  },
  cuttlefish: {
    lead: 'Find more underwater and seagrass scenes in',
    related: [
      {id: 'seahorse', label: 'seahorse coloring pages'},
      {id: 'dugong', label: 'dugong coloring pages'},
    ],
    factsLead: 'See how the giant cuttlefish changes color and texture in',
    source: {href: 'https://australian.museum/learn/animals/fishes/giant-cuttlefish/', label: 'the Australian Museum’s cuttlefish guide'},
  },
  dugong: {
    lead: 'Explore more coastal wildlife with',
    related: [
      {id: 'sea-turtles', label: 'sea turtle coloring pages'},
      {id: 'cuttlefish', label: 'cuttlefish coloring pages'},
    ],
    factsLead: 'Learn why seagrass matters in',
    source: {href: 'https://australian.museum/learn/animals/mammals/dugong/', label: 'the Australian Museum’s dugong guide'},
  },
  'secretary-bird': {
    lead: 'Compare different wings and bill shapes in',
    related: [
      {id: 'shoebill', label: 'shoebill coloring pages'},
      {id: 'eagle', label: 'eagle coloring pages'},
    ],
    factsLead: 'Find out how this bird hunts on foot in',
    source: {href: 'https://animals.sandiegozoo.org/animals/secretary-bird', label: 'San Diego Zoo’s secretary bird profile'},
  },
  shoebill: {
    lead: 'Color another African bird or try a river scene with',
    related: [
      {id: 'secretary-bird', label: 'secretary bird coloring pages'},
      {id: 'gharial', label: 'gharial coloring pages'},
    ],
    factsLead: 'Explore the wetland habitat and distinctive bill in',
    source: {href: 'https://zootampa.org/animals/shoebill-stork/', label: 'ZooTampa’s shoebill profile'},
  },
  binturong: {
    lead: 'Look for more animals among forest branches in',
    related: [
      {id: 'tarsier', label: 'tarsier coloring pages'},
      {id: 'red-panda', label: 'red panda coloring pages'},
    ],
    factsLead: 'Learn how this animal uses its tail to climb in',
    source: {href: 'https://nationalzoo.si.edu/animals/binturong', label: 'the Smithsonian’s binturong profile'},
  },
  tarsier: {
    lead: 'For more tree-climbing mammals, try',
    related: [
      {id: 'binturong', label: 'binturong coloring pages'},
      {id: 'red-panda', label: 'red panda coloring pages'},
    ],
    factsLead: 'Read about large eyes and leaps between branches in',
    source: {href: 'https://primate.wisc.edu/primate-info-net/pin-factsheets/pin-factsheet-tarsier/', label: 'the Wisconsin National Primate Research Center’s tarsier guide'},
  },
  aardvark: {
    lead: 'Color insects that aardvarks eat and other savanna wildlife with',
    related: [
      {id: 'ant', label: 'ant coloring pages'},
      {id: 'rhino', label: 'rhino coloring pages'},
    ],
    factsLead: 'Learn how this animal digs for food in',
    source: {href: 'https://www.sanbi.org/animal-of-the-week/orycteropus-afer/', label: 'the South African National Biodiversity Institute’s aardvark profile'},
  },
};
