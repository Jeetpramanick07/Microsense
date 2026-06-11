import cv2

for i in range(5):
    print(f"Testing Camera {i}")

    cap = cv2.VideoCapture(i)

    if not cap.isOpened():
        print("Not available")
        continue

    ret, frame = cap.read()

    if ret:
        filename = f"camera_{i}.jpg"
        cv2.imwrite(filename, frame)
        print(f"Saved {filename}")
    else:
        print("Capture failed")

    cap.release()