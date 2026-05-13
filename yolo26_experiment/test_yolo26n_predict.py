from ultralytics import YOLO
from pathlib import Path

MODEL_PATH = r"D:/Microsense/backend/model/yolo26_best.pt"
TEST_IMAGE_DIR = Path(r"D:/Microsense/dataset/images/val")

model = YOLO(MODEL_PATH)

images = (
    list(TEST_IMAGE_DIR.glob("*.jpg")) +
    list(TEST_IMAGE_DIR.glob("*.jpeg")) +
    list(TEST_IMAGE_DIR.glob("*.png"))
)

if not images:
    raise FileNotFoundError("No validation images found.")

image_path = images[0]

print("Testing image:", image_path)

results = model.predict(
    source=str(image_path),
    conf=0.70,
    iou=0.40,
    imgsz=640,
    save=True,
    project=r"D:/Microsense/yolo26_predictions",
    name="final_test_conf70"
)

boxes = results[0].boxes

print("Detected boxes:", len(boxes))

for box in boxes:
    print({
        "class": int(box.cls[0]),
        "confidence": round(float(box.conf[0]), 4),
        "box": [round(v, 2) for v in box.xyxy[0].tolist()]
    })