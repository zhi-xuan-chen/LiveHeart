# LiveHeart

3D hand-gesture interactive pink heart experience (Three.js + MediaPipe Hands).

## Local Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Free Deploy (GitHub Pages)

This repo is configured for GitHub Pages auto-deploy using GitHub Actions.

1. Create a GitHub repo and push this project to branch `main`.
2. In GitHub repo settings:
   - `Settings` -> `Pages` -> `Build and deployment`
   - Set `Source` to `GitHub Actions`.
3. Push to `main` (or manually trigger workflow in `Actions` tab).
4. After workflow succeeds, open:
   - `https://<your-user>.github.io/<your-repo>/`

## Notes

- Camera access requires HTTPS (GitHub Pages is HTTPS by default).
- Users need to allow camera permission and interact with the page once to unlock audio.

