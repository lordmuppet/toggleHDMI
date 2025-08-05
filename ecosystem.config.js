// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'togglehdmi',
    script: './index.js',            // or your entry .js
    cwd: '/home/pi/GitHubRepos/toggleHDMI',
    interpreter: '/home/pi/.nvm/versions/node/v22.16.0/bin/node',
    env_file: '/home/pi/GitHubRepos/toggleHDMI/.env',
    env: {
      NODE_ENV: 'production',
      // any other vars you need…
    }
  }]
};