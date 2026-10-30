export const PROJECT_SCHEMA = 3;
export const MAX_PIXELS = 8_000_000;
export type Point = { x: number; y: number; pressure?:number };
export type BrushStyle = 'round'|'pencil'|'crayon'|'marker'|'watercolor'|'airbrush';
export type Symmetry = 'none'|'horizontal'|'vertical'|'both'|'radial-4'|'radial-8'|'radial-12'|'radial-16';
export type PaintEffect = {type:'solid'|'linear'|'radial'|'stripes'|'dots'|'checks'|'weave'|'bricks'|'scales';secondary:string;angle:number;spacing:number};
export type BlendMode = 'source-over'|'multiply'|'screen'|'overlay';
export type BrushTip={shape:'round'|'square'|'chisel'|'star'|'heart'|'dash';hardness:number;spacing:number;angle:number;roundness:number;flow:number;scatter:number;rainbow:boolean;pressureOpacity:boolean};
export type Stroke = { kind: 'stroke'; points: Point[]; color: string; size: number; opacity: number; erase: boolean; brush?:BrushStyle; symmetry?:Symmetry; clip?:number[]; pressure?:boolean; tip?:BrushTip };
export type Fill = { kind: 'fill'; spans: number[]; color: string; opacity: number; effect?:PaintEffect };
export type Shape = {kind:'shape';shape:'line'|'rectangle'|'ellipse'|'star'|'heart';start:Point;end:Point;color:string;size:number;opacity:number;filled:boolean;effect?:PaintEffect;symmetry?:Symmetry;clip?:number[]};
export type Operation = Stroke | Fill | Shape;
export type PaintLayer = { id: string; name: string; visible: boolean; locked?:boolean; alphaLock?:boolean; clipBelow?:boolean; opacity?:number; blend?:BlendMode; operations: Operation[] };
export type TextObject = { id: string; text: string; x: number; y: number; size: number; scale: number; rotation: number; align: CanvasTextAlign; color: string; visible: boolean; font?:string; weight?:number; italic?:boolean; outline?:boolean; letterSpacing?:number; lineHeight?:number; curve?:number; outlineWidth?:number; shadow?:{color:string;x:number;y:number;blur:number} };
export type ObjectRegion = { id:string; label:string; path:string; fill?:string; fillRule?:CanvasFillRule };
export type ObjectDefinition = { id:string; title:string; category:string; width:number; height:number; regions:ObjectRegion[]; outlinePaths?:string[] };
export type PlacedObject = { id:string; definition:ObjectDefinition; x:number; y:number; scale:number; rotation:number; visible:boolean; locked?:boolean; flipX?:boolean; flipY?:boolean; colors:Record<string,string> };
export type Source = { id: string; title: string; revision: string; url: string; width: number; height: number; blob: Blob; hasBrandFooter?:boolean };
export type Drawing = { layers: PaintLayer[]; texts: TextObject[]; objects:PlacedObject[]; activeLayer: string; keepOutlines: boolean; lineVisible: boolean; background?:string; lineOpacity?:number };
export type Project = Drawing & { schema: number; id: string; title: string; source: Source; createdAt: number; updatedAt: number; thumbnail?: Blob; undo: Drawing[]; redo: Drawing[]; versions?:{id:string;name:string;createdAt:number;drawing:Drawing}[]; customPalette?:string[] };
export type Favorite = { id: string; title: string; slug: string; thumbnail: string; revision?: string | number; savedAt: number };

export function createProject(source: Source): Project {
  const layer: PaintLayer = { id: crypto.randomUUID(), name: 'Colors', visible: true, operations: [] };
  return { schema: PROJECT_SCHEMA, id: crypto.randomUUID(), title: source.title, source, createdAt: Date.now(), updatedAt: Date.now(), layers: [layer], texts: [], objects:[], activeLayer: layer.id, keepOutlines: true, lineVisible: true, undo: [], redo: [] };
}
export function drawingOf(project: Project): Drawing {
  return structuredClone({ layers: project.layers, texts: project.texts, objects:project.objects||[], activeLayer: project.activeLayer, keepOutlines: project.keepOutlines, lineVisible: project.lineVisible, background:project.background, lineOpacity:project.lineOpacity });
}
export function checkpoint(project: Project) {
  project.undo.push(drawingOf(project));
  if (project.undo.length > 40) project.undo.shift();
  // Bound retained undo data by serialized size in addition to command count.
  while (project.undo.length > 1 && JSON.stringify(project.undo).length > 12_000_000) project.undo.shift();
  project.redo = [];
}
export function undo(project: Project): boolean {
  const previous = project.undo.pop();
  if (!previous) return false;
  project.redo.push(drawingOf(project)); Object.assign(project, previous); return true;
}
export function redo(project: Project): boolean {
  const next = project.redo.pop();
  if (!next) return false;
  project.undo.push(drawingOf(project)); Object.assign(project, next); return true;
}
export function sourceCoordinates(clientX: number, clientY: number, rect: {left:number;top:number;width:number;height:number}, width: number, height: number): Point {
  return { x: (clientX - rect.left) / rect.width * width, y: (clientY - rect.top) / rect.height * height };
}
export function safeFilename(value: string) {
  return value.normalize('NFKC').replace(/[\\/\u0000-\u001f<>:"|?*]/g, '-').replace(/^\.+|\.+$/g, '').replace(/\.(pdf|webp|png|svg|jpe?g|docx|zip)$/i, '').trim().slice(0, 100) || 'my-artwork';
}
export function pageDimensions(paper: string, orientation: string): [number, number] {
  const portrait: [number, number] = paper === 'letter' ? [612, 792] : [595.2756, 841.8898];
  return orientation === 'landscape' ? [portrait[1], portrait[0]] : portrait;
}
export function hsvToHex(h: number, s: number, v: number) {
  const f = (n: number) => { const k = (n + h / 60) % 6; return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255).toString(16).padStart(2, '0'); };
  return `#${f(5)}${f(3)}${f(1)}`;
}
export function hexToHsv(hex: string): [number, number, number] {
  const [r,g,b] = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255); const max = Math.max(r,g,b), min = Math.min(r,g,b), d=max-min;
  let h = d === 0 ? 0 : max === r ? ((g-b)/d)%6 : max === g ? (b-r)/d+2 : (r-g)/d+4;
  h = (h*60+360)%360; return [h,max===0?0:d/max,max];
}
