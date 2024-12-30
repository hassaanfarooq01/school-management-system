# Use the Node.js official image
FROM node:18

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the ports defined in your configuration
EXPOSE 5111 5222

# Command to start the application
CMD ["npm", "start"]
