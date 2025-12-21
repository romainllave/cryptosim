# Use Node.js LTS
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy app source
COPY . .

# Build not needed for bot (it uses tsx directly), but good practice to have clean env
# We just need to make sure tsx is executable or run via npm script

# Expose port (Koyeb usually expects 3000 or 8080, we use process.env.PORT)
EXPOSE 3000

# Start the bot
CMD [ "npm", "run", "bot" ]
