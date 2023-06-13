const fs = require('fs');
const needle = require('needle');
const queue = require('better-queue');
	
const {
	access,
	readFile,
	writeFile,
	mkdir,
} = fs.promises;

const loginFrom = "https://undercards.net/SignIn";
const questsFrom = "https://undercards.net/Quests";
const skinsFrom = "https://undercards.net/CardSkinsConfig?action=shop";
const languageFileFromStart = "https://undercards.net/translation/";
const artifactsFrom = "https://undercards.net/DecksConfig"

const availableLanguages = ["en", "fr", "es", "pt", "cn", "it", "pl", "de", "ru"];

/*
function loadChanges(secret = '[]', skipCommit = '') {
	return new Promise((resolve, reject) => {
		var users = JSON.parse(secret);
		var res = 0;
		for (var i=0; i < users.length; i++) {
			collect(users[i].login, users[i].password).then((data) => {
				res++;
				if (res >= users.length) {
					resolve();
				}
			});
		}
	})
}
*/

function loadChanges(secret = '[]', skipCommit = '') {
	return new Promise((resolve, reject) => {
		var users = JSON.parse(secret);
		function c(i) {
			collect(users[i].login, users[i].password, i == 0).then((data) => {
				if (i >= users.length - 1) {
					fs.writeFile("latestCommit.json", JSON.stringify(saveDatas), function (err) {
						if (err) throw err;
						console.log("Commit File Saved! Finishing . . . ");
						resolve();
					});
				} else {
					c(i+1);
				}
			});
		}
		c(0);
	})
}

var saveDatas = [];

function collect(username, password, firstOne) {
	return new Promise((resolve, reject) => {
		needle('post', loginFrom, {login: username, password: password, stayConnected: "on"}).then(function (logData) {
			needle('get', questsFrom, logData).then(function (data) {
				console.log("Quest page loaded for user " + username + "!");
				var count = (data.body.match(/dailyClaimed/g) || []).length;
				console.log("Daily Rewards Claimed: " + count + "/28");
				var saveData = {
					timestamp: Date.now(),
					dailyRewardsClaimed: count,
					time: new Date().toUTCString(),
					username : username
				};
				saveDatas.push(saveData);
				if (!firstOne) {
					resolve();
					return;
				}
				needle('get', skinsFrom, logData).then(function(skinData) {
					//console.log(typeof(skinData.body), typeof(skinData.body.cardSkins));
					var skinsArray = JSON.parse(skinData.body.cardSkins);
					//var writeArray = skinsArray.map((skin) => {skin.id, skin.name, });
					fs.writeFile("allSkins.json", JSON.stringify(skinsArray), function (err) {
						if (err) throw err;
						console.log("Skins File Saved!");
						saveLanguageFiles(logData).then(() => {
							saveAllArtifacts(logData).then(() => {
								resolve();
							});
						})
					});

				})
			})
		});
	});
}

function saveLanguageFiles(logData) {
	return new Promise((resolve, reject) => {

		function get(index) {
			var language = availableLanguages[index];
			needle('get', languageFileFromStart + language + ".json", logData).then(function(langData) {
				fs.writeFile("languages/" + language + ".json", JSON.stringify(langData.body), function (err) {
					if (err) throw err;
					console.log(language + " file saved!");
					if (index >= availableLanguages.length - 1) {
						resolve();
					} else {
						get(index+1);
					}
				});
			})
		}
		get(0);
	})
}

function saveAllArtifacts(logData) {
	return new Promise((resolve, reject) => {
		needle('get', artifactsFrom, logData).then(function(artData) {
			fs.writeFile("allArtifacts.json", artData.body.allArtifacts, function (err) { // Onu for some reason pre-strings JSON when sending it. For this ONE usecase, it's actually good for me.
				if (err) throw err;
				console.log("allArtifacts saved!");
				resolve();
			});
		})
	})
}


loadChanges(...process.argv.slice(2)).catch((e) => {
	console.error(e);
	process.exit(1);
});
