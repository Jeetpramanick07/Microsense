from ultralytics import YOLO
from pathlib import Path
import shutil

DATA_YAML = r"D:/Microsense/dataset/data.yaml"
RUNS_DIR = Path(r"D:/Microsense/yolo26_runs")
BACKEND_MODEL_DIR = Path(r"D:/Microsense/backend/model")
TARGET_MODEL = BACKEND_MODEL_DIR / "yolo26_best.pt"

RUN_NAME = "microsense_yolo26n"


def find_latest_best_model():
    """
    Finds the latest YOLO26n training run folder.

    Handles folders like:
    - microsense_yolo26n
    - microsense_yolo26n-2
    - microsense_yolo26n-3
    """

    run_folders = sorted(
        RUNS_DIR.glob(f"{RUN_NAME}*"),
        key=lambda p: p.stat().st_mtime,
        reverse=True
    )

    for run_folder in run_folders:
        best_model = run_folder / "weights" / "best.pt"

        if best_model.exists():
            print(f"Latest valid run found: {run_folder}")
            return best_model

    return None


def main():
    print("Loading YOLO26n...")
    model = YOLO("yolo26n.pt")

    print("Starting MicroSense YOLO26n training...")

    model.train(
        data=DATA_YAML,
        epochs=80,
        imgsz=640,
        batch=8,
        project=str(RUNS_DIR),
        name=RUN_NAME,
        pretrained=True,
        patience=20,
        workers=2
    )

    trained_best = find_latest_best_model()

    if trained_best:
        BACKEND_MODEL_DIR.mkdir(parents=True, exist_ok=True)
        shutil.copy2(trained_best, TARGET_MODEL)

        print("\nTraining complete.")
        print(f"Best YOLO26n model found at: {trained_best}")
        print(f"YOLO26n model copied to: {TARGET_MODEL}")
        print("YOLOv5 model remains untouched: D:/Microsense/backend/model/best.pt")
    else:
        print("\nTraining finished, but no best.pt was found.")
        print("Check folders inside:")
        print(RUNS_DIR)


if __name__ == "__main__":
    main()