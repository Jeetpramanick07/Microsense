from pathlib import Path

ROOT = Path(r"D:/Microsense/dataset")

label_dirs = [
    ROOT / "labels" / "train",
    ROOT / "labels" / "val",
    ROOT / "labels" / "test"
]

bad_lines = []
total_files = 0
empty_files = 0
total_boxes = 0

for label_dir in label_dirs:
    if not label_dir.exists():
        continue

    for txt in label_dir.glob("*.txt"):
        total_files += 1
        content = txt.read_text().strip()

        if not content:
            empty_files += 1
            continue

        for line_no, line in enumerate(content.splitlines(), start=1):
            parts = line.strip().split()

            if len(parts) != 5:
                bad_lines.append((txt, line_no, len(parts), line))
                continue

            try:
                class_id = int(float(parts[0]))
                x, y, w, h = map(float, parts[1:])
            except ValueError:
                bad_lines.append((txt, line_no, "non-numeric", line))
                continue

            if class_id != 0:
                bad_lines.append((txt, line_no, "wrong-class-id", line))
                continue

            if not all(0 <= v <= 1 for v in [x, y, w, h]):
                bad_lines.append((txt, line_no, "out-of-range", line))
                continue

            if w <= 0 or h <= 0:
                bad_lines.append((txt, line_no, "invalid-size", line))
                continue

            total_boxes += 1

print("Total label files:", total_files)
print("Empty label files:", empty_files)
print("Total valid boxes:", total_boxes)
print("Bad label lines:", len(bad_lines))

if bad_lines:
    print("\nBad examples:")
    for item in bad_lines[:20]:
        print(item)
else:
    print("\nAll converted labels are YOLO object-detection ready.")