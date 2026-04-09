FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run seed && node dist/main"]
