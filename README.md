# CTM

## API configuration

The frontend uses the same origin for API requests by default, which works when
the Express server serves the built frontend. During Vite development, `/api`
requests are proxied to `http://localhost:5000`.

If the frontend and API are deployed on different hosts, set
`VITE_API_BASE_URL` to the API host before building the frontend. Vite embeds
this value at build time, so configure it in the frontend hosting platform;
the local `.env` file is ignored by Git and is not deployed.
