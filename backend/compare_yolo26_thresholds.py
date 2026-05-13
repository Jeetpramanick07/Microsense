from app.services.detector_yolo26 import detect_with_yolo26

image_path = r"D:/Microsense/dataset/images/val/123_jpg.rf.ead67a4bc2da1c9af126917c456714e8.jpg"

thresholds = [0.50, 0.60, 0.70, 0.80]

for conf in thresholds:
    result = detect_with_yolo26(
        image_path=image_path,
        conf_threshold=conf,
        iou_threshold=0.40
    )

    print("\n-------------------------")
    print(f"Confidence: {conf}")
    print("Raw detection count:", result["raw_detection_count"])
    print("Processing time:", result["processing_time_seconds"])