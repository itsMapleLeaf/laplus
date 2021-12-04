FROM node:lts-slim

WORKDIR /app

COPY src/ ./src/
COPY package.json ./
COPY pnpm-lock.yaml ./

# make sure the directory structure is correct
RUN ls --recursive

RUN npm i -g pnpm
RUN pnpm install --prod --frozen-lockfile --verbose

CMD [ "pnpm", "start" ]
