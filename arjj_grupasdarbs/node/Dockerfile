FROM node:14.15.4-slim
# USER node
WORKDIR /home/grupasdarbs2/node
RUN npm init -y
RUN npm i express minio amqplib
COPY index.js .
EXPOSE 8081
CMD ["node", "index.js"]
