const ytdl = require("ytdl-core");
const { Youtube_API } = require("../config.json");
const YouTubeAPI = require("simple-youtube-api");
const youtube = new YouTubeAPI(process.env.yt);
const { play } = require("../include/play");

module.exports = {
    name: 'play',
    cooldown: 3,
    aliases: ["p"],
    description: "Plays a song from the given URL",
    async execute(message, args){
        const {channel} = message.member.voice;
        const serverQueue = message.client.queue.get(message.guild.id);
        if(!channel){
            return message.reply("You need to join a voice channel first!");
        }
        if(serverQueue && channel !== message.guild.me.voice.channel){
            return message.reply(`You must be in the same channel as ${message.client.user}`);
        }
        if(!args.length){
            return message.reply('You need to provide a Youtube Link.');
        }

        const permissions = channel.permissionsFor(message.client.user);
        if(!permissions.has("CONNECT"))
          return message.reply("Cannot connect to voice, missing permissons");
        if(!permissions.has("SPEAK"))
          return message.reply("Cannot speak in this voice channel, make sure permissions are correct");
        
        const search = args.join(' ');
        const vidPattern = /^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com|youtu\.?be)\/.+$/gi;
        const listPattern = /^.*(list=)([^#\&\?]*).*/gi;
        const url = args[0];
        const urlValid = vidPattern.test(args[0]);

        if(!vidPattern.test(args[0]) && listPattern.test(args[0])){
            return message.client.commands.get('playlist').execute(message, args);
        }

        const queueConstruct = {
            textChannel: message.channel,
            channel,
            connection: null,
            songs: [],
            loop: false,
            volume: 100,
            playing: true
        };

        let songInfo = null;
        let song = null;

        if(urlValid){
            try{
                songInfo = await ytdl.getInfo(url);
                song = {
                    title: songInfo.videoDetails.title,
                    url: songInfo.videoDetails.video_url,
                    duration: songInfo.videoDetails.lengthSeconds
                };
            }catch(error){
                console.error(error);
                return message.reply(error.message).catch(console.error);
            }
        }
        else{
            try{
            const results = await youtube.searchVideos(search, 1);
            songInfo = await ytdl.getInfo(results[0].url);
            song = {
                title: songInfo.videoDetails.title,
                url: songInfo.videoDetails.video_url,
                duration: songInfo.videoDetails.lengthSeconds
                };
            }catch(error){
                console.error(error);
                return message.reply("No videos found.").catch(console.error)
            }
        }

        if(serverQueue){
            serverQueue.songs.push(song);
            return serverQueue.textChannel.send(`**${song.title}** Added to queue`).catch(console.error);
        }
        queueConstruct.songs.push(song);
        message.client.queue.set(message.guild.id, queueConstruct);

        try{
            queueConstruct.connection = await channel.join();
            await queueConstruct.connection.voice.setSelfDeaf(true);
            play(queueConstruct.songs[0], message);
        }catch(error){
            console.error(error);
            message.client.queue.delete(message.guild.id);
            await channel.leave();
            return message.channel.send(`Could not join the channel: ${error}`).catch(sonsole.error);
        }



         
    },

};
