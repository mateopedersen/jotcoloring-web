import type {ColoringCategory} from './catalog';

/** Thirty-six newly supplied automotive brand collections, nested under Cars. */
const brands:[id:string,name:string,aliases:string[],intro:string][]=[
 ['alpine','Alpine',['Alpine cars','Alpine coloring pages','Alpine A110','Alpine A290'],'Alpine pages pair the A110 sports car with A290 and A390 electric models, plus close-up studies of exterior details.'],
 ['amc','AMC',['AMC cars','AMC coloring pages','American Motors cars','AMC Pacer'],'AMC Pacer, Eagle, Hornet, Javelin and Rebel examples sit beside classic badges and familiar body profiles.'],
 ['anadol','Anadol',['Anadol cars','Anadol coloring pages','Anadol A1','Anadol STC-16'],'Drawings trace Anadol passenger cars and utility shapes, including A1, A2, STC-16, Böcek, SV-1600 and Otosan P-series names.'],
 ['citroen','Citroën',['Citroen cars','Citroën cars','Citroen coloring pages','Citroën C3','Citroën C5'],'Modern ë-C3, ë-C4 and ë-C5 forms appear with Ami, Berlingo, 2CV and Méhari designs.'],
 ['czinger','Czinger',['Czinger cars','Czinger coloring pages','Czinger 21C'],'The Czinger set focuses on 21C hypercar variants, with front, profile and aerodynamic detail drawings.'],
 ['delorean','DeLorean',['DeLorean cars','DeLorean coloring pages','DeLorean DMC-12','DeLorean Alpha5'],'Classic DMC-12 outlines meet Alpha5 concept pages and the brand’s evolving design sketches.'],
 ['denza','Denza',['Denza cars','Denza coloring pages','Denza Z9GT','Denza D9'],'Denza pages feature the Z9GT, D9 and SUV silhouettes alongside steering-wheel, emblem and interior details.'],
 ['ds-automobiles','DS Automobiles',['DS Automobiles cars','DS Automobiles coloring pages','DS 3','DS N°4'],'DS drawings move between numbered N° models, DS 3 and E-TENSE details, Formula E and concept styling.'],
 ['geely','Geely',['Geely cars','Geely coloring pages','Geely EX5','Geely EX2'],'Geely EX models, Starray EM-i, Monjaro SUVs and Galaxy line art share space with grille and emblem studies.'],
 ['hennessey','Hennessey',['Hennessey cars','Hennessey coloring pages','Hennessey Venom F5','Hennessey Venom GT'],'Venom F5 variants sit beside Hennessey Mustang, VelociRaptor and Mammoth-inspired vehicle pages.'],
 ['hummer','Hummer',['Hummer cars','Hummer coloring pages','Hummer H1','Hummer H2','Hummer EV'],'H1, H2 and H3 utility shapes lead the Hummer set, with pickups, open-top and electric-era forms.'],
 ['ineos-automotive','INEOS Automotive',['INEOS cars','INEOS Automotive coloring pages','INEOS Grenadier','INEOS Quartermaster'],'Grenadier and Quartermaster drawings show station-wagon and pickup body styles, trim details and off-road scenes.'],
 ['international-harvester','International Harvester',['International Harvester vehicles','International Harvester coloring pages','International Scout','International Harvester Scout'],'Scout, Travelall and Travelette models appear alongside historic farm and work-truck silhouettes.'],
 ['koenigsegg','Koenigsegg',['Koenigsegg cars','Koenigsegg coloring pages','Koenigsegg Jesko','Koenigsegg Gemera'],'Jesko, Gemera, CC850 and classic models highlight varied hypercar shapes, from sleek profiles to winged designs.'],
 ['leapmotor','Leapmotor',['Leapmotor cars','Leapmotor coloring pages','Leapmotor T03','Leapmotor B10'],'Leapmotor pages cover city cars and multiple SUV or hatchback models, including T03, B-series and C-series names.'],
 ['li-auto','Li Auto',['Li Auto cars','Li Auto coloring pages','Li Auto MEGA','Li Auto i8'],'Li Auto i-series, L-series and MEGA models appear in modern family-SUV and MPV profiles, with interior and badge details.'],
 ['mercury','Mercury',['Mercury cars','Mercury coloring pages','Mercury Cougar','Mercury Grand Marquis'],'Mercury pages span Cougar, Grand Marquis, Milan and other classic cars, with distinctive grille and emblem artwork.'],
 ['nio','NIO',['NIO cars','NIO coloring pages','NIO ET5','NIO ET7'],'NIO sedan and SUV pages include ET5, ET9, ES-series and EP9 designs, plus model badges and cockpit details.'],
 ['oldsmobile','Oldsmobile',['Oldsmobile cars','Oldsmobile coloring pages','Oldsmobile Alero','Oldsmobile Cutlass'],'Alero, Cutlass, Aurora, Rocket 88 and earlier Oldsmobile forms accompany classic scripts, emblems and wheel details.'],
 ['peugeot','Peugeot',['Peugeot cars','Peugeot coloring pages','Peugeot 208','Peugeot 3008'],'Peugeot electric E-models meet legacy GTI and 9X8 racing-car drawings, plus passenger and utility silhouettes.'],
 ['plymouth','Plymouth',['Plymouth cars','Plymouth coloring pages','Plymouth Prowler','Plymouth Barracuda'],'Plymouth pages include Prowler, Barracuda, Road Runner, Neon and other classic road-car profiles with period trim.'],
 ['polestar','Polestar',['Polestar cars','Polestar coloring pages','Polestar 2','Polestar 4'],'Polestar 1–5 designs and concept studies show a range of sleek performance-car and SUV shapes.'],
 ['pontiac','Pontiac',['Pontiac cars','Pontiac coloring pages','Pontiac Firebird','Pontiac G8'],'Pontiac GTO, Firebird, Solstice, Grand Prix and other models share a collection with arrowhead badges and details.'],
 ['renault','Renault',['Renault cars','Renault coloring pages','Renault 5 E-Tech','Renault Clio'],'Renault E-Tech electric outlines appear beside Clio and Rafale hybrids, family models and concept cars.'],
 ['rimac','Rimac',['Rimac cars','Rimac coloring pages','Rimac Nevera','Rimac Concept One'],'Nevera and Nevera R feature alongside Concept One, Nevera track editions and experimental vehicle drawings.'],
 ['saab','Saab',['Saab cars','Saab coloring pages','Saab 900','Saab 9-3'],'Saab 9-3, 99, 9000 and other historic models range from turbo hatchbacks and wagons to concept designs.'],
 ['saleen','Saleen',['Saleen cars','Saleen coloring pages','Saleen S1','Saleen S7'],'Saleen S1 and S7 shapes share pages with Mustang, truck and competition-car drawings.'],
 ['scion','Scion',['Scion cars','Scion coloring pages','Scion xB','Scion FR-S'],'Scion xB, FR-S, iQ, tC and related compact models appear in vehicle profiles and detailed brand studies.'],
 ['shelby-american','Shelby American',['Shelby American cars','Shelby coloring pages','Shelby Cobra','Shelby Daytona Coupe'],'Shelby pages span Cobra, Daytona Coupe, Series 1 and GT models, with familiar roadster and race-car profiles.'],
 ['ssc-north-america','SSC North America',['SSC cars','SSC North America coloring pages','SSC Tuatara','SSC Ultimate Aero'],'Tuatara, Striker, Aggressor and Ultimate Aero drawings focus on high-performance road and track-car shapes.'],
 ['studebaker','Studebaker',['Studebaker cars','Studebaker coloring pages','Studebaker Avanti','Studebaker Commander'],'Studebaker Commander, Wagonaire, Avanti, Lark and other heritage models appear in classic sedan and coupe scenes.'],
 ['togg','Togg',['Togg cars','Togg coloring pages','Togg T10X','Togg T10F'],'T10X and T10F electric models lead the Togg set, alongside early smart-device concepts and design studies.'],
 ['vinfast','VinFast',['VinFast cars','VinFast coloring pages','VinFast VF 3','VinFast VF 8'],'VinFast VF line vehicles, service vehicles and the VF Wild pickup concept appear in modern silhouette and detail pages.'],
 ['xiaomi','Xiaomi',['Xiaomi cars','Xiaomi coloring pages','Xiaomi SU7','Xiaomi YU7'],'Xiaomi SU7 and YU7 variants share sedan and SUV profiles with cabin, wheel, grille and emblem studies.'],
 ['xpeng','XPeng',['XPeng cars','XPeng coloring pages','XPeng G6','XPeng G9'],'XPeng G-series, P7, X9 and MONA vehicles appear with body profiles, interior and emblem details, and the GX design.'],
 ['zeekr','ZEEKR',['ZEEKR cars','ZEEKR coloring pages','ZEEKR 001','ZEEKR 7X'],'ZEEKR 001, X, 7X, 7GT and 9X shapes range from shooting brakes to SUVs and MPVs.']
];

export const NOVEMBER_08_AUTOMOBILE_BRAND_TOPICS:readonly ColoringCategory[]=brands.map(([id,name,aliases,intro])=>({
 id,name,topic:name,parent:'cars',visual:`${name} cars, named models, and automotive detail drawings`,icon:'vehicles',sample:`${id}-coloring-page-001`,
 intro,
 aliases:[...new Set([...aliases,`${name} coloring pages`])],editorial_only:true
}));
