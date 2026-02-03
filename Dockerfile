# Use Apify's Playwright image with Chrome pre-installed
FROM apify/actor-node-playwright-chrome:20

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev --omit=optional

# Copy source files
COPY . ./

# Run the actor
CMD ["npm", "start"]
