// ================== Helpers ==================

function ArraysEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function toDiscreteCoord(value) {
  return Math.trunc(value);
}

function CompareParts(a, b) {
  if (a.pos.z !== b.pos.z) {
    return a.pos.z - b.pos.z;
  }
  if (a.pos.x !== b.pos.x) {
    return a.pos.x - b.pos.x;
  }
  return a.pos.y - b.pos.y;
}

// ================== Coordonates conversion ==================

function ConvertLDRPosition(apos, is_towards_x) {
  const LDU_width = 20;
  const LDU_depth = 20;
  const LDU_height = 24;

  const x = is_towards_x
    ? (apos.x - 2 * LDU_width) / LDU_width
    : (apos.x - LDU_width) / LDU_width;

  const y = is_towards_x
    ? (apos.y - LDU_depth) / LDU_depth
    : (apos.y + LDU_depth) / LDU_depth;

  const z = (apos.z - LDU_height) / LDU_height;

  return {
    x: toDiscreteCoord(x),
    y: toDiscreteCoord(y),
    z: toDiscreteCoord(z),
  };
}

function UpdateContextArea(is_towards_x, dpos, ctx) {
  const X_WIDTH = 4;
  const X_DEPTH = 2;
  const Y_WIDTH = 2;
  const Y_DEPTH = 4;

  const width = is_towards_x ? X_WIDTH : Y_WIDTH;
  const depth = is_towards_x ? X_DEPTH : Y_DEPTH;

  const min_x = dpos.x;
  const max_x = dpos.x + width;
  const min_y = dpos.y - (!is_towards_x ? depth - 1 : 0);
  const max_y = dpos.y + (is_towards_x ? depth : 0);

  ctx.min_x = Math.min(ctx.min_x, min_x);
  ctx.max_x = Math.max(ctx.max_x, max_x);
  ctx.min_y = Math.min(ctx.min_y, min_y);
  ctx.max_y = Math.max(ctx.max_y, max_y);

  return ctx;
}


function ProcessPosition(p, ctx) {
  const towards_x = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const towards_x_alt = [-1, 0, 0, 0, 1, 0, 0, 0, -1];
  const towards_y = [0, 0, 1, 0, 1, 0, -1, 0, 0];
  const towards_y_alt = [0, 0, -1, 0, 1, 0, 1, 0, 0];

  let is_towards_x;

  if (ArraysEqual(p.rotation, towards_x) || ArraysEqual(p.rotation, towards_x_alt)) {
    is_towards_x = true;
  } else if (
    ArraysEqual(p.rotation, towards_y) ||
    ArraysEqual(p.rotation, towards_y_alt)
  ) {
    is_towards_x = false;
  } else {
    throw new Error(
      `Error (line ${ctx.line_no}): The part uses an unsupported rotation configuration`
    );
  }

  const apos = {
    x: Math.round(p.x),
    y: Math.round(-p.z),
    z: Math.round(-p.y),
  };

  const dpos = ConvertLDRPosition(apos, is_towards_x);

  const encoded_orientation = is_towards_x ? 0 : 1;
  const DEFAULT_COLOR = 15;

  ctx.parts.push({
    rotation: encoded_orientation,
    pos: dpos,
    is_red: p.color === DEFAULT_COLOR,
  });

  UpdateContextArea(is_towards_x, dpos, ctx);

  return ctx;
}

function ProcessLine(line, ctx) {
  const MATRIX_ELEMENTS_COUNT = 12;

  const elements = line.trim().split(/\s+/);
  if (elements.length === 0 || elements[0] === "") return ctx;

  const type = parseInt(elements[0], 10);
  if (Number.isNaN(type)) {
    throw new Error(
      `Error (line ${ctx.line_no}): Invalid format, expected valid line type`
    );
  }

  if (type !== 1) {
    if (type !== 0) {
      console.log(
        `Warning (line ${ctx.line_no}): Unsupported type detected, ignoring line`
      );
    }
    return ctx;
  }

  if (elements.length < 15) {
    throw new Error(
      `Error (line ${ctx.line_no}): Invalid format, expected at least 15 tokens`
    );
  }

  const color = parseInt(elements[1], 10);
  if (Number.isNaN(color)) {
    throw new Error(
      `Error (line ${ctx.line_no}): Invalid format, expected valid part color`
    );
  }

  const matrix = [];
  for (let i = 0; i < MATRIX_ELEMENTS_COUNT; i++) {
    const v = parseFloat(elements[2 + i]);
    if (Number.isNaN(v)) {
      throw new Error(
        `Error (line ${ctx.line_no}): Invalid format, expected floating-point number`
      );
    }
    matrix.push(v);
  }

  const p = {
    x: matrix[0],
    y: matrix[1],
    z: matrix[2],
    rotation: [
      matrix[3],
      matrix[4],
      matrix[5],
      matrix[6],
      matrix[7],
      matrix[8],
      matrix[9],
      matrix[10],
      matrix[11],
    ],
    color,
  };

  return ProcessPosition(p, ctx);
}


function DoConversion(lines, ctx) {
  ctx.line_no = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      ctx.line_no++;
      continue;
    }

    ctx = ProcessLine(line, ctx);
    ctx.line_no++;
  }

  ctx.parts.sort(CompareParts);

  let buffer = Buffer.alloc(0);

  for (const p of ctx.parts) {
    p.pos.x -= ctx.min_x;
    p.pos.y -= ctx.min_y;

    const encoded_rotation = p.rotation | (p.is_red ? 0 : (1 << 1));

    const pbuf = Buffer.alloc(7);
    pbuf[0] = encoded_rotation & 0xff;

    pbuf[1] = p.pos.x & 0xff;
    pbuf[2] = (p.pos.x >> 8) & 0xff;
    pbuf[3] = p.pos.y & 0xff;
    pbuf[4] = (p.pos.y >> 8) & 0xff;
    pbuf[5] = p.pos.z & 0xff;
    pbuf[6] = (p.pos.z >> 8) & 0xff;

    buffer = Buffer.concat([buffer, pbuf]);
  }

  ctx.max_x -= ctx.min_x;
  ctx.max_y -= ctx.min_y;
  ctx.raw_buffer = buffer;

  return ctx;
}

function ConvertLDR(lines) {
  let ctx = {
    raw_buffer: Buffer.alloc(0),
    line_no: 0,
    min_x: Number.MAX_SAFE_INTEGER,
    max_x: Number.MIN_SAFE_INTEGER,
    min_y: Number.MAX_SAFE_INTEGER,
    max_y: Number.MIN_SAFE_INTEGER,
    parts: [],
  };

  ctx = DoConversion(lines, ctx);

  const metadata = new Uint16Array(2);
  metadata[0] = ctx.max_x & 0xffff;
  metadata[1] = ctx.max_y & 0xffff;

  return Buffer.concat([Buffer.from(metadata.buffer), ctx.raw_buffer]);
}
