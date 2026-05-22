# Alpine ki bajaye Slim version use karein (More Stable)
FROM node:18-slim

# Working Directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install Dependencies (Detailed logs k liye --verbose hataya hai taa k taiz ho)
RUN npm install

# Copy rest of the code
COPY . .

# Expose Port
EXPOSE 3000

# Start Server
CMD ["npm", "run", "dev", "--", "--host"]