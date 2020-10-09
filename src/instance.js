const dockerNames = require('docker-names');
module.exports.component = 'Config';
module.exports.instance = dockerNames.getRandomName();
