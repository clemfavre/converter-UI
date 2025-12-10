
function arrayEquals(a, b) {
    if (a === b) return true; 
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function CompareParts(a, b) {
    if (a.pos.z < b.pos.z) {
        return -1;
    }
    else if (a.pos.z == b.pos.z) {
        if (a.pos.x < b.pos.x) {
            return -1;
        }
        else if (a.pos.x == b.pos.x) {
            if (a.pos.y < b.pos.y) {
                return -1;
            }
            else if (a.pos.y == b.pos.y) {
                return 0;
            }
            else {
                return 1;
            }
        }
        else {
            return 1;
        }
    }
    else {
        return 1;
    }
}

function ConvertLDRPosition(apos, is_towards_x) {
    const LDU_width = 20;
    const LDU_depth = 20;
    const LDU_height = 24;

    return is_towards_x ? {
        x: (apos.x - 2 * LDU_width) / LDU_width,
        y: (apos.y - LDU_depth) / LDU_depth,
        z: (apos.z - LDU_height) / LDU_height
    } : {
        x: (apos.x - LDU_width) / LDU_width,
        y: (apos.y + LDU_depth) / LDU_depth,
        z: (apos.z - LDU_height) / LDU_height
    };
}

function UpdateContextArea(is_towards_x, dpos, ctx) {
    const X_WIDTH = 4; 
    const X_DEPTH = 2; 
    const Y_WIDTH = 2; 
    const Y_DEPTH = 4; 

    width = is_towards_x ? X_WIDTH : Y_WIDTH; 
    depth = is_towards_x ? X_DEPTH : Y_DEPTH; 

    min_x = dpos.x; 
    max_x = dpos.x + width; 
    min_y = dpos.y - ((!is_towards_x) ? depth - 1 : 0); 
    max_y = dpos.y + (is_towards_x ? depth : 0);

    ctx.min_x = Math.min(ctx.min_x, min_x);
    ctx.max_x = Math.max(ctx.max_x, max_x);
    ctx.min_y = Math.min(ctx.min_y, min_y);
    ctx.max_y = Math.max(ctx.max_y, max_y);

    return ctx;  
}

function ProcessPosition(p, ctx) {
    const towards_x = [ 1, 0, 0, 0, 1, 0, 0, 0, 1 ];
    const towards_x_alt = [ -1, 0, 0, 0, 1, 0, 0, 0, -1 ];
    const towards_y = [ 0, 0, 1, 0, 1, 0, -1, 0, 0 ];
    const towards_y_alt = [ 0, 0, -1, 0, 1, 0, 1, 0, 0 ];

    let is_towards_x = false;

    if (arrayEquals(p.rotation, towards_x) || arrayEquals(p.rotation, towards_x_alt)) {
        is_towards_x = true;
    }
    else if (arrayEquals(p.rotation, towards_y) || arrayEquals(p.rotation, towards_y_alt)) {
        is_towards_x = false;
    }
    else {
        throw new Error("Unsupported rotation");
    }
    
    let apos = {
        x: Math.round(p.x),
        y: Math.round(-p.z),
        z: Math.round(-p.y)
    };

    let dpos = ConvertLDRPosition(apos, is_towards_x);

    let encoded_rotation = is_towards_x ? 0 : 1;
    
    const DEFAULT_COLOR = 15;

    ctx.parts.push({
        rotation: encoded_rotation,
        pos: dpos,
        is_red: p.color == DEFAULT_COLOR
    });

    ctx = UpdateContextArea(is_towards_x, dpos, ctx);

    return ctx;
}

function ProcessLine(line, ctx) {
    const MATRIX_ELEMENTS_COUNT = 12;

    var type;
    var color;

    elements = line.split(" ");

    type = parseInt(elements[0]);

    if (type != 1) {
        if (type != 1) {
            console.log(`Warning (line ${ctx.line_no}): Unsupported type detect, ignoring line`);
            return ctx;
        }
    }
    
    if (elements.length != 15) {
        throw new Error(`Invalid line format (line ${ctx.line_no})`);
    }

    color = parseInt(elements[1]);

    matrix = [];

    for (var i = 0; i < MATRIX_ELEMENTS_COUNT; i++) {
        matrix.push(parseFloat(elements[i + 2]));
    }

    let p = {
        x: matrix[0],
        y: matrix[1],
        z: matrix[2],
        rotation: [
            matrix[4], matrix[5], matrix[6],
            matrix[8], matrix[9], matrix[10],
            matrix[12], matrix[13], matrix[14]
        ],
        color: color
    };

    return ProcessPosition(p, ctx);
}

function DoConversion(lines, ctx) {
    ctx.line_no = 1; 
    
    for (i = 0; i < lines.length; i++) {
        ctx = ProcessLine(line, ctx);
        ctx.line_no += 1;
    }

    ctx.parts.sort(CompareParts);

    let buffer = Buffer.from([]);

    for (var p of ctx.parts) {
        p.pos.x -= ctx.min_x;
        p.pos.y -= ctx.min_y;

        let encoded_rotation = p.rotation | (p.is_red ? 0 : 2);

        let pbuf = new Uint8Array(7);
        pbuf[0] = encoded_rotation;
        pbuf[1] = p.pos.x & 0xFF;
        pbuf[2] = (p.pos.x >> 8) & 0xFF;
        pbuf[3] = p.pos.y & 0xFF;
        pbuf[4] = (p.pos.y >> 8) & 0xFF;
        pbuf[5] = p.pos.z & 0xFF;
        pbuf[6] = (p.pos.z >> 8) & 0xFF;

        buffer = Buffer.concat([buffer, Buffer.from(pbuf)]);
    }

    ctx.max_x -= ctx.min_x;
    ctx.max_y -= ctx.min_y;
    ctx.raw_buffer = buffer;

    return ctx;
}

function ConvertLDR(lines) {
    let ctx = {
        raw_buffer: [],
        line_no: 0,
        min_x: Infinity,
        max_x: -Infinity,
        min_y: Infinity,
        max_y: -Infinity,
        parts: []
    };

    ctx = DoConversion(lines, ctx);

    let metadata = new Uint16Array(2);
    metadata[0] = ctx.max_x & 0xFFFF;
    metadata[1] = ctx.max_y & 0xFFFF;

    return Buffer.concat([Buffer.from(metadata.buffer), ctx.raw_buffer]);
}
