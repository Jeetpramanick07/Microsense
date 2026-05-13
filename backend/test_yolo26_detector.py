from app.services.detector_yolo26 import analyze_image_yolo26

image_path = r"D:/Microsense/dataset/images/val/123_jpg.rf.ead67a4bc2da1c9af126917c456714e8.jpg"

result = analyze_image_yolo26(image_path)

print("Model:", result.model_name)
print("Raw detection count:", result.raw_detection_count)
print("Accepted detection count:", result.accepted_detection_count)
print("Rejected detection count:", result.rejected_detection_count)
print("Hybrid filter score:", result.hybrid_filter_score)
print("Filter summary:", result.filter_summary)
print("Final trusted count:", result.count)
print("Processed image path:", result.processed_image_path)
print("Processing time:", result.processing_time_seconds)

print("\nAccepted particles:")
for particle in result.particles:
    print(particle)