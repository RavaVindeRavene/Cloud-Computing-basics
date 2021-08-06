const express = require('express')
const bodyParser = require('body-parser')
const exec = require('child_process').exec;
const fs = require('fs');
const Minio = require('minio')
const nodemailer = require('nodemailer');

const app = express()
app.use(express.urlencoded({extended: false}));
app.use(express.json());

const minioClient = new Minio.Client({
	accessKey: 'minioadmin',
	endPoint: 'minio',
	port: 9000,
	secretKey: 'minioadmin',
	useSSL: false
})
const queueName = 'ccgrupasdarbs';
const sourceEmail = "ccarjj@fastmail.com"
const transporter = nodemailer.createTransport({
	service: 'FastMail',
	auth: {
		user: sourceEmail,
		pass: 'cgrqftjkgvxfdub6' //login ir ccarjjparole
	}
});
var mailOptions = {
	from: sourceEmail,
};

function deleteFile(fileName, path = "./") {
	return new Promise((resolve, reject) => {
		fs.unlink(path + fileName, (err) => {
			if (err) {
				console.log("Fails nav dzēsts\n" + err)
				reject("Fails nav dzēsts\n" + err)
			} else {
				resolve()
			}
		})
	})
}

function detectLicensePlate(fileName) {
	return new Promise((resolve, reject) => {
			exec('alpr -j ' + fileName, (error, stdout, stderr) => {
				if (stderr == "" && JSON.parse(stdout.toString()).results[0]) {
					resolve(JSON.parse(stdout.toString()).results[0].plate)
				} else {
					console.log("Neizdevās noteikt numurzīmi\n" + stderr.trim())
					deleteFile(fileName)
					reject("Neizdevās noteikt numurzīmi\n" + stderr.trim())
				}
			})
		}
	)}

function reply(res, msg, statusCode = 200) {
	return new Promise((resolve, reject) => {
		res.status(statusCode)
		res.end(msg.toString());
		resolve()
	})
}

let plates = new Map()

app.post('/api/plate', (req, res) => {
	minioClient.fGetObject(queueName, req.body.file, req.body.file, function(err) {
		if (err) {
			console.log(err)
			reply(res, "Kļūda", 500)
		} else {
			detectLicensePlate(req.body.file).then(plate => {
				if (req.body.email) {
					if (plates.has(plate)) {
						let timeDifference = secondsToString((new Date().getTime() - plates.get(plate).getTime())/1000)
						plates.delete(plate)

						mailOptions.to = req.body.email
						mailOptions.subject = "Numurzīme: " + plate + ", laiks: " + timeDifference
						console.log(mailOptions.subject)
						mailOptions.text = "Mēs esam leģions, mēs jūs atradām!"
						transporter.sendMail(mailOptions, function(error, info){
							if (error) {
								console.log(error);
							} else {
								console.log("Epasts nosūtīts");
							}
						});


						reply(res, "Sūta")
					} else {
						console.log("Auto nav iebraucis")
						reply(res, "Auto nav iebraucis", 500)
					}
				} else {
					if (plates.has(plate)) {
						console.log(plate + "Auto jau iebraucis")
						reply(res, "Auto jau iebraucis", 500)
					} else {
						plates.set(plate, new Date())
					}
				}
			})
		}
	})
})

function secondsToString(seconds)
{
	var numyears = Math.floor(seconds / 31536000);
	var numdays = Math.floor((seconds % 31536000) / 86400);
	var numhours = Math.floor(((seconds % 31536000) % 86400) / 3600);
	var numminutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
	var numseconds = (((seconds % 31536000) % 86400) % 3600) % 60;
	return numyears + " years " +  numdays + " days " + numhours + " hours " + numminutes + " minutes " + numseconds + " seconds";

}

const port = 6505
app.listen(port, () => console.log("Listening on port " + port + "..."))
