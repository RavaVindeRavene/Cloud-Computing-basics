const amqp = require('amqplib/callback_api');
const express = require('express')
const fs = require('fs');
const http = require('http');
const https = require('https');
const Minio = require('minio')
const app = express()
app.use(express.urlencoded({extended: false}));
app.use(express.json());

var minioClient = new Minio.Client({
	endPoint: 'minio',
	port: 9000,
	useSSL: false,
	accessKey: 'minioadmin',
	secretKey: 'minioadmin'
});

minioClient.makeBucket('ccgrupasdarbs', function(err) {
	if (err) return console.log('Neizdevās izveidot bucket', err)
	console.log('Bucket jau gatavs')
})

var queue = 'ccgrupasdarbs';

function reply(res, msg, statusCode = 200) {
	return new Promise((resolve) => {
		res.status(statusCode)
		res.end(msg.toString());
		resolve()
	})
}

function FileDownload(srcUrl) {
	const filename = srcUrl.split("/").pop()
	const file = fs.createWriteStream(filename);
	return new Promise((res) => {
			https.get(srcUrl, (res2) => {
				{
					res2.pipe(file).on("finish", () => {
						res(filename)
					})
				}
			})
		}
	)}

function FileDelete(filename, path = "./") {
	return new Promise((resolve) => {
		fs.unlink(path + filename, (err) => {{
			resolve()
		}
		})
	})
}

setTimeout(() => {
	amqp.connect('amqp://rabbitmq:5672', function(err, conn) {
		if (err) {
			throw err;
		}

		conn.createChannel(function(err, channel) {
			if (err) {
				throw err;
			}
			channel.assertQueue(queue, {durable: true});
			channel.consume(queue, function(msg) {
				const opts = {
					hostname: "openalpr",
					port: "6505",
					path: "/api/plate",
					method: "POST",
					headers: {
						"Content-Type": "application/json"
					}
				};
				var reqOpenalpr = http.request(opts).on("error", (err) => {
					console.log("Kļūda\n" + err);
				});
				reqOpenalpr.write(msg.content);
				reqOpenalpr.end();
			}, {noAck: true});
			app.post("/api/:action(input|output)", (request, response) => {
				let data = {}
				if (request.body.email && request.params["action"] == "output") {
					data.email = request.body.email
				}
				FileDownload(request.body.url).then(filename => {
					minioClient.fPutObject('ccgrupasdarbs', filename, filename, function (err, etag) {
						if (err) { console.log(err)
						} else {
							console.log('Saņemts')
							FileDelete(filename)
							data.file = request.body.url.split("/").pop()
							channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)));
						}
					})
				}).then(() => {
					reply(response, "Izpildīts\n")
				}).catch(err => {
					reply(response, err, 500)
				})
			})
		});
	});
}, 10000)

const port = 5150
app.listen(port, () => console.log("App listening on " + port))