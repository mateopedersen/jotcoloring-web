export const STUDIO_FORMATS=[
 {id:'png',label:'PNG',mime:'image/png',hint:'Lossless image',icon:'file-png'},
 {id:'svg',label:'SVG',mime:'image/svg+xml',hint:'Embedded lossless artwork',icon:'file-svg'},
 {id:'jpg',label:'JPG',mime:'image/jpeg',hint:'Compact color image',icon:'file-jpeg'},
 {id:'jpeg',label:'JPEG',mime:'image/jpeg',hint:'JPEG with .jpeg extension',icon:'file-jpeg'},
 {id:'docx',label:'Word',mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',hint:'Colored artwork in a DOCX',icon:'file-docx'},
 {id:'pdf',label:'PDF',mime:'application/pdf',hint:'Print-ready · under 1 MB',icon:'file-pdf'},
 {id:'webp',label:'WEBP',mime:'image/webp',hint:'Clear & compact image',icon:'file-webp'},
] as const;
export type StudioFormat=typeof STUDIO_FORMATS[number]['id'];
export const isStudioFormat=(value:unknown):value is StudioFormat=>STUDIO_FORMATS.some(f=>f.id===value);
