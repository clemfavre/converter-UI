# ldr_to_lbcode.py
import sys
from math import isclose

LDU_WIDTH = 20
LDU_DEPTH = 20
LDU_HEIGHT = 24

# Rotation matrices as in LDRConv.cpp
TOWARDS_X       = ( 1.0, 0.0, 0.0,
                    0.0, 1.0, 0.0,
                    0.0, 0.0, 1.0)

TOWARDS_X_ALT   = (-1.0, 0.0, 0.0,
                    0.0, 1.0, 0.0,
                    0.0, 0.0,-1.0)

TOWARDS_Y       = ( 0.0, 0.0, 1.0,
                    0.0, 1.0, 0.0,
                   -1.0, 0.0, 0.0)

TOWARDS_Y_ALT   = ( 0.0, 0.0,-1.0,
                    0.0, 1.0, 0.0,
                    1.0, 0.0, 0.0)


def floats_equal_matrix(m, ref, eps=1e-6):
    """Compare two 3x3 matrices (9 floats) with a small tolerance."""
    return all(isclose(m[i], ref[i], abs_tol=eps) for i in range(9))


def parse_type1_line(line):
    """
    Parse a type-1 LDraw line.
    Returns (x, y, z, [9 matrix floats]) or None if the line is not valid / not type 1.
    Expected simplified format:
      1 color x y z a b c d e f g h i <filename>
    """
    parts = line.strip().split()
    if not parts:
        return None

    # Line type
    try:
        t = int(parts[0])
    except ValueError:
        return None

    if t != 1:
        # Ignore non-type-1 lines (same behavior as LDRConv)
        return None

    # We need at least: 1, color, x, y, z, then 9 matrix elements
    if len(parts) < 14:
        return None

    try:
        # We ignore the color for the conversion
        # color = int(parts[1])
        x = float(parts[2])
        y = float(parts[3])
        z = float(parts[4])

        # 3x3 matrix from parts[5] ... parts[13]
        m = [float(parts[5 + i]) for i in range(9)]
    except ValueError:
        return None

    return x, y, z, m


def convert(input_path, output_path):
    # Each entry: (rot, grid_x, grid_y, grid_z)
    parts = []

    # Bounds used to recenter the model
    min_x = float("inf")
    max_x = float("-inf")
    min_y = float("inf")
    max_y = float("-inf")

    with open(input_path, "r") as f:
        for line in f:
            parsed = parse_type1_line(line)
            if parsed is None:
                continue

            x, y, z, m = parsed

            # Determine orientation (same logic as LDRConv with is_towards_x)
            if floats_equal_matrix(m, TOWARDS_X) or floats_equal_matrix(m, TOWARDS_X_ALT):
                is_towards_x = True
            elif floats_equal_matrix(m, TOWARDS_Y) or floats_equal_matrix(m, TOWARDS_Y_ALT):
                is_towards_x = False
            else:
                # Unsupported orientation: skip this brick
                # (C++ version would return an error instead)
                continue

            # Coordinate mapping LDraw → printer space
            # Studio   LDraw   Printer
            #  +X       +X        +X
            #  +Y       +Y        -Z
            #  +Z       -Z        +Y
            pos_x = round(x)
            pos_y = round(-z)
            pos_z = round(-y)

            # Discrete grid conversion (same idea as ConvertLDRPosition)
            if is_towards_x:
                lx = int((pos_x - 2 * LDU_WIDTH) / LDU_WIDTH)
                ly = int((pos_y - LDU_DEPTH) / LDU_DEPTH)
            else:
                lx = int((pos_x - LDU_WIDTH) / LDU_WIDTH)
                ly = int((pos_y + LDU_DEPTH) / LDU_DEPTH)

            lz = int((pos_z - LDU_HEIGHT) / LDU_HEIGHT)

            rot = 0 if is_towards_x else 1

            parts.append((rot, lx, ly, lz))

            # Update area bounds (equivalent to UpdateContextArea)
            if is_towards_x:
                width = 4
                depth = 2
                part_min_y = ly
                part_max_y = ly + depth
            else:
                width = 2
                depth = 4
                # Note: dpos.y - (depth - 1) in C++
                part_min_y = ly - (depth - 1)
                part_max_y = ly

            part_min_x = lx
            part_max_x = lx + width

            min_x = min(min_x, part_min_x)
            max_x = max(max_x, part_max_x)
            min_y = min(min_y, part_min_y)
            max_y = max(max_y, part_max_y)

    if not parts:
        # No valid bricks in the file
        raise RuntimeError("No valid bricks found in LDR file.")

    # Recenter like in DoConversion (p.pos.x -= ctx.min_x, p.pos.y -= ctx.min_y)
    recentered = []
    for rot, lx, ly, lz in parts:
        recentered.append((rot, lx - int(min_x), ly - int(min_y), lz))

    # Sort by layer: z, then x, then y (same as PartInfo::operator< in LDRConv)
    # (rot, x, y, z) → sort key (z, x, y)
    recentered.sort(key=lambda p: (p[3], p[1], p[2]))

    # Final width/height after recentering
    width_final = int(max_x - min_x)
    height_final = int(max_y - min_y)

    # Write .lbcode file
    with open(output_path, "wb") as out:
        # Header: max_x, max_y (after recentering)
        out.write(width_final.to_bytes(2, byteorder="little", signed=False))
        out.write(height_final.to_bytes(2, byteorder="little", signed=False))

        # Then each brick: 1 byte rot, 2 bytes x, 2 bytes y, 2 bytes z
        for rot, x, y, z in recentered:
            out.write(bytes([rot]))
            out.write(int(x).to_bytes(2, byteorder="little", signed=True))
            out.write(int(y).to_bytes(2, byteorder="little", signed=True))
            out.write(int(z).to_bytes(2, byteorder="little", signed=True))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python ldr_to_lbcode.py <input.ldr> <output.lbcode>")
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2])
