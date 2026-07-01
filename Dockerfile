FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy prisma schema & generate client
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy source code
COPY tsconfig.json ./
COPY src ./src/

EXPOSE 3002

CMD ["npx", "ts-node-dev", "--respawn", "--transpile-only", "src/server.ts"]
