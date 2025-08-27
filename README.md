# Treatment Handout Builder

A simple static website to build printable, picture‑assisted treatment handouts.

How to run
- Option A (no server): Double‑click `index.html`. If the medication list does not load, the app will use a built‑in sample list.
- Option B (recommended): Run a local server so `data/medications.json` and images load normally.
  - If you have Node.js: `npx serve -p 8080` then open `http://localhost:8080`
  - If you have Python: `python -m http.server 8080` then open `http://localhost:8080`

Customize medications
- Put your medication images in the `images/` folder.
- Edit `data/medications.json` and set the `image` path to match your filenames. Example:
```json
{
  "name": "Acetaminophen 500 mg",
  "image": "images/acetaminophen-500.png",
  "aliases": ["Tylenol 500", "Paracetamol"]
}
```

Privacy
- This is a static site; no backend or analytics. Drafts are saved locally in your browser `localStorage`.

Bulk import medications
- Option A: From CSV
  - Prepare a CSV like `tools/sample_medications.csv` with columns: `name,image,aliases` (aliases separated by `;`).
  - Run: `python tools/bulk_import.py --csv tools/sample_medications.csv --images images --out data/medications.json`
- Option B: From images folder only
  - Put all images into `images/` with descriptive filenames (e.g., `amoxicillin-500.png`).
  - Run: `python tools/bulk_import.py --images images --out data/medications.json`
  - The script will infer display names from filenames and create entries.



