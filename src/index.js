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
						resolve();
					});
				})
			})
		});
	});
}



loadChanges(...process.argv.slice(2)).catch((e) => {
	console.error(e);
	process.exit(1);
});
