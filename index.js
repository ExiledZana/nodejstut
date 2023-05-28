import { Configuration, OpenAIApi } from "openai";
import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import  ffmpeg  from 'fluent-ffmpeg';
import axios from 'axios';
import  fs  from 'fs';
import  dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const ffmpegPath = 'C:/Users/дмитрий/Desktop/nodejstut/ffmpeg/bin/ffmpeg.exe';
const ffprobePath = 'C:/Users/дмитрий/Desktop/nodejstut/ffmpeg/bin/ffprobe.exe';
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);
const configuration = new Configuration({
  apiKey: process.env.OPENAIAPIKEY,
});
const openai = new OpenAIApi(configuration);
const bot = new Telegraf(process.env.BOTTOKEN);
let history = {};



bot.start((ctx) =>{
  ctx.reply('Hello!');
});


bot.command('remove', (ctx) => {
  history = {};
  ctx.reply('History cleared!');
});

async function handleTextMessage(ctx) {
  if (!history) {
   history = {};
  };
  if (!history.messages) {
    history.messages = [];
   };
  history.messages.push(
    {role: 'user',
    content: ctx.message.text}
  );
  
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: history.messages,
  });
  const finalAnswer = completion.data.choices[0].message.content;
  await ctx.telegram.sendMessage(ctx.message.chat.id, finalAnswer);
  history.messages.push(
    {role: 'assistant',
    content: finalAnswer}
  );
  if (history.messages.length > 9){
    history.messages.splice(0, 2);
  }
  console.log(history.messages);
  };

bot.on(message('text'), handleTextMessage);

bot.on(message("voice"), async (ctx) => {
  const fileId = await ctx.message.voice.file_id;
  const fileLink = await ctx.telegram.getFileLink(fileId);
  //console.log('File Link:', fileLink.href);
  const filename = path.basename(fileLink.href);
  const outputPath = 'C:/Users/дмитрий/Desktop/nodejstut/' + filename;
  console.log(outputPath);
  await axios.get(fileLink.href, { responseType: 'stream'})
    .then(response => {
      response.data.pipe(fs.createWriteStream(outputPath))
    })
    .catch(error => {
      console.error('Error downloading file:', error);
    });
  const finalPath = outputPath + '.mp3';
  ffmpeg(outputPath)
    .output(finalPath)
    .format('mp3')
    .on('end', () => {
      console.log('File converted successfully!');
    })
    .on('error', (err) => {
      console.error('Error converting file:', err);
    })
    .run();
  
  const resp = await openai.createTranscription(
      fs.createReadStream(finalPath),
      "whisper-1"
    );
  //console.log(resp.data.text);
  
  /*if (!history) {
    history = {};
   };
   if (!history.messages) {
     history.messages = [];
    };
   history.messages.push(
     {role: 'user',
     content: transcription}
   );

   const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: history.messages,
  });
  const finalAnswer = completion.data.choices[0].message.content;
  await ctx.telegram.sendMessage(ctx.message.chat.id, finalAnswer);
  history.messages.push(
    {role: 'assistant',
    content: finalAnswer}
  );
  if (history.messages.length > 9){
    history.messages.splice(0, 2);
  }
  console.log(history.messages);
  */
});


bot.launch();