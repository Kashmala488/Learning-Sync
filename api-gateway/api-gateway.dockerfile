
   FROM node:16
   WORKDIR /app
   COPY ./api-gateway .
   RUN npm install
   CMD ["npm", "start"]