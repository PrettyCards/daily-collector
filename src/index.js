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
		var onuVersion = false;
		var myVersion = false;

		function resolveIfDone() {
			if (onuVersion && myVersion) {
				resolve();
			}
		}

		needle('get', artifactsFrom, logData).then(function(artData) {
			fs.writeFile("allArtifacts.json", artData.body.allArtifacts, function (err) { // Onu for some reason pre-strings JSON when sending it. For this ONE usecase, it's actually good for me.
				if (err) throw err;
				console.log("allArtifacts saved!");
				onuVersion = true;
				resolveIfDone();
			});
			var processedArtifacts = JSON.parse(artData.body.allArtifacts);
			processedArtifacts.forEach((art) => {
				SetAdditionalDataForArtifact(art);
			});
			fs.writeFile("allArtifactsProcessed.json", JSON.stringify(processedArtifacts), function (err) { // Onu for some reason pre-strings JSON when sending it. For this ONE usecase, it's actually good for me.
				if (err) throw err;
				console.log("allArtifactsProcessed saved!");
				myVersion = true;
				resolveIfDone();
			});
		})
	})
}

function SetAdditionalDataForArtifact(artifact) {
	//artifact.isImageBig = false; // Unneeded
	if (artifact.unavailable) {
		artifact.rarity = "TOKEN";
	} else {
		artifact.rarity = artifact.legendary ? "LEGENDARY" : "COMMON";
	}

	if (artifact.rarity == "LEGENDARY") {
		artifact.backgroundClass = "PrettyCards_ArtBG_Legendary";
	}

	// Merges current artifact data with additional data.
	for (var i=0; i < hardcodedArtifactData.length; i++) {
		var data = hardcodedArtifactData[i];
		if (data.id === artifact.id) {
			for (var key in data) {
				artifact[key] = data[key];
			}
			break;
		}
	}
	delete artifact.legendary;
	delete artifact.unavailable;
	delete artifact.custom;
	delete artifact.disabled;
	delete artifact.cost;
	/*
	for (var i=0; i < keysToDeleteFromArtifacts.length; i++) {
		delete artifact[keysToDeleteFromArtifacts[i]];
	}
	*/
}

const hardcodedArtifactData = [
	{id:  1, rarity: "BASE"},
	{id:  2, rarity: "BASE"},
	{id:  3, rarity: "BASE"},
	{id:  4, rarity: "BASE"},
	{id:  6, rarity: "BASE"},
	{id:  9, isImageBig: true},
	{id: 45, isImageBig: true},
	{id: 25, rarity: "DETERMINATION", ownerId: 28 , backgroundClass: "PrettyCards_ArtBG_Genocide"},  		// Genocide
	{id: 34, rarity: "DETERMINATION", ownerId: 505, backgroundClass: "PrettyCards_ArtBG_DarkFountain"}, 	// Outbreak/Dark Fountain
	{id: 43, rarity: "DETERMINATION", ownerId: 688, backgroundClass: "PrettyCards_ArtBG_UltimateFusion"}, 	// Ultimate Fusion
	{id: 46, rarity: "DETERMINATION", ownerId: 717, backgroundClass: "PrettyCards_ArtBG_FreeKromer"}, 		// FREE KROMER
	// Frisk Artifacts
	{id: 60, rarity: "DETERMINATION", ownerId: 65, backgroundClass: "PrettyCards_ArtBG_WornDagger", soul: "DETERMINATION"}, 		// Worn Dagger
	{id: 56, rarity: "DETERMINATION", ownerId: 65, backgroundClass: "PrettyCards_ArtBG_ToughGlove", soul: "BRAVERY"}, 				// Tough Glove
	{id: 59, rarity: "DETERMINATION", ownerId: 65, backgroundClass: "PrettyCards_ArtBG_EmptyGun", soul: "JUSTICE"},  				// Empty Gun
	{id: 58, rarity: "DETERMINATION", ownerId: 65, backgroundClass: "PrettyCards_ArtBG_BurntPan", soul: "KINDNESS"}, 				// Burnt Pan
	{id: 55, rarity: "DETERMINATION", ownerId: 65, backgroundClass: "PrettyCards_ArtBG_ToyKnife", soul: "PATIENCE"}, 				// Toy Knife
	{id: 57, rarity: "DETERMINATION", ownerId: 65, backgroundClass: "PrettyCards_ArtBG_BalletShoes", soul: "INTEGRITY"}, 			// Ballet Shoes
	{id: 24, rarity: "DETERMINATION", ownerId: 65, backgroundClass: "PrettyCards_ArtBG_TornNotebook", soul: "PERSEVERANCE"}, 		// Torn Notebook
];

//const keysToDeleteFromArtifacts = ["legendary", "unavailable", "custom", "disabled", "cost"];

loadChanges(...process.argv.slice(2)).catch((e) => {
	console.error(e);
	process.exit(1);
});
