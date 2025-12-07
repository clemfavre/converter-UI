import sys

def convert(input_path, output_path):
    buffer = []
    min_x = float("inf")
    max_x = float("-inf")
    min_y = float("inf")
    max_y = float("-inf")

    with open(input_path, "r") as file:
        for line in file:
            if not line.startswith("1 "):
                continue

            parts = line.strip().split()
            if len(parts) < 15:
                continue

            x = int(float(parts[2]))
            y = int(float(parts[3]))
            z = int(float(parts[4]))
            a = float(parts[5])
            c = float(parts[7])
            i = float(parts[11])

            # Determine orientation
            orientation = 0 if (a == 1 and c == 0 and i == 1) else 1

            # Coordinate transformation
            lx = (x - 40) // 20
            ly = (-z - 20) // 20 if orientation == 0 else (-z + 20) // 20
            lz = (-y - 24) // 24

            buffer.append((lx, ly, lz, orientation))

            # Update bounds
            min_x = min(min_x, lx)
            max_x = max(max_x, lx + (4 if orientation == 0 else 2))
            min_y = min(min_y, ly - (0 if orientation == 0 else 4))
            max_y = max(max_y, ly + (2 if orientation == 0 else 0))

    # Recenter
    for i in range(len(buffer)):
        x, y, z, o = buffer[i]
        buffer[i] = (x - min_x, y - min_y, z, o)

    with open(output_path, "wb") as out:
        out.write((max_x - min_x).to_bytes(2, byteorder='little'))
        out.write((max_y - min_y).to_bytes(2, byteorder='little'))
        for x, y, z, o in buffer:
            out.write(bytes([o]))
            out.write(x.to_bytes(2, byteorder='little'))
            out.write(y.to_bytes(2, byteorder='little'))
            out.write(z.to_bytes(2, byteorder='little'))

if __name__ == "__main__":
    convert(sys.argv[1], sys.argv[2])