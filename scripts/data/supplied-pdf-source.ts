/** Read the exact placement of the supplied logo from a verified source PDF. */
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {inflateSync} from 'node:zlib';
import sharp from 'sharp';
import {PDFArray, PDFDocument, PDFDict, PDFName, PDFRawStream, PDFRef} from 'pdf-lib';
import {brandLogoRGB, BRAND_LOGO_WIDTH, BRAND_LOGO_HEIGHT} from '../../src/server/branding';
import {decodePDFPNGPrediction} from './pdf-predictor';

const sourcePlacementPattern=/q\s+([-+]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+))\s+0\s+0\s+([-+]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+))\s+([-+]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+))\s+([-+]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+))\s+cm\s+\/([A-Za-z0-9_.+-]+)\s+Do\s+Q/g;
function decodeASCII85(input: Uint8Array) {
  const whitespace = new Set([0, 9, 10, 12, 13, 32]);
  const output: number[] = [];
  const group: number[] = [];
  const emit = (values: number[], count = 4) => {
    let value = 0;
    for (const digit of values) value = value * 85 + digit;
    if (value > 0xffffffff) throw new Error('Invalid PDF ASCII85 value.');
    for (let shift = 24; shift >= 32 - count * 8; shift -= 8) {
      output.push(Math.floor(value / 2 ** shift) & 255);
    }
  };
  for (const byte of input) {
    if (whitespace.has(byte)) continue;
    if (byte === 126) break;
    if (byte === 122) {
      if (group.length) throw new Error('Invalid PDF ASCII85 zero group.');
      output.push(0, 0, 0, 0);
      continue;
    }
    if (byte < 33 || byte > 117) throw new Error('Invalid PDF ASCII85 character.');
    group.push(byte - 33);
    if (group.length === 5) {
      emit(group);
      group.length = 0;
    }
  }
  if (group.length === 1) throw new Error('Invalid final PDF ASCII85 group.');
  if (group.length > 1) {
    const count = group.length;
    while (group.length < 5) group.push(84);
    emit(group, count - 1);
  }
  return Buffer.from(output);
}

function decodePDFStream(stream: PDFRawStream, maxOutputLength: number) {
  const raw = stream.dict.get(PDFName.of('Filter'));
  const names = raw instanceof PDFArray ? raw.asArray() : raw instanceof PDFName ? [raw] : [];
  const filters = names.map(value => value instanceof PDFName ? value.toString().slice(1) : '');
  let bytes = Buffer.from(stream.getContents());
  let jpeg = false;
  for (const filter of filters) {
    if (filter === 'ASCII85Decode' || filter === 'A85') bytes = decodeASCII85(bytes);
    else if (filter === 'FlateDecode' || filter === 'Fl') bytes = inflateSync(bytes, {maxOutputLength});
    else if (filter === 'DCTDecode' || filter === 'DCT') {
      jpeg = true;
      break;
    } else throw new Error('Unsupported PDF image filter: ' + filter);
  }
  return {bytes, jpeg, filters};
}

export function decodePDFImageBytes(stream: PDFRawStream, width: number, height: number) {
  const decoded = decodePDFStream(stream, width * height * 3 + height);
  const params = stream.dict.get(PDFName.of('DecodeParms'));
  if (!(params instanceof PDFDict)) return decoded;
  const predictor = Number(params.get(PDFName.of('Predictor'))?.toString() || 1);
  if (predictor === 1) return decoded;
  if (decoded.jpeg || Number(params.get(PDFName.of('BitsPerComponent'))?.toString() || 8) !== 8
      || Number(params.get(PDFName.of('Columns'))?.toString() || 1) !== width) {
    throw new Error('Unsupported supplied PDF predictor parameters.');
  }
  const colors = Number(params.get(PDFName.of('Colors'))?.toString() || 1);
  decoded.bytes = decodePDFPNGPrediction(decoded.bytes, width, height, colors, predictor);
  return decoded;
}

export function sourceImagePlacement(doc: PDFDocument, name: PDFName) {
  const placements: {width: number; height: number; x: number; y: number}[] = [];
  const resourceName = name.toString().slice(1);
  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream) || object.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')
        || !object.dict.get(PDFName.of('Filter'))?.toString().includes('FlateDecode')) continue;
    const text = decodePDFStream(object, 100_000).bytes.toString('ascii');
    for (const match of text.matchAll(sourcePlacementPattern)) {
      if (match[5] === resourceName) placements.push({
        width: Number(match[1]), height: Number(match[2]), x: Number(match[3]), y: Number(match[4]),
      });
    }
  }
  if (placements.length !== 1) throw new Error('Could not uniquely locate supplied PDF image placement.');
  return placements[0]!;
}

export type SuppliedPDFSource = {
  source_zip_path: string;
  source_pdf_path: string;
  original_pdf_sha256: string;
};

export async function verifiedSuppliedPDFLogoPlacement(source: SuppliedPDFSource) {
  if (!path.isAbsolute(source.source_zip_path) || !source.source_zip_path.endsWith('.zip')
      || !/^(?:[a-zA-Z0-9_ .-]+\/)*[a-zA-Z0-9_ .-]+\.pdf$/i.test(source.source_pdf_path)
      || source.source_pdf_path.split('/').some(part => part === '.' || part === '..')
      || !/^[a-f0-9]{64}$/.test(source.original_pdf_sha256)) {
    throw new Error('Invalid supplied PDF source record.');
  }
  const bytes = execFileSync('/usr/bin/unzip', ['-p', source.source_zip_path, source.source_pdf_path], {maxBuffer: 1_000_000});
  if (!bytes.length || createHash('sha256').update(bytes).digest('hex') !== source.original_pdf_sha256) {
    throw new Error('Supplied PDF checksum differs from its verified source record.');
  }
  const doc = await PDFDocument.load(bytes, {ignoreEncryption: false});
  if (doc.getPageCount() !== 1) throw new Error('Supplied PDF must have one A4 page.');
  const page = doc.getPage(0);
  const size = page.getSize();
  if (Math.abs(size.width - 595.2756) > 1 || Math.abs(size.height - 841.8898) > 1) throw new Error('Supplied PDF is not A4.');
  const resources = page.node.Resources()?.lookup(PDFName.of('XObject'), PDFDict);
  if (!resources) throw new Error('Supplied PDF has no image resources.');
  const expected = Buffer.from(brandLogoRGB());
  const placements = [];
  const isRGB = (object: PDFRawStream) => {
    const raw = object.dict.get(PDFName.of('ColorSpace'));
    const space = raw instanceof PDFRef ? doc.context.lookup(raw) : raw;
    if (space instanceof PDFName) return space.toString() === '/DeviceRGB';
    if (!(space instanceof PDFArray) || space.get(0)?.toString() !== '/ICCBased') return false;
    const ref = space.get(1);
    const profile = ref instanceof PDFRef ? doc.context.lookup(ref) : ref;
    return profile instanceof PDFRawStream && Number(profile.dict.get(PDFName.of('N'))?.toString()) === 3;
  };
  for (const [name, ref] of resources.entries()) {
    const object = doc.context.lookup(ref);
    if (!(object instanceof PDFRawStream) || object.dict.get(PDFName.of('Subtype')) !== PDFName.of('Image')
        || !isRGB(object)
        || Number(object.dict.get(PDFName.of('Width'))?.toString()) !== BRAND_LOGO_WIDTH
        || Number(object.dict.get(PDFName.of('Height'))?.toString()) !== BRAND_LOGO_HEIGHT) continue;
    const encoded = decodePDFImageBytes(object, BRAND_LOGO_WIDTH, BRAND_LOGO_HEIGHT);
    const logo = encoded.jpeg
      ? await sharp(encoded.bytes, {limitInputPixels: BRAND_LOGO_WIDTH * BRAND_LOGO_HEIGHT}).toColourspace('srgb').removeAlpha().raw().toBuffer()
      : encoded.bytes;
    if (logo.equals(expected)) placements.push(sourceImagePlacement(doc, name as PDFName));
  }
  const placement = placements[0];
  if (placements.length !== 1 || !placement || placement.width <= 0 || placement.height <= 0 || placement.x < 0 || placement.y < 0
      || placement.x + placement.width > size.width + .001 || placement.y + placement.height > size.height + .001) {
    throw new Error('Supplied PDF does not have exactly one verified logo on the page.');
  }
  return placement;
}
