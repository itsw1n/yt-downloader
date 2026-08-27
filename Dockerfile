# ---- Build stage: compile the React frontend ----
FROM node:20-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage: Node server + yt-dlp + ffmpeg ----
FROM node:20-slim AS runtime
WORKDIR /app

# yt-dlp needs ffmpeg to mux/merge, and python3 to install yt-dlp via pip
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip ca-certificates \
    # TikTok's web API changes often; the stable yt-dlp lags behind and breaks
    # ("Unable to extract universal data for rehydration"). The nightly build
    # tracks TikTok and includes the impersonation extra (curl_cffi) needed for
    # its JS challenge.
    && pip3 install --no-cache-dir --break-system-packages --pre "yt-dlp[impersonate]" \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the built frontend and the server
COPY --from=build /app/dist ./dist
COPY server.js ./

ENV PORT=8787
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:8787/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
