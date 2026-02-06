# LiveHeart

[English](./README.md) | [中文](./README.zh-CN.md)

LiveHeart is an interactive 3D pink-heart web experience.  
Open your hand and it bursts like a heartbeat; close your fist and it gently reforms.  
With your photos and music, it becomes a playful digital love gift you can share.

If you are planning a sweet surprise for your girlfriend, this is a great fit.  
Not just "good night" in text, but a glowing heart that reacts to your gestures.

## Highlights

- Gesture controls: open hand, fist, and pinch transitions.
- 3D heart particles: rich pink gradients, bloom, and shard-like transitions.
- Romantic sound cues: built-in transition sound effects.
- Photo cloud: upload photos into the heart scene.
- Music reactive: upload songs and let bass drive the motion.

## Local Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Free Deployment (GitHub Pages)

Auto-deploy is already configured via GitHub Actions.

1. Push this project to the `main` branch of your GitHub repo.
2. Go to `Settings` -> `Pages`.
3. Set `Build and deployment` -> `Source` to `GitHub Actions`.
4. Push changes and wait for the workflow to pass.
5. Visit `https://<your-user>.github.io/<your-repo>/`.

## Notes

- Camera access requires HTTPS (GitHub Pages provides HTTPS by default).
- On first visit, allow camera permission and click once to unlock audio.
- Better lighting usually improves hand-tracking stability.

## Surprise Guide (For Your Girlfriend)

1. Prep before sharing:
- Select 8-20 photos with variety (trip moments, daily life, special dates).
- Pick one meaningful song with a soft intro and clear bass.
- Test gestures once in good lighting to avoid awkward misses.

2. 30-second demo flow:
- Start with the calm pink heart scene.
- Step 1: Open hand to trigger the shard-burst transition.
- Step 2: Pinch to focus one photo and call out that memory.
- Step 3: Fist to reform the heart.
- Finish by handing control to her.

3. Atmosphere tips:
- Dim the main room lights and keep one warm side light.
- Use full-screen mode for better immersion.
- Preload photos and music so the moment feels smooth.
