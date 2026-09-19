# AARU ARENA

## Multiplayer server

Run the WebSocket server locally in a second terminal:

```bash
npm run multiplayer
```

The server generates six-character room codes, supports up to 10 players per room, and passes host start signals and player positions to the game.

For a deployed frontend, set `VITE_WS_URL` to the public `wss://` URL of the deployed WebSocket server. Vercel serves the frontend, but it does not run this long-lived WebSocket process.

The included `render.yaml` can deploy the WebSocket server to Render. After deployment:

1. Copy the Render service URL and change it to `wss://`.
2. Add it as the Vercel environment variable `VITE_WS_URL`.
3. Redeploy the Vercel frontend.

Without this variable, multiplayer intentionally shows `SERVER URL REQUIRED` on the deployed site. Local development automatically uses `ws://localhost:3001`.

## Frontend

```bash
npm run dev
npm run build
```

The multiplayer entry is available from the deployment screen through the `MULTIPLAYER` button.

---

The project is built with React and Vite.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
