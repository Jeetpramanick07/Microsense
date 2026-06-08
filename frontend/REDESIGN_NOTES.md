# MicroSense AI-Cam Stitch-Matched React UI

This frontend rebuild follows the Google Stitch visual direction more closely:

- Light scientific dashboard theme
- Fixed desktop sidebar
- Sticky top bar
- White cards with light borders
- Stitch-like spacing, typography, cards, tables, report cards, and status cards
- Mobile bottom navigation

Backend-facing variable names are preserved in the API layer and UI labels:

- sample_source
- chamber_volume_ml
- msmi_score
- monitoring_risk_level
- raw_detection_count
- accepted_detection_count
- rejected_detection_count
- hybrid_filter_score
- image_quality_score
- original_image_url
- processed_image_url

Run locally:

```bash
npm install
npm run dev
```

Set in Vercel:

```bash
VITE_API_BASE_URL=https://microsense.onrender.com
```
