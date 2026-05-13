from pathlib import Path
import shutil
import yaml

SRC = Path(r"D:/Microsense/raw_dataset/yolo26_download/extracted")
DST = Path(r"D:/Microsense/dataset")

SPLIT_MAP = {
    "train": "train",
    "valid": "val",
    "test": "test"
}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def reset_folder(path: Path):
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def polygon_to_bbox(coords):
    """
    Converts polygon coordinates:
    x1 y1 x2 y2 x3 y3 ...
    into YOLO bbox:
    x_center y_center width height
    """

    xs = coords[0::2]
    ys = coords[1::2]

    x_min = max(0.0, min(xs))
    y_min = max(0.0, min(ys))
    x_max = min(1.0, max(xs))
    y_max = min(1.0, max(ys))

    width = x_max - x_min
    height = y_max - y_min

    x_center = x_min + width / 2
    y_center = y_min + height / 2

    return x_center, y_center, width, height


def convert_label_file(src_label: Path, dst_label: Path):
    converted_lines = []
    polygon_count = 0
    bbox_count = 0
    skipped_count = 0

    if not src_label.exists():
        dst_label.write_text("")
        return polygon_count, bbox_count, skipped_count

    content = src_label.read_text().strip()

    if not content:
        dst_label.write_text("")
        return polygon_count, bbox_count, skipped_count

    for line in content.splitlines():
        parts = line.strip().split()

        if len(parts) < 5:
            skipped_count += 1
            continue

        class_id = parts[0]

        try:
            values = list(map(float, parts[1:]))
        except ValueError:
            skipped_count += 1
            continue

        # Already YOLO bbox format
        if len(parts) == 5:
            x, y, w, h = values
            bbox_count += 1

        # Polygon format: class + x1 y1 x2 y2 ...
        elif len(values) >= 6 and len(values) % 2 == 0:
            x, y, w, h = polygon_to_bbox(values)
            polygon_count += 1

        else:
            skipped_count += 1
            continue

        # Remove invalid boxes
        if w <= 0 or h <= 0:
            skipped_count += 1
            continue

        # Clamp all values into YOLO range
        x = min(max(x, 0.0), 1.0)
        y = min(max(y, 0.0), 1.0)
        w = min(max(w, 0.0), 1.0)
        h = min(max(h, 0.0), 1.0)

        converted_lines.append(
            f"{class_id} {x:.6f} {y:.6f} {w:.6f} {h:.6f}"
        )

    dst_label.write_text("\n".join(converted_lines))

    return polygon_count, bbox_count, skipped_count


def copy_and_convert_split(src_split: str, dst_split: str):
    src_img_dir = SRC / src_split / "images"
    src_lbl_dir = SRC / src_split / "labels"

    dst_img_dir = DST / "images" / dst_split
    dst_lbl_dir = DST / "labels" / dst_split

    dst_img_dir.mkdir(parents=True, exist_ok=True)
    dst_lbl_dir.mkdir(parents=True, exist_ok=True)

    image_count = 0
    total_polygons = 0
    total_bboxes = 0
    total_skipped = 0

    if not src_img_dir.exists():
        print(f"Missing image folder: {src_img_dir}")
        return

    for img in src_img_dir.iterdir():
        if img.suffix.lower() not in IMAGE_EXTENSIONS:
            continue

        image_count += 1

        shutil.copy2(img, dst_img_dir / img.name)

        src_label = src_lbl_dir / f"{img.stem}.txt"
        dst_label = dst_lbl_dir / f"{img.stem}.txt"

        polygons, bboxes, skipped = convert_label_file(src_label, dst_label)

        total_polygons += polygons
        total_bboxes += bboxes
        total_skipped += skipped

    print(f"\n{src_split} → {dst_split}")
    print(f"Images copied: {image_count}")
    print(f"Polygon labels converted: {total_polygons}")
    print(f"Already bbox labels copied: {total_bboxes}")
    print(f"Skipped invalid labels: {total_skipped}")


def create_data_yaml():
    data = {
        "path": "D:/Microsense/dataset",
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "names": {
            0: "Microplastic Particle"
        }
    }

    with open(DST / "data.yaml", "w") as f:
        yaml.dump(data, f, sort_keys=False)


def main():
    print("Converting YOLO26 polygon labels into YOLO object-detection bbox labels...")

    reset_folder(DST)

    for src_split, dst_split in SPLIT_MAP.items():
        if (SRC / src_split).exists():
            copy_and_convert_split(src_split, dst_split)
        else:
            print(f"Missing split: {src_split}")

    create_data_yaml()

    print("\nConversion complete.")
    print("Final detection-ready dataset created at:")
    print(DST)
    print("\nNext: run check_labels.py again.")


if __name__ == "__main__":
    main()