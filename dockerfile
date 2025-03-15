FROM node:18-alpine

WORKDIR /app

# Install Python and build dependencies needed for bcrypt
RUN apk add --no-cache python3 make g++ gcc

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the TypeScript application
RUN npm run build

# Expose the port the server runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]