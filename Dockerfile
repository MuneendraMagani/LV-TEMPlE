# Use official Node.js LTS image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create data directory for JSON storage
RUN mkdir -p data

# Expose port (Hugging Face uses port 7860)
EXPOSE 7860

# Set environment variable for port
ENV PORT=7860

# Start the application
CMD ["npm", "start"]
