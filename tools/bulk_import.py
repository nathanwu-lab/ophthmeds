import argparse
import csv
import json
import os
import re
import sys
from difflib import SequenceMatcher
from pathlib import Path


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif", ".html", ".htm"}


def slugify(text: str) -> str:
    text = text.lower().strip()
    # Replace separators with spaces
    text = re.sub(r"[\-_]+", " ", text)
    # Remove file extensions if present
    text = re.sub(r"\.[a-z0-9]+$", "", text)
    # Remove non-alphanumerics except spaces
    text = re.sub(r"[^a-z0-9 ]+", "", text)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(a=slugify(a), b=slugify(b)).ratio()


def find_best_image(name: str, images: list[Path]) -> Path | None:
    if not images:
        return None
    scores = [
        (similarity(name, img.stem), img)
        for img in images
    ]
    scores.sort(key=lambda x: x[0], reverse=True)
    best_score, best_img = scores[0]
    # Heuristic threshold; adjust if too strict/lenient
    return best_img if best_score >= 0.45 else None


def read_csv(csv_path: Path, aliases_sep: str) -> list[dict]:
    items: list[dict] = []
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        # Expected headers: name, image (optional), aliases (optional)
        for row in reader:
            name = (row.get("name") or "").strip()
            if not name:
                continue
            image = (row.get("image") or "").strip()
            aliases_raw = (row.get("aliases") or "").strip()
            aliases = [a.strip() for a in aliases_raw.split(aliases_sep) if a.strip()] if aliases_raw else []
            items.append({"name": name, "image": image, "aliases": []})
    return items


def scan_images(images_dir: Path) -> list[Path]:
    if not images_dir.exists():
        return []
    imgs = []
    for p in images_dir.iterdir():
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS:
            imgs.append(p)
    return imgs


def title_from_filename(filename: str) -> str:
    base = Path(filename).stem
    base = re.sub(r"[\-_]+", " ", base).strip()
    # Preserve capitalization for known abbreviations (mg, ml etc.) minimally
    words = base.split()
    titled = []
    for w in words:
        if w.isupper() or w.isdigit():
            titled.append(w)
        elif re.fullmatch(r"\d+(mg|mcg|ml)", w, flags=re.IGNORECASE):
            # Normalize like '500mg' -> '500 mg'
            m = re.match(r"(\d+)(mg|mcg|ml)", w, flags=re.IGNORECASE)
            titled.append(f"{m.group(1)} {m.group(2).lower()}")
        else:
            titled.append(w.capitalize())
    return " ".join(titled)


def build_from_csv_or_images(csv_items: list[dict], images_dir: Path) -> list[dict]:
    images = scan_images(images_dir)
    # Prepare relative POSIX paths for JSON
    def rel_img(p: Path) -> str:
        return p.as_posix()

    existing_by_name = {item["name"].strip().lower(): item for item in csv_items}

    # If CSV provided, fill missing images by best match
    if csv_items:
        for item in csv_items:
            if not item.get("image"):
                match = find_best_image(item["name"], images)
                if match is not None:
                    item["image"] = rel_img(match)
        return csv_items

    # If no CSV, build from images alone
    meds: list[dict] = []
    for img in images:
        meds.append({
            "name": title_from_filename(img.name),
            "image": rel_img(img),
            "aliases": []
        })
    return meds


def main():
    parser = argparse.ArgumentParser(description="Build data/medications.json from a CSV and/or images directory.")
    parser.add_argument("--csv", dest="csv_path", type=str, default=None, help="Path to CSV with columns: name,image(optional),aliases(optional)")
    parser.add_argument("--images", dest="images_dir", type=str, default="images", help="Images directory (default: images)")
    parser.add_argument("--out", dest="out_path", type=str, default="data/medications.json", help="Output JSON path (default: data/medications.json)")
    parser.add_argument("--aliases-sep", dest="aliases_sep", type=str, default=";", help="Separator for aliases in CSV (default: ';')")
    parser.add_argument("--dry-run", dest="dry_run", action="store_true", help="Preview output without writing file")
    args = parser.parse_args()

    images_dir = Path(args.images_dir)
    if not images_dir.exists():
        print(f"[warn] Images directory not found: {images_dir}")

    csv_items: list[dict] = []
    if args.csv_path:
        csv_path = Path(args.csv_path)
        if not csv_path.exists():
            print(f"[error] CSV not found: {csv_path}")
            sys.exit(1)
        csv_items = read_csv(csv_path, args.aliases_sep)

    meds = build_from_csv_or_images(csv_items, images_dir)

    # Basic validation
    missing_images = [m for m in meds if not m.get("image")]
    if missing_images:
        print(f"[warn] {len(missing_images)} medications have no matched image. They will be kept without image path.")

    # Sort by name
    meds_sorted = sorted(meds, key=lambda m: m.get("name", "").lower())

    # Ensure output directory exists
    out_path = Path(args.out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    output = json.dumps(meds_sorted, indent=2, ensure_ascii=False)
    if args.dry_run:
        print(output)
        return

    out_path.write_text(output, encoding="utf-8")
    print(f"[ok] Wrote {len(meds_sorted)} medications to {out_path}")


if __name__ == "__main__":
    main()
