FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN sed -i 's/\r$//' /app/docker-entrypoint.sh \
    && mkdir -p /app/data /app/uploads/photos \
    && chmod +x /app/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/reserves.db

EXPOSE 3001

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["npm", "start"]
