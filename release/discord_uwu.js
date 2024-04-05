//This script is fully made by zsronx itself pls uwu give me credits

const jsonfile = require('jsonfile');
const { Client, GatewayIntentBits } = require('discord.js');
const { Client: SSHClient } = require('ssh2');

// Load the main configuration from the JSON file
let config = jsonfile.readFileSync('discord_config.json');

// Discord Client Initialization
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

client.once('ready', () => {
    console.log('Bot is ready');
    const guild = client.guilds.cache.get(config.target_guild_id);
    const channel = guild.channels.cache.get(config.target_channel_id);
    channel.send('Bot is ready!');
});


client.on('messageCreate', async (message) => {
    const args = message.content.trim().split(/ +/);
    const command = args.shift().toLowerCase();

   
    const server = config.servers.find(server => server.user_id === message.author.id);

    if (!server) {
  
        return;
    }

    if (command === '?start') {
        console.log('Start command received.');
        startScript(server, message);
    } else if (command === '?stop') {
        console.log('Stop command received.');
        stopScript(server, message);
    } else if (command === '?config') {
        console.log('Config command received.');
        updateConfig(server, message, args);
    } else if (command === '?setrestart') {
        console.log('Set Restart command received.');
        setRestartInterval(server, message, args);
    }
});

// Function to start the script on the specified server
function startScript(server, message) {
    console.log('Starting script for', server.name);
    const ssh = new SSHClient();
    const sshConfig = {
        host: server.ip_address,
        port: server.port,
        username: server.username,
        password: server.password,
    };
    // Log SSH connection details
    console.log('SSH connection details:', sshConfig);
    // Execute the SSH command to start the script
    ssh.on('ready', () => {
        console.log('SSH connection established. Executing start command.');
        ssh.exec(`cd ${server.script_folder} && screen -d -m ./${server.script}`, (err, stream) => {
            if (err) {
                console.error('Error starting the script:', err);
                message.channel.send(`Error starting the script: ${err.message}`);
            } else {
                console.log('Script started successfully');
                message.channel.send('Script started successfully');
            }
            ssh.end();
        });
    });
    ssh.on('error', (err) => {
        console.error('SSH error:', err);
        message.channel.send(`SSH error: ${err.message}`);
    });
    // Log SSH connection attempt
    console.log('Connecting to SSH server...');
    ssh.connect(sshConfig);
}

// Function to stop the script on the specified server
function stopScript(server, message) {
    console.log('Stopping script for', server.name);
    const ssh = new SSHClient();
    const sshConfig = {
        host: server.ip_address,
        port: server.port,
        username: server.username,
        password: server.password,
    };
    // Log SSH connection details
    console.log('SSH connection details:', sshConfig);
    // Execute the SSH command to stop the script
    ssh.on('ready', () => {
        console.log('SSH connection established. Executing stop command.');
        ssh.exec(`cd ${server.script_folder} && screen -ls | awk ' {print $1}' | xargs -I {} screen -X -S {} quit`, (err, stream) => {
            if (err) {
                console.error('Error stopping the script:', err);
                message.channel.send(`Error stopping the script: ${err.message}`);
            } else {
                console.log('Script stopped successfully');
                message.channel.send('Script stopped successfully');
            }
            ssh.end();
        });
    });
    ssh.on('error', (err) => {
        console.error('SSH error:', err);
        message.channel.send(`SSH error: ${err.message}`);
    });
    // Log SSH connection attempt
    console.log('Connecting to SSH server...');
    ssh.connect(sshConfig);
}

function updateConfig(server, message, args) {
    if (args.length < 2) {
        return message.channel.send('Please provide the new Slayer type and the new tier.');
    }

    const newType = args[0];
    const newValue = args[1];

    console.log('Updating server configuration:', newType, newValue);

    const ssh = new SSHClient();
    const sshConfig = {
        host: server.ip_address,
        port: server.port,
        username: server.username,
        password: server.password,
    };

    ssh.on('ready', () => {
        ssh.exec(`sed -i '3s/.*/"type": "${newType}",/' ${server.config_file}`, (err, stream) => {
            if (err) {
                console.error('Error updating the config:', err);
                message.channel.send(`Error updating the config: ${err.message}`);
            } else {
                console.log('Slayer type changed to ' + newType);
            }

            ssh.exec(`sed -i '5s/.*/"tier": ${newValue},/' ${server.config_file}`, (err, stream) => {
                if (err) {
                    console.error('Error updating the config:', err);
                    message.channel.send(`Error updating the config: ${err.message}`);
                } else {
                    console.log('Slayer tier changed successfully to ' + newValue);
                    message.channel.send('Slayer changed to ' + newValue);
                    message.channel.send('Slayer tier updated successfully to ' + newValue);
                }

                ssh.end();
            });
        });
    });

    ssh.on('error', (err) => {
        console.error('SSH error:', err);
        message.channel.send(`SSH error: ${err.message}`);
    });

    console.log('Connecting to SSH server...');
    ssh.connect(sshConfig);
}

function checkServerConsole(server) {
    console.log(`Checking server console for ${server.name}...`);
    const ssh = new SSHClient();
    const sshConfig = {
        host: server.ip_address,
        port: server.port,
        username: server.username,
        password: server.password,
    };

    ssh.on('ready', () => {
        console.log('SSH connection established. Checking server console...');
        // Execute SSH command to list log files in the log directory
        ssh.exec(`ls -lt ${server.path_to_server_logs} | grep .log`, (err, stream) => {
            if (err) {
                console.error('Error listing log files:', err);
                return;
            }

            let latestLogFile = '';

            // Capture the output of the SSH command
            stream.on('data', (data) => {
                const logFiles = data.toString().split('\n').filter(file => file.trim() !== '');
                // Get the latest log file
                if (logFiles.length > 0) {
                    // Extract the latest log file from the first line of the output
                    latestLogFile = logFiles[0].split(/\s+/).pop();
                }
            });

            stream.on('close', () => {
                if (latestLogFile) {
                    // Execute SSH command to tail the latest log file
                    ssh.exec(`tail -f ${server.path_to_server_logs}${latestLogFile}`, (err, stream) => {
                        if (err) {
                            console.error('Error checking server console:', err);
                            return;
                        }

                        stream.on('data', (data) => {
                            const consoleOutput = data.toString();
                            // Send console output to Discord channel
                            sendMessageToChannel(consoleOutput);
                        });

                        stream.stderr.on('data', (data) => {
                            console.error('Error checking server console:', data.toString());
                        });
                    });
                } else {
                    console.error('No log files found for', server.name);
                }
            });
        });
    });

    ssh.on('error', (err) => {
        console.error('SSH error:', err);
    });

    console.log('Connecting to SSH server...');
    ssh.connect(sshConfig);
}

// Check server console for both servers
config.servers.forEach(server => {
    checkServerConsole(server);
});



function sendMessageToChannel(messageContent) {
    const guild = client.guilds.cache.get(config.target_guild_id);
    if (!guild) {
        console.error('Guild not found.');
        return;
    }

    const channel = guild.channels.cache.get(config.target_channel_id);
    if (!channel) {
        console.error('Channel not found.');
        return;
    }

    if (messageContent.includes('stall')) {
        channel.send(`Server console output: \n\`\`\`${messageContent}\`\`\``)
            .then(() => {
                //console.log('Stall detected. Restarting server...');
                restartServer(server);
            })
            .catch(error => console.error('Error sending stall message:', error));
        }
}

// Function to restart the server
function restartServer(server, message) {
    console.log('Restarting server...');
    stopScript(server, message);

    // Delayed start after 10 seconds
    setTimeout(() => {
        startScript(server, message);
    }, 10000); // 10 seconds delay
}



// Check server console for both servers every 5 minutes
setInterval(() => {
    config.servers.forEach(server => {
        checkServerConsole(server);
    });
}, 10000); // 5 minutes

client.login(config.token);



// This is the auto restarter if u know how to fix u can do it, it will be included in the next update


// Function to set the restart interval for the specified server
//function setRestartInterval(server, message, args) {
//    const interval = args.join(' ');
//    if (!interval) {
//        message.channel.send('Please provide a restart interval (e.g., 5min, 1h, 10s).');
//        return;
//    }
//    console.log('Restart interval set to:', interval);
//    // Update the restart interval in the main configuration
//    server.restart_interval = interval;
//    jsonfile.writeFileSync('discord_config.json', config, { spaces: 2 });
//    message.channel.send(`Restart interval set to: ${interval}`);
//}
//
//// Check for script restart based on the configured intervals
//config.servers.forEach(server => {
//    if (server.restart_interval) {
//        const interval = parseInterval(server.restart_interval);
//        if (interval) {
//            setInterval(() => restartScript(server), interval);
//        }
//    }
//});
//
//// Function to parse the restart interval string into milliseconds
//function parseInterval(intervalString) {
//    const regex = /^(\d+)(min|h|s)$/;
//    const match = intervalString.match(regex);
//    if (!match) return null;
//
//    const value = parseInt(match[1]);
//    const unit = match[2];
//
//    switch (unit) {
//        case 'min':
//            return value * 60 * 1000;
//        case 'h':
//            return value * 60 * 60 * 1000;
//        case 's':
//            return value * 1000;
//        default:
//            return null;
//    }
//}
//
//// Function to handle script restart
//function restartScript(server) {
//    console.log('Restarting script for', server.name);
//    const ssh = new SSHClient();
//    const sshConfig = {
//        host: server.ip_address,
//        port: server.port,
//        username: server.username,
//        password: server.password,
//    };
//    // Log SSH connection details
//    console.log('SSH connection details:', sshConfig);
//    ssh.on('ready', () => {
//        console.log('SSH connection established. Executing restart command.');
//        ssh.exec(`cd ${server.script_folder} && screen -ls | awk ' {print $1}' | xargs -I {} screen -X -S {} quit && screen -d -m ./${server.script}`, (err, stream) => {
//            if (err) {
//                console.error('Error restarting the script:', err);
//            } else {
//                console.log('Script restarted successfully');
//            }
//            ssh.end();
//        });
//    });
//    ssh.on('error', (err) => {
//        console.error('SSH error:', err);
//    });
//    // Log SSH connection attempt
//    console.log('Connecting to SSH server...');
//    ssh.connect(sshConfig);
//}

client.login(config.token);
