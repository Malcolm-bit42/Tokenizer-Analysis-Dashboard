FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

# Copy rest of the files for fallback/production builds
COPY . .

# Expose Vite/React port
EXPOSE 5173

CMD ["npm", "run", "dev"]
