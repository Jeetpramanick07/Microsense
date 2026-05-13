from ultralytics import YOLO

# Load official YOLO11 nano model
model = YOLO("yolo11n.pt")

print("YOLO11n model loaded successfully")

# Show model task
print("Model task:", model.task)