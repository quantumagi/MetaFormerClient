# Use the official Node.js 14 image as a base
FROM node:14

# Set the working directory in the container
WORKDIR /app

# Copy the rest of your app's source code from your host to your image filesystem.
COPY frontend .

# Install npm dependencies
RUN npm install

# Expose the port the app runs on
EXPOSE 3000

# Command to run your app
CMD ["npm", "start"]
