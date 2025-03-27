FROM node:18

# Set the working directory
WORKDIR /usr/src/app

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build TypeScript
RUN npm run build

# Expose the port (match your PORT in .env)
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]