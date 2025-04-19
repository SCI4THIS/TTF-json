function sum(accum, current)
{
  return accum * 256 + current;
}

function rrsum(a)
{
  return a.reduceRight(sum);
}

function rsum(a)
{
  return a.reduce(sum);
}

function readint(idx, n, f, meta)
{
  sub = meta.readbuf.subarray(idx, idx + n);
  return f(sub);
}

function Uint16ToInt16(n)
{
  let r = 0;
  if (n & 0x8000) {
    r = 0xFFFF8000 | (n & 0x7FFF);
  } else {
    r = n;
  }
  return r;
}

function READINT(n, f, meta)
{
  if (n == 0) { return 0; }
  if (n == 1) {
    let ret = meta.readbuf[meta.offset];
    meta.offset++;
    return ret;
  }
  let ret = readint(meta.offset, n, f, meta);
  meta.offset += n;
  return ret;
}

function READTAG(meta)
{
  sub = meta.readbuf.subarray(meta.offset, meta.offset + 4);
  meta.offset += 4;
  return String.fromCharCode.apply(null, sub);
}

function calculateTableChecksum(offset, length, meta)
{
  let sum = 0;
  let n   = Math.floor((length + 3) / 4);
  while (n--) {
    sum = (sum + readint(offset, 4, rsum, meta)) % 4294967296;
    offset += 4;
  }
  return sum;
}

function parseTables(meta)
{
  console.log("parseTables()");
  meta.ttf.scalarType    = READINT(4, rsum, meta);
  meta.ttf.numTables     = READINT(2, rsum, meta);
  meta.ttf.searchRange   = READINT(2, rsum, meta);
  meta.ttf.entrySelector = READINT(2, rsum, meta);
  meta.ttf.rangeShift    = READINT(2, rsum, meta);
  meta.ttf.tables        = {};
  meta.tables            = [];

  for (i=0; i<meta.ttf.numTables; i++) {
    let tag        = READTAG(meta);
    let checksum   = READINT(4, rsum, meta);
    let offset     = READINT(4, rsum, meta);
    let length     = READINT(4, rsum, meta);
    let calculated = calculateTableChecksum(offset, length, meta);

    meta.tables[tag] = { checksum, offset, length, calculated };

    if (tag == 'head') /* Calculated in parseHeadTable with adjustment */
      continue;

    if (calculated != checksum) {
      console.error("Bad checksum for " + tag + " " + calculated + " != " + checksum);
      return false;
    }
  }
  return true;
}

function parseHeadTable(meta)
{
  console.log("parseHeadTable()");
  if (meta.tables['head'] == undefined)
    return false; /* This needs to exist */

  meta.offset            = meta.tables['head'].offset;
  let version            = READINT(4, rsum, meta);
  let fontRevision       = READINT(4, rsum, meta);
  let checksumAdjustment = READINT(4, rsum, meta);
  let magicNumber        = READINT(4, rsum, meta);
  let flags              = READINT(2, rsum, meta);
  let unitsPerEm         = READINT(2, rsum, meta);
  let createdTime        = READINT(8, rsum, meta);
  let modifiedTime       = READINT(8, rsum, meta);
  let xMin               = Uint16ToInt16(READINT(2, rsum, meta));
  let yMin               = Uint16ToInt16(READINT(2, rsum, meta));
  let xMax               = Uint16ToInt16(READINT(2, rsum, meta));
  let yMax               = Uint16ToInt16(READINT(2, rsum, meta));
  let macStyle           = READINT(2, rsum, meta);
  let lowestRecPPEM      = READINT(2, rsum, meta);
  let fontDirectionHint  = READINT(2, rsum, meta);
  let indexToLocFormat   = READINT(2, rsum, meta);
  let glyphDataFormat    = READINT(2, rsum, meta);

  console.log("xMin: " + xMin + ", yMin: " + yMin);

  if (magicNumber != 0x5F0F3CF5) {
    console.error("Bad magicNumber " + magicNumber + " != " + 0x5F0F3CF5);
    return false;
  }

  meta.ttf.tables.head = { version, fontRevision, checksumAdjustment, magicNumber, flags, unitsPerEm,
    modifiedTime, createdTime, xMin, yMin, xMax, yMax, macStyle, lowestRecPPEM, fontDirectionHint, indexToLocFormat,
    glyphDataFormat };

  meta.tables['head'].adjustedChecksum = (meta.tables['head'].checksum + checksumAdjustment) % 4294967296;
  if (meta.tables['head'].adjustedChecksum != meta.tables['head'].calculated) {
    console.error("Bad checksum for head " + meta.tables['head'].adjustedChecksum + " != " + meta.tables['head'].calculated);
    return false;
  }

  if (indexToLocFormat != 0 && indexToLocFormat != 1) {
    console.error("Invalid indexToLocFormat (must be 0 or 1) " + indexToLocFormat);
    return false;
  }

  meta.indexToLocFormat = indexToLocFormat;

  return true;
}

function parseCmapTable(meta)
{
  console.log("parseCmapTable()");
  if (meta.tables['cmap'] == undefined)
    return true;

  meta.offset = meta.tables['cmap'].offset;
  console.log('meta.tables[cmap].offset: ' + meta.tables['cmap'].offset);
  let version         = READINT(2, rsum, meta);
  let numberSubtables = READINT(2, rsum, meta);
  let subtables       = [ ];

  for (let i=0; i<numberSubtables; i++) {
    let platformID         = READINT(2, rsum, meta);
    let platformSpecificID = READINT(2, rsum, meta);
    let offset             = READINT(4, rsum, meta);
    subtables[i]           = { platformID, platformSpecificID, offset };
  }

  for (let i=0; i<numberSubtables; i++) {
    meta.offset = subtables[i].offset + meta.tables['cmap'].offset;
    let format = READINT(2, rsum, meta);
    console.log('subtable ' + i + ' format: ' + format + ' subtables.offset: ' + subtables[i].offset + ' absolute offset: ' + meta.offset);
    switch (format) {
      case 0: {
        let length          = READINT(2, rsum, meta);
        let language        = READINT(2, rsum, meta);
        let glyphIndexArray = [];
        for (j=0; j<256; j++) {
          glyphIndexArray[j] = READINT(1, null, meta);
        }
        subtables[i]        = Object.assign(subtables[i], { format, length, language, glyphIndexArray });
        break;
      }
      case 2: {
        let length          = READINT(2, rsum, meta);
        let language        = READINT(2, rsum, meta);
        let subHeaderKeys   = [];
        let k_max           = 0;
        for (let j=0; j<256; j++) {
          subHeaderKeys[j]  = READINT(2, rsum, meta);
          let k             = subHeaderKeys[j] / 8;
          k_max             = Math.max(k_max, k);
        }
console.error("Unfinished format 2 subHeaders / glyhphIndexArray");
        return false;
        break;
      }
      case 4: {
        let length          = READINT(2, rsum, meta);
        let language        = READINT(2, rsum, meta);
        let segCountX2      = READINT(2, rsum, meta);
        let segCount        = segCountX2 / 2;
        let searchRange     = READINT(2, rsum, meta);
        let entrySelector   = READINT(2, rsum, meta);
        let rangeShift      = READINT(2, rsum, meta);
        let endCode         = [];
        for (let j=0; j<segCount; j++) {
          endCode[j] = READINT(2, rsum, meta);
        }
        let reservedPad     = READINT(2, rsum, meta);
        if (reservedPad != 0) {
          console.error("reservedPad not zero (" + reservedPad + ")");
          return false;
        }
        let startCode       = [];
        for (let j=0; j<segCount; j++) {
          startCode[j]      = READINT(2, rsum, meta);
        }
        let idDelta         = [];
        for (let j=0; j<segCount; j++) {
          idDelta[j]        = Uint16ToInt16(READINT(2, rsum, meta));
        }
        let idRangeOffset   = [];
        for (let j=0; j<segCount; j++) {
          idRangeOffset[j]  = READINT(2, rsum, meta);
        }
        let glyphIdArray = [];
	/*
	Many fonts utilize a glyphIdArray that spills over into subsequent subtables.
	In order to accomodate this, instead of

            for (let j=0; meta.offset < subtables[i].offset + length; j++) {

	the loop will run glyphIdArray until the end of the cmap table
        */
        for (let j=0; meta.offset < meta.tables.cmap.offset + meta.tables.cmap.length; j++) {
          glyphIdArray[j] = READINT(2, rsum, meta);
        }
        subtables[i]         = Object.assign(subtables[i], { format, length, language, segCountX2, searchRange,
                                                             entrySelector, rangeShift, endCode, startCode,
                                                             idDelta, idRangeOffset, glyphIdArray });
        break;
      }
      case 6: {
        let length          = READINT(2, rsum, meta);
        let language        = READINT(2, rsum, meta);
        let firstCode       = READINT(2, rsum, meta);
        let entryCount      = READINT(2, rsum, meta);
        let glyphIdArray    = [];
        for (let j=0; j<entryCount; j++) {
          glyphIdArray[j] = READINT(2, rsum, meta);
	}
        subtables[i]         = Object.assign(subtables[i],
		{ format, length, language, firstCode, entryCount,
                  glyphIdArray });
        break;
      }
      case 12: {
        let reserved  = READINT(2, rsum, meta);
        let length    = READINT(4, rsum, meta);
        let language  = READINT(4, rsum, meta);
        let numGroups = READINT(4, rsum, meta);
        let groups    = [];
        for (let j=0; j<numGroups; j++) {
          let startCharCode = READINT(4, rsum, meta);
          let endCharCode   = READINT(4, rsum, meta);
          let startGlyphID  = READINT(4, rsum, meta);
          groups[j] = { startCharCode, endCharCode, startGlyphID };
	}
        subtables[i] = Object.assign(subtables[i],
                { reserved, length, language, numGroups, groups });
        break;
      }
      default:
        console.error("(Parse) Unhandled format " + format);
        return false;
    }
  }
  meta.ttf.tables.cmap = { version, numberSubtables, subtables };
  return true;
}

function parseMaxpTable(meta)
{
  console.log("parseMaxpTable()");
  if (meta.tables['maxp'] == undefined)
    return true;

  meta.offset = meta.tables['maxp'].offset;
  let format  = READINT(4, rsum, meta);

  if (format == 0x5000) {
    let numGlyphs = READINT(2, rsum, meta);
    meta.ttf.tables.maxp = { format, numGlyphs };
    return true;
  }

  if (format != 0x10000) {
    console.error("Unhandled maxp format: " + format);
    return false;
  }

  let numGlyphs             = READINT(2, rsum, meta);
  let maxPoints             = READINT(2, rsum, meta);
  let maxContours           = READINT(2, rsum, meta);
  let maxComponentPoints    = READINT(2, rsum, meta);
  let maxComponentContours  = READINT(2, rsum, meta);
  let maxZones              = READINT(2, rsum, meta);
  let maxTwilightPoints     = READINT(2, rsum, meta);
  let maxStorage            = READINT(2, rsum, meta);
  let maxFunctionDefs       = READINT(2, rsum, meta);
  let maxInstructionDefs    = READINT(2, rsum, meta);
  let maxStackElements      = READINT(2, rsum, meta);
  let maxSizeOfInstructions = READINT(2, rsum, meta);
  let maxComponentElements  = READINT(2, rsum, meta);
  let maxComponentDepth     = READINT(2, rsum, meta);
  meta.ttf.tables.maxp = { format, numGlyphs, maxPoints, maxContours, maxComponentPoints, maxComponentContours,
                           maxZones, maxTwilightPoints, maxStorage, maxFunctionDefs, maxInstructionDefs,
                           maxStackElements, maxSizeOfInstructions, maxComponentElements, maxComponentDepth };
  meta.numGlyphs = numGlyphs;
  return true;
}

function parseLocaTable(meta)
{
  console.log("parseLocaTable()");
  if (meta.tables['loca'] == undefined)
    return true;

  meta.offset = meta.tables['loca'].offset;
  let offsets = [];
  if (meta.indexToLocFormat == 0) {
    if (meta.tables['loca'].length != 2 * (meta.numGlyphs + 1)) {
      console.error("Invalid size for loca table " + meta.tables['loca'].length + " != " + (2 * (meta.numGlyphs + 1)));
      return false;
    }
    for (let i=0; i<meta.numGlyphs + 1; i++) {
      offsets[i] = 2 * READINT(2, rsum, meta);
    }
  }
  if (meta.indexToLocFormat == 1) {
    if (meta.tables['loca'].length != 4 * (meta.numGlyphs + 1)) {
      console.error("Invalid size for loca table " + meta.tables['loca'].length + " != " + (4 * (meta.numGlyphs + 1)));
      return false;
    }
    for (let i=0; i<meta.numGlyphs + 1; i++) {
      offsets[i] = READINT(4, rsum, meta);
    }
  }
  meta.ttf.tables.loca = { offsets };
  return true;
}

function lookupFlag(flags, i)
{
  let index = 0;
  for (let j=0; j<i;) {
    if (!flags[index].REPEAT_FLAG) {
      j++;
    } else {
      j += flags[index].repeat_count + 1;
      if (i<j)
        break;
    }
    index++;
  }
  return flags[index];
}


function parseSimpleGlyf(i, glyf, meta)
{
  let contourEnds       = [];
  let numberOfContours  = glyf[i].numberOfContours;

  for (j=0; j<numberOfContours; j++) {
    contourEnds[j] = READINT(2, rsum, meta);
  }

  let instructionLength = READINT(2, rsum, meta);
  let instructions      = []
  for (j=0; j<instructionLength; j++) {
    instructions[j] = READINT(1, null, meta);
  }

  let numPoints         = contourEnds[contourEnds.length-1]+1;
  let flags             = [];
  let flags_uncompressed= [];
  for (j=0; j<numPoints; j++) {
    let byte = READINT(1, null, meta);
    let ON_CURVE_POINT                       = (byte & 0x01) ? true : false;
    let X_SHORT_VECTOR                       = (byte & 0x02) ? true : false;
    let Y_SHORT_VECTOR                       = (byte & 0x04) ? true : false;
    let REPEAT_FLAG                          = (byte & 0x08) ? true : false;
    let X_IS_SAME_OR_POSITIVE_X_SHORT_VECTOR = (byte & 0x10) ? true : false;
    let Y_IS_SAME_OR_POSITIVE_Y_SHORT_VECTOR = (byte & 0x20) ? true : false;
    let OVERLAP_SIMPLE                       = (byte & 0x40) ? true : false;
    let RESERVED                             = (byte & 0x80) ? true : false;
    let flag = { ON_CURVE_POINT, X_SHORT_VECTOR, Y_SHORT_VECTOR, REPEAT_FLAG,
                 X_IS_SAME_OR_POSITIVE_X_SHORT_VECTOR, Y_IS_SAME_OR_POSITIVE_Y_SHORT_VECTOR,
                 OVERLAP_SIMPLE, RESERVED };
    if (REPEAT_FLAG) {
      let repeat_count = READINT(1, null, meta);
      j += repeat_count;
      flag = Object.assign(flag, { repeat_count });
    }
    flags = flags.concat(flag);
  }

  let xCoordinates = [];
  for (j=0; j<numPoints; j++) {
    let flag = lookupFlag(flags, j);
    let xCoord = 0;
    if (flag.X_SHORT_VECTOR) {
      xCoord = READINT(1, null, meta);
      if (flag.X_IS_SAME_OR_POSITIVE_X_SHORT_VECTOR) {
        xCoordinates = xCoordinates.concat(xCoord);
      } else {
        xCoordinates = xCoordinates.concat(-xCoord);
      }
    } else {
      if (flag.X_IS_SAME_OR_POSITIVE_X_SHORT_VECTOR)
        continue;
      xCoord = READINT(2, rsum, meta);
      xCoordinates = xCoordinates.concat(Uint16ToInt16(xCoord));
    }
  }

  let yCoordinates = [];
  for (j=0; j<numPoints; j++) {
    let flag = lookupFlag(flags, j);
    let yCoord = 0;
    if (flag.Y_SHORT_VECTOR) {
      yCoord = READINT(1, null, meta);
      if (flag.Y_IS_SAME_OR_POSITIVE_Y_SHORT_VECTOR) {
        yCoordinates = yCoordinates.concat(yCoord);
      } else {
        yCoordinates = yCoordinates.concat(-yCoord);
      }
    } else {
      if (flag.Y_IS_SAME_OR_POSITIVE_Y_SHORT_VECTOR)
        continue;
      yCoord = READINT(2, rsum, meta);
      yCoordinates = yCoordinates.concat(Uint16ToInt16(yCoord));
    }
  }

  glyf[i] = Object.assign(glyf[i], { contourEnds, instructionLength, instructions, flags,
                                     xCoordinates, yCoordinates });
  return true;
}

function parseCompoundGlyf(i, glyf, meta)
{

  let subglyfs        = [];
  let more_components = true;

  do {
    let flags                    = READINT(2, rsum, meta);
    let glyphIndex               = READINT(2, rsum, meta);

    let ARGS_1_AND_2_ARE_WORDS   = (flags & 0x0001) ? true : false;
    let ARGS_ARE_XY_VALUES       = (flags & 0x0002) ? true : false;
    let ROUND_XY_TO_GRID         = (flags & 0x0004) ? true : false;
    let WE_HAVE_A_SCALE          = (flags & 0x0008) ? true : false;
    let OBSOLETE                 = (flags & 0x0010) ? true : false;
    let MORE_COMPONENTS          = (flags & 0x0020) ? true : false;
    let WE_HAVE_AN_X_AND_Y_SCALE = (flags & 0x0040) ? true : false;
    let WE_HAVE_A_TWO_BY_TWO     = (flags & 0x0080) ? true : false;
    let WE_HAVE_INSTRUCTIONS     = (flags & 0x0100) ? true : false;
    let USE_MY_METRICS           = (flags & 0x0200) ? true : false;
    let OVERLAP_COMPOUND         = (flags & 0x0400) ? true : false;

    let subglyf = { flags, glyphIndex, ARGS_1_AND_2_ARE_WORDS, ARGS_ARE_XY_VALUES, ROUND_XY_TO_GRID,
                    WE_HAVE_A_SCALE, OBSOLETE, MORE_COMPONENTS, WE_HAVE_AN_X_AND_Y_SCALE,
                    WE_HAVE_A_TWO_BY_TWO, WE_HAVE_INSTRUCTIONS, USE_MY_METRICS, OVERLAP_COMPOUND };
    let A = 1.0;
    let B = 0.0;
    let C = 0.0;
    let D = 1.0;
    let E = 0.0;
    let F = 0.0;
    let arg1 = 0;
    let arg2 = 0;

    if (ARGS_1_AND_2_ARE_WORDS) {
      arg1 = Uint16ToInt16(READINT(2, rsum, meta));
      arg2 = Uint16ToInt16(READINT(2, rsum, meta));
      subglyf  = Object.assign(subglyf, { arg1, arg2 });
    } else {
      arg1 = READINT(1, null, meta);
      arg2 = READINT(1, null, meta);
      subglyf  = Object.assign(subglyf, { arg1, arg2 });
    }

    if (WE_HAVE_A_SCALE) {
      let scale = READINT(2, rsum, meta);
      A = scale / 16384.0;
      D = A;
      subglyf   = Object.assign(subglyf, { scale });
    }

    if (WE_HAVE_AN_X_AND_Y_SCALE) {
      let x_scale = READINT(2, rsum, meta);
      let y_scale = READINT(2, rsum, meta);
      A = x_scale;
      D = y_scale;
      subglyf     = Object.assign(subglyf, { x_scale, y_scale });
    }

    if (WE_HAVE_A_TWO_BY_TWO) {
      A   = READINT(2, rsum, meta);
      B   = READINT(2, rsum, meta);
      C   = READINT(2, rsum, meta);
      D   = READINT(2, rsum, meta);
    }

    if (ARGS_ARE_XY_VALUES) {
      E = arg1;
      F = arg2;
    }
    /* else: needs the decompressed coordinate information to compute */

    subglyf = Object.assign(subglyf, { A, B, C, D, E, F });

    subglyfs = subglyfs.concat(subglyf);

    more_components = MORE_COMPONENTS;
  } while (more_components);

  glyf[i] = Object.assign(glyf[i], { subglyfs });

  return true;
}

function parseGlyf(i, glyf, meta)
{
  let offset = meta.ttf.tables.loca.offsets[i];
  if (offset < 0 || offset > meta.tables['glyf'].length) {
    console.error("out of bounds loca[" + i + "] offset: " + offset + "(glyf.length: " + meta.tables['glyf'].length + ")");
    return false;
  }
  if (offset == meta.ttf.tables.loca.offsets[i+1]) {
    glyf[i] = null;
    return true;
  }
  meta.offset = offset + meta.tables['glyf'].offset;
  let numberOfContours = Uint16ToInt16(READINT(2, rsum, meta));
  let xMin             = Uint16ToInt16(READINT(2, rsum, meta));
  let yMin             = Uint16ToInt16(READINT(2, rsum, meta));
  let xMax             = Uint16ToInt16(READINT(2, rsum, meta));
  let yMax             = Uint16ToInt16(READINT(2, rsum, meta));

  glyf[i] = { numberOfContours, xMin, yMin, xMax, yMax };
  if (numberOfContours == -1) {
    return parseCompoundGlyf(i, glyf, meta);
  }
  return parseSimpleGlyf(i, glyf, meta);
}

function parseGlyfTable(meta)
{
  console.log("parseGlyfTable()");
  if (meta.tables['glyf'] == undefined)
    return true;

  let glyf = [];
  let i;
  for (i=0; i<meta.numGlyphs; i++) {
    if (!parseGlyf(i, glyf, meta)) {
      return false;
    }
  }

  meta.ttf.tables.glyf = glyf;
  return true;
}

function Uint8ToInt8(n)
{
  return (n << 24) >> 24;
}

function parsePCLTTable(meta)
{
  console.log("parsePCLTTable()");
  if (meta.tables['PCLT'] == undefined)
    return true;

  meta.offset = meta.tables['PCLT'].offset;

  let majorVersion = READINT(2, rsum, meta);
  let minorVersion = READINT(2, rsum, meta);
  let fontNumber   = READINT(4, rsum, meta);
  let pitch        = READINT(2, rsum, meta);
  let xHeight      = READINT(2, rsum, meta);
  let style        = READINT(2, rsum, meta);
  let typeFamily   = READINT(2, rsum, meta);
  let capHeight    = READINT(2, rsum, meta);
  let symbolSet    = READINT(2, rsum, meta);
  let typeface     = []
  for (let i=0; i<16; i++) {
    typeface[i]    = Uint8ToInt8(READINT(1, null, meta));
  }
  let characterComplement = [];
  for (let i=0; i<8; i++) {
    characterComplement[i] = Uint8ToInt8(READINT(1, null, meta));
  }
  let fileName = [];
  for (let i=0; i<6; i++) {
    fileName[i] = Uint8ToInt8(READINT(1, null, meta));
  }
  let strokeWeight = READINT(1, null, meta);
  let widthType    = READINT(1, null, meta);
  let serifStyle   = Uint8ToInt8(READINT(1, null, meta));
  let reserved     = Uint8ToInt8(READINT(1, null, meta));

  meta.ttf.tables.PCLT = { majorVersion, minorVersion, fontNumber, pitch, xHeight, style, typeFamily,
                           capHeight, symbolSet, typeface, characterComplement, fileName, strokeWeight,
                           widthType, serifStyle, reserved };

  return true;
}

function parse(meta)
{
  if (parseTables(meta) &&
      parseHeadTable(meta) &&
      parseCmapTable(meta) &&
      parseMaxpTable(meta) &&
      parseLocaTable(meta) &&
      parseGlyfTable(meta) &&
      parsePCLTTable(meta)) {
    return [ JSON.stringify(meta.ttf, null, 2), meta.ttf.tables.cmap ];
  }
}

function lookup_cmap_glyph_sub(cmap, char_code)
{
  switch (cmap.format) {
    case 4:
      let i;
      let length = cmap.startCode.length;
      if (length != cmap.endCode.length) {
        console.error("cmap length mismatch startCode != endCode");
        return null;
      }
      if (length != cmap.idRangeOffset.length) {
        console.error("cmap length mismatch startCode != idRangeOffset");
        return null;
      }
      if (length != cmap.idDelta.length) {
        console.error("cmap length mismatch startCode != idDelta");
        return null;
      }
      for (i=0; i<length; i++) {
        if (cmap.startCode[i] <= char_code && char_code <= cmap.endCode[i]) {
          break;
	}
      }
      if (i == length) {
        return null;
      }
      if (cmap.idRangeOffset[i] == 0) {
        return cmap.idDelta[i] + char_code;
      }
      let index_offset = i + cmap.idRangeOffset[i] / 2 + (char_code - cmap.startCode[i]);
      if (index_offset < cmap.idRangeOffset.length) {
        return cmap.idRangeOffset[index_offset];
      }
      if (index_offset - length < cmap.glyphIdArray.length) {
        return cmap.glyphIdArray[index_offset - length];
      }
      console.log("dropping index_offset: " + index_offset + "length: " + length );
      return null;
      break;
    case 6:
      if (cmap.firstCode <= char_code && char_code < (cmap.firstCode + cmap.entryCount)) {
        return cmap.glyphIdArray[char_code - cmap.firstCode];
      }
      return null;
    default:
      console.error("(Lookup) Unhandled format: " + cmap.format);
      break;

  }
}

function lookup_cmap_glyph(cmap, char_code)
{
  let ret = null;
  for (let i=0; i<cmap.subtables.length; i++) {
    ret = lookup_cmap_glyph_sub(cmap.subtables[i], char_code);
    if (ret != null) {
      break;
    }
  }
  return ret;
}

function build_glyph_index(cmap)
{
  let gis = { }
  for (let i=0; i<65536; i++) {
    let gi = lookup_cmap_glyph(cmap, i);
    if (gi == null || gi == 0) {
      continue;
    }
    gis[i] = gi;
  }
  return gis;
}

