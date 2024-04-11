const jsonfile = require('jsonfile');
const { Client, GatewayIntentBits } = require('discord.js');
const { Client: SSHClient } = require('ssh2');
const cron = require('cron');

// Example function to send an embed



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
        
            if (command === '?start') {
                const serverName = args.join(' '); 
                if (!serverName) {
                    message.channel.send('Please provide the server name.');
                    return;
                }
                
                const server = config.servers.find(server => server.name.toLowerCase() === serverName.toLowerCase());
                if (!server) {
                    message.channel.send(`Server '${serverName}' not found.`);
                    return;
                }
                
                console.log(`Start command received for server '${server.name}'.`);
                startScript(server, message);


            } else if (command === '?stop') {
                const serverName = args.join(' ')
                if (!serverName) {
                    message.channel.send('Please provide the server name.');
                    return;
                }
                
                const server = config.servers.find(server => server.name.toLowerCase() === serverName.toLowerCase());
                if (!server) {
                    message.channel.send(`Server '${serverName}' not found.`);
                    return;
                }
                
                console.log(`Stop command received for server '${server.name}'.`);
                stopScript(server, message);
            } else if (command === '?config') {
                const serverName = args.shift();
                if (!serverName) {
                    message.channel.send('Please provide the server name.');
                    return;
                }
                
                const server = config.servers.find(server => server.name.toLowerCase() === serverName.toLowerCase());
                if (!server) {
                    message.channel.send(`Server '${serverName}' not found.`);
                    return;
                }
                
                console.log(`Config command received for server '${server.name}'.`);
                updateConfig(server, message, args);
    } else if (command === '?startall') {
        console.log('Start All command received.');
        startAllScripts(message);
    } else if (command === '?stopall') {
        console.log('Stop All command received.');
        stopAllScripts(message);
    }
    else if (command === '?restartall') {
        console.log('Restart All command received.');
        restartAllScripts(message);
    
    } else if (command === '?setrestart') {
        console.log('Set Restart command received.');
        setRestartInterval(server, message, args);
    }
    else if (command === '?chat') {
        const serverName = args.shift();
        const messageToSend = args.join(' ');
        
        if (!serverName || !messageToSend) {
            message.channel.send('Please provide both the server name and the message.');
            return;
        }

        const server = config.servers.find(server => server.name.toLowerCase() === serverName.toLowerCase());
        if (!server) {
            message.channel.send(`Server '${serverName}' not found.`);
            return;
        }

        console.log(`Sending message to server '${server.name}': ${messageToSend}`);
        sendChatMessage(server, messageToSend, message);
    }
});    

    function startAllScripts(message) {
        console.log('Starting all scripts');
        const servers = config.servers.slice(); 
    
        function startNextServer() {
            if (servers.length === 0) {
                return;
            }
    
            const server = servers.shift();
            startScript(server, message);
    
   
            setTimeout(startNextServer, 5000);
        }
    
        startNextServer();
    }

    function restartAllScripts(message) {
        console.log('Restarting all scripts');
        const servers = config.servers.slice();
    
        function restartNextServer() {
            if (servers.length === 0) {
                return;
            }
    
            const server = servers.shift();
            stopScript(server, message);
    

            setTimeout(() => {
                startScript(server, message);
                restartNextServer();
            }, 5000);
        }
    
        restartNextServer();
    }
    


    


function stopAllScripts(message) {
    console.log('Stopping all scripts');
    const servers = config.servers.slice(); 

    function stopNextServer() {
        if (servers.length === 0) {
            return;
        }

        const server = servers.shift();
        stopScript(server, message);

        setTimeout(stopNextServer, 5000);
    }

    stopNextServer();
}

function sendChatMessage(server, messageToSend, message) {
    const ssh = new SSHClient();
    const sshConfig = {
        host: server.ip_address,
        port: server.port,
        username: server.username,
        password: server.password,
    };

    ssh.on('ready', () => {
        console.log('SSH connection established. Searching for screen session.');
        const scriptPidCommand = `pgrep -f "${server.script}"`;
        ssh.exec(scriptPidCommand, (err, stream) => {
            if (err) {
                console.error('Error finding script PID:', err);
                message.channel.send(`Error finding script PID: ${err.message}`);
                ssh.end();
                return;
            }

            let scriptPids = '';
            stream.on('data', (data) => {
                scriptPids += data.toString();
            });

            stream.on('close', () => {
                scriptPids = scriptPids.trim().split('\n').filter(pid => pid.trim() !== ''); 
                console.log('Script PIDs:', scriptPids);
                if (scriptPids.length > 0) {
                    const scriptPid = scriptPids[0]; 
                    console.log('Script PID:', scriptPid);
                    const screenCommand = `screen -S ${scriptPid} -X stuff "chat ${messageToSend}\\n"`;
                    ssh.exec(screenCommand, (err, stream) => {
                        if (err) {
                            console.error('Error sending chat message:', err);
                            message.channel.send(`Error sending chat message: ${err.message}`);
                        } else {
                            console.log('Chat message sent successfully');
                            const embed = {
                                title: `Chat Message Sent for ${server.name}`,
                                description: `Message: ${messageToSend}`,
                                color: null,
                                footer: {
                                    text: 'Made by zsronx <3 for binmaster'
                                }
                            };
                            message.channel.send({ embeds: [embed] });
                        }
                        ssh.end();
                    });
                } else {
                    console.log('Script PID not found.');
                    message.channel.send('Script PID not found.');
                    ssh.end();
                }
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




const startingServers = {};
const ssh = new SSHClient();


function startScript(server, message) {

    if (startingServers[server.name]) {
        console.log(`Start command for ${server.name} already in progress.`);
        return;
    }

    startingServers[server.name] = true;

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
                const embed = {
                    title: `Error Starting Script for ${server.name}`,
                    description: err.message,
                    color: null,
                    footer: {
                        text: "Made by zsronx <3 for binmaster"
                    }
                };
                message.channel.send({ embeds: [embed] });
            } else {
                console.log('Script started successfully');
                const embed = {
                    title: `Script Started for ${server.name}`,
                    description: "Script started successfully",
                    color: null,
                    footer: {
                        text: "Made by zsronx <3 for binmaster"
                    }
                };
                message.channel.send({ embeds: [embed] });
            }
            ssh.end();
            delete startingServers[server.name]; 
        });
    });
    ssh.on('error', (err) => {
        console.error('SSH error:', err);
        const embed = {
            title: `SSH Error for ${server.name}`,
            description: err.message,
            color: null,
            footer: {
                text: "Made by zsronx <3 for binmaster"
            }
        };
        message.channel.send({ embeds: [embed] });
        delete startingServers[server.name];
    });

    console.log('Connecting to SSH server...');
    ssh.connect(sshConfig);
}

function stopScript(server, message) {
    console.log('Stopping script for', server.name);
    const ssh = new SSHClient();
    const sshConfig = {
        host: server.ip_address,
        port: server.port,
        username: server.username,
        password: server.password,
    };

    ssh.on('ready', () => {
        console.log('SSH connection established. Executing stop command.');

        const scriptPidCommand = `pgrep -f "${server.script}"`;
        ssh.exec(scriptPidCommand, (err, stream) => {
            if (err) {
                console.error('Error finding script PID:', err);
                message.channel.send(`Error finding script PID: ${err.message}`);
                ssh.end();
                return;
            }

            let scriptPids = '';
            stream.on('data', (data) => {
                scriptPids += data.toString();
            });

            stream.on('close', () => {
                scriptPids = scriptPids.trim().split('\n').filter(pid => pid.trim() !== ''); 
                console.log('Script PIDs:', scriptPids);
                if (scriptPids.length > 0) {
                    const stopCommands = scriptPids.map(pid => `kill ${pid}`).join('; ');
                    ssh.exec(stopCommands, (err, stream) => {
                        if (err) {
                            console.error('Error stopping script:', err);
                            message.channel.send(`Error stopping script: ${err.message}`);
                        } else {
                            console.log('Script stopped successfully');
                            const embed = {
                                title: `Script Stopped for ${server.name}`,
                                description: `Script PIDs ${scriptPids.join(', ')} stopped successfully.`,
                                color: null,
                                footer: {
                                    text: 'Made by zsronx <3 for binmaster'
                                }
                            };
                            message.channel.send({ embeds: [embed] });
                        }
                        ssh.end();
                    });
                } else {
                    console.log('Script PID not found.');
                    message.channel.send('Script PID not found.');
                    ssh.end();
                }
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

//////////////////////////CONFIG


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
                    const embed = {
                        title: `Slayer Changed for ${server.name}`,
                        description: `Slayer Tier changed to ${newValue}\nSlayer changed to ${newType}`,
                        color: 481517,
                        footer: {
                            text: "Made by zsronx <3 for binmaster"
                        }
                    };
                    message.channel.send({ embeds: [embed] });
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

////READ LOGS


let lastMessageSent = {};

function monitorServerEvents() {
    config.servers.forEach(server => {
        const conn = new SSHClient();
        conn.on('ready', () => {
            console.log(`Connected to ${server.name}`);
            setInterval(() => {
                const command = `find ${server.path_to_server_logs} -type f -printf '%T+ %p\\n' | sort -r | head -n 1 | cut -d' ' -f2 | xargs tail -n 10`;
                conn.exec(command, (err, stream) => {
                    if (err) throw err;
                    let buffer = '';
                    stream.on('data', (data) => {
                        buffer += data.toString();
                    }).on('close', () => {
                      
                        if (buffer.includes("SLAYER QUEST COMPLETE!")) {
                            const channel = client.channels.cache.get(config.Killed_boss);
                            if (channel && !lastMessageSent[server.name + '_quest']) {
                                const embed = {
                                    title: `Slayer Quest Completed`,
                                    description: `${server.name} completed a slayer quest.`,
                                    color: 481517,
                                    footer: {
                                        text: 'Made by zsronx <3 for binmaster'
                                    }
                                };
                                channel.send({ embeds: [embed] });
                                lastMessageSent[server.name + '_quest'] = true;
                                setTimeout(() => { lastMessageSent[server.name + '_quest'] = false; }, 30000);
                            }
                        }

                     
                        const potentialStaffCheckRegex = /Potential Staff Check (.+?) Detected!/g;
                        let match;
                        while ((match = potentialStaffCheckRegex.exec(buffer)) !== null) {
                            const details = match[1];
                            const channel = client.channels.cache.get(config.Staff_Check);
                            if (channel && !lastMessageSent[server.name + '_staffCheck']) {
                                const embed = {
                                    title: `Potential Staff Check Detected!`,
                                    description: `${server.name} detected a potential staff check for: "${details}"`,
                                    color: 481517,
                                    footer: {
                                        text: 'Made by zsronx <3 for binmaster'
                                    }
                                };
                                channel.send({ embeds: [embed] });
                                lastMessageSent[server.name + '_staffCheck'] = true;
                                setTimeout(() => { lastMessageSent[server.name + '_staffCheck'] = false; }, 10000); 
                            }
                        }
                    });
                });
            }, 5000);
        }).connect({
            host: server.ip_address,
            port: server.port,
            username: server.username,
            password: server.password,
        });
    });
}

monitorServerEvents();



function restartAllScriptsSequentially(message) {
    const channel = client.channels.cache.get(config.target_channel_id);
    const servers = config.servers.slice(); 

 
    const startEmbed = {
        title: 'Restart Initiated',
        description: 'Restarting all servers... 🔄',
        color: 0xff9900,
        footer: {
            text: 'Hold tight!'
        }
    };

    channel.send({ embeds: [startEmbed] }).catch(console.error);
    

    function restartNextServer() {
        if (servers.length === 0) {
        
            const channel = client.channels.cache.get(config.Restart_msg_channel);
    
            if (!channel) {
                return console.error("Channel not found. Make sure you have the correct channel ID.");
            }
    

            const embed = {
                title: `Restart Complete`,
                description: `All servers have been successfully restarted. ✅`,
                color: 0x33cc33,
                footer: {
                    text: "Made by zsronx <3 for binmaster"
                }
            };
        
      
            channel.send({ embeds: [embed] }).catch(console.error);
        
            return;
        }

        const server = servers.shift();
        console.log(`Restarting ${server.name}`);

        (async () => {
            await stopScript(server, message);
            await new Promise(resolve => setTimeout(resolve, 5000));
            await startScript(server, message);
            await new Promise(resolve => setTimeout(resolve, 15000)); 

            restartNextServer();
        })();
    }

    restartNextServer();
}

const job = new cron.CronJob(config.Automatic_Restarts_Interval, function() {
    const mockMessage = { 
        channel: { 
            send: msg => console.log(msg)
        } 
    }; 
    console.log('Initiating auto-restart for all servers with a 15-second delay.');
    restartAllScriptsSequentially(mockMessage);
}, null, true, 'America/New_York'); 

console.log('Cron job scheduled for auto-restarting all servers with a 15-second delay between restarts.');
job.start();


    client.login(config.token);
