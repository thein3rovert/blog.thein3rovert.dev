# Dockerfile (for static site)

# ---- Build Stage ----
# Use an official Node.js image as the base for building
# 'alpine' versions are smaller
FROM node:22-alpine AS builder
# Set the working directory inside the container
WORKDIR /app

# Copy package.json and lock file first to leverage Docker cache
COPY package*.json ./
# Install project dependencies
RUN npm install

# Copy the rest of the application code (respects .dockerignore)
COPY . .
# Build the Astro site for production
RUN npm run build
# The static files are now in /app/dist

# ---- Runtime Stage ----
# Use an official Nginx image as the base for serving
FROM nginx:1.27-alpine AS runtime
# Set the working directory for Nginx files
WORKDIR /usr/share/nginx/html

# Remove default Nginx welcome page
RUN rm -rf ./*

# Copy the built static files from the 'builder' stage
COPY --from=builder /app/dist .

# Copy our custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (standard HTTP port)
EXPOSE 80

# Command to run Nginx in the foreground when the container starts
CMD ["nginx", "-g", "daemon off;"]
