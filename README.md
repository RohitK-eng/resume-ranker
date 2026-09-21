# ResumeRank – AI-Based Resume Ranking System (Frontend)

Innovation Design Project, Review II prototype. Plain HTML/CSS/JS, no build step.

## Run locally
Open `index.html` in a browser, or run `python -m http.server 8000` and visit http://localhost:8000.

## Files
- `index.html` – layout: Rank candidates, System architecture, Progress & roadmap
- `style.css` – styles
- `app.js` – UI logic. Ranking is a **placeholder** (keyword match) in `mockRank()`.

## Connecting the AI model
In `app.js` set `USE_API = true` and `API_URL` to your backend.

Request (POST, JSON):
```json
{ "jobDescription": "...", "candidates": [ { "id": "s1", "name": "Ananya", "text": "resume text" } ] }
```
Response (JSON array):
```json
[ { "id": "s1", "score": 82, "matched": ["python"], "missing": ["docker"],
    "breakdown": { "skills": 80, "experience": 90, "education": 100 },
    "explanation": "optional plain-language reason" } ]
```
The backend must allow CORS from the frontend's domain.

## Ideas to add next
PDF/DOCX upload to the backend, real candidate database, login, compare two candidates, bias check.

## Deploy on Render
New > Static Site > connect this repo > Build command: (empty) > Publish directory: `.`
