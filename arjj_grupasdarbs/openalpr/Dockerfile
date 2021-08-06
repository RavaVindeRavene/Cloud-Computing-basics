FROM openalpr/openalpr:latest
RUN apt update && apt install libssl1.0-dev npm -y && npm i express minio nodemailer
COPY index.js .
EXPOSE 8082
ENTRYPOINT ["node", "index.js"]
