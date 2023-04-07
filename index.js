//Mixin Bot
const { BlazeClient } = require("mixin-node-sdk");
const config = require("./config");
const whitelist = require("./whitelist");
const client = new BlazeClient(
  {
    pin: config.pin,
    client_id: config.client_id,
    session_id: config.session_id,
    pin_token: config.pin_token,
    private_key: config.private_key,
  },
  { parse: true, syncAck: true }
);

//ChatGPT
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: config.openai_key,
});
const openai = new OpenAIApi(configuration);

//Data
const words = {
  function: {
    numOfStudies: 0,
    lastStudyTime: Date.now(),
    nextStudyTime: Date.now(),
  },
  object: {
    numOfStudies: 0,
    lastStudyTime: Date.now(),
    nextStudyTime: Date.now(),
  },
  class: {
    numOfStudies: 0,
    lastStudyTime: Date.now(),
    nextStudyTime: Date.now(),
  },
  method: {
    numOfStudies: 0,
    lastStudyTime: Date.now(),
    nextStudyTime: Date.now(),
  },
  property: {
    numOfStudies: 0,
    lastStudyTime: Date.now(),
    nextStudyTime: Date.now(),
  },
  array: {
    numOfStudies: 0,
    lastStudyTime: Date.now(),
    nextStudyTime: Date.now(),
  },
  string: {
    numOfStudies: 0,
    lastStudyTime: Date.now(),
    nextStudyTime: Date.now(),
  },
  number: {
    numOfStudies: 0,
    lastStudyTime: Date.now(),
    nextStudyTime: Date.now(),
  },
  boolean: {
    numOfStudies: 0,
    lastStudyTime: Date.now(),
    nextStudyTime: Date.now(),
  },
  null: {
    numOfStudies: 0,
    lastStudyTime: Date.now(),
    nextStudyTime: Date.now(),
  },
  undefin: {
    numOfStudies: 0,
    lastStudyTime: Date.now(),
    nextStudyTime: Date.now(),
  },
  promise: {
    numOfStudies: 0,
    lastStudyTime: Date.now(),
    nextStudyTime: Date.now(),
  },
  callbac: {
    numOfStudies: 0,
    lastStudyTime: Date.now(),
    nextStudyTime: Date.now(),
  },
  event: {
    numOfStudies: 0,
    lastStudyTime: Date.now(),
    nextStudyTime: Date.now(),
  },
  module: {
    numOfStudies: 0,
    lastStudyTime: Date.now(),
    nextStudyTime: Date.now(),
  },
  variabl: {
    numOfStudies: 0,
    lastStudyTime: Date.now(),
    nextStudyTime: Date.now(),
  },
  constru: {
    numOfStudies: 0,
    lastStudyTime: Date.now(),
    nextStudyTime: Date.now(),
  },
  prototy: {
    numOfStudies: 0,
    lastStudyTime: Date.now(),
    nextStudyTime: Date.now(),
  },
  iterato: {
    numOfStudies: 0,
    lastStudyTime: Date.now(),
    nextStudyTime: Date.now(),
  },
  decorat: {
    numOfStudies: 0,
    lastStudyTime: Date.now(),
    nextStudyTime: Date.now(),
  },
};

//WS
client.loopBlaze({
  async onMessage(msg) {
    console.log(msg);
    if (msg.category === "PLAIN_TEXT" && typeof msg.data === "string") {
      if (whitelist.user_id.includes(msg.user_id)) {
        if (["?", "？", "你好", "Hi"].includes(msg.data)) {
          helpMsg = `🧑‍🏫 发送 / ,随机获取6个单词按钮，点击按钮，开始该单词的对话练习；\n📖 发送 /+内容，为仅使用翻译功能，比如发送： /您好；\n💡 发送 ? ，获取此帮助信息。`;
          client.sendMessageText(msg.user_id, helpMsg);
        } else if (msg.data === "/") {
          sendRandomWords(msg.user_id);
        } else if (msg.data.substring(0, 1) === "/") {
          const rawData = msg.data.substring(1);
          const lang = checkLanguage(rawData);
          const rec = await translate(lang, rawData);
          const message = rec.rec;
          const cost = rec.cost;
          console.log(cost);
          client.sendMessageText(msg.user_id, `> ${rawData}\n< ${message}`);
        } else {
          const rawData = msg.data.toString();
          const lang = checkLanguage(rawData);

          let rawZhData = "";
          let rawEnData = "";
          let cost = 0;

          //处理收到的消息
          if (lang === "chinese") {
            rawZhData = rawData; //中文
            const rec = await translate(lang, rawData);
            rawEnData = rec.rec; //英文
            cost += rec.cost;
          } else if (lang === "english") {
            rawEnData = rawData; //英文
            const rec = await translate(lang, rawData);
            rawZhData = rec.rec; //中文
            cost += rec.cost;
          } else if (lang === "unknown") {
            client.sendMessageText(
              msg.user_id,
              `Only English and Chinese are supported.\n仅支持英文或中文。`
            );
          }

          updateWordsList(rawEnData);

          //处理返回的消息
          const conversationReturn = await conversation(
            `Please start a conversation with "${rawEnData}".`
          );
          const returnEnData = conversationReturn.rec; //英文
          const costOfReturnFromChatGPT = conversationReturn.cost;
          cost += costOfReturnFromChatGPT;
          const translateOfConversationReturn = await translate(
            "english",
            returnEnData
          );
          const returnZhData = translateOfConversationReturn.rec; //中文
          const costOfTranslateEnToZh = translateOfConversationReturn.cost;
          cost += costOfTranslateEnToZh;

          //最终Cost
          console.log(cost);

          const rec = `> 用户\n英文：${rawEnData}\n中文：${rawZhData}\n\n< 助手\n英文：${returnEnData}\n中文：${returnZhData}`;
          await client.sendMessageText(msg.user_id, rec);
        }
      } else {
        client.sendMessageText(msg.user_id, "服务暂未对外开放。");
      }
    } else {
      client.sendMessageText(msg.user_id, "Only supports text.\n仅支持文本。");
    }
  },
  onAckReceipt() {},
});

//Functions
async function cost(token) {
  const cost = (0.002 / 1000) * token;
  return cost;
}

function checkLanguage(text) {
  // 判断第一个字符的编码范围来确定语言
  const firstCharCode = text.charCodeAt(0);
  if (firstCharCode >= 0x4e00 && firstCharCode <= 0x9fa5) {
    return "chinese";
  } else if (firstCharCode >= 0x00 && firstCharCode <= 0x7f) {
    return "english";
  } else {
    // 其他语言，暂不处理
    return "unknown";
  }
}

async function translate(lang, text) {
  if (lang === "chinese") {
    msg = [
      {
        role: "system",
        content:
          "You are a helpful assistant that translates Chinese to English and replay the only reply the content translated.",
      },
      {
        role: "user",
        content: `Translate the following Chinese text to English.: ${text}`,
      },
    ];
  } else if (lang === "english") {
    msg = [
      {
        role: "system",
        content:
          "You are a helpful assistant that translates English to Chinese and replay the only reply the content translated.",
      },
      {
        role: "user",
        content: `Translate the following English text to Chinese. : ${text}`,
      },
    ];
  }

  const rec = (await queryChatGPT(msg)).rec;
  const token = (await queryChatGPT(msg)).token;
  const costs = await cost(token);
  return { rec: rec, cost: costs };
}

async function conversation(text) {
  msg = [
    {
      role: "system",
      content:
        "First of all, If the question is not a sentence or they are some seprecated words, please help to generate a sentence with the question to start a conversation.I want you to act as a spoken English teacher and improver. I will speak to you in English and you will reply to me in English to practice my spoken English.  I want you to keep your reply neat, limiting the reply to 50 words. I want you to strictly correct my grammar mistakes, typos, and factual errors. I want you to ask me a question in your reply. Now let's start practicing, you could ask me a question first. Remember, I want you to strictly correct my grammar mistakes, typos, and factual errors.",
    },
    {
      role: "user",
      content: text,
    },
  ];
  const rec = (await queryChatGPT(msg)).rec;
  const token = (await queryChatGPT(msg)).token;
  const costs = await cost(token);
  return { rec: rec, cost: costs };
}

async function queryChatGPT(msg) {
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: msg,
  });
  const rec = completion.data.choices[0].message.content.replace(
    /^"(.*)"$/,
    "$1"
  );
  const token = completion.data.usage.total_tokens;
  return { rec: rec, token: token };
}

function randomWords() {
  const keys = Object.keys(words);
  const selectedWords = [];
  while (selectedWords.length < 6) {
    const randomIndex = Math.floor(Math.random() * keys.length);
    if (!selectedWords.includes(keys[randomIndex])) {
      if (words[keys[randomIndex]].nextStudyTime <= Date.now()) {
        selectedWords.push(keys[randomIndex]);
      }
    }
  }
  return selectedWords;
}

async function sendRandomWords(user_id) {
  const selectedWords = randomWords();
  await client.sendMessageText(user_id, "请挑选一个单词开始对话练习。");
  await client.sendAppButtonMsg(user_id, [
    {
      label: selectedWords[0], // 按钮的文本内容
      color: "#FF0000", // 16进制按钮的颜色，如： #FF0000
      action: `input:${selectedWords[0]}`, // 按钮的跳转链接
    },
    {
      label: selectedWords[1], // 按钮的文本内容
      color: "#FF0000", // 16进制按钮的颜色，如： #FF0000
      action: `input:${selectedWords[1]}`, // 按钮的跳转链接
    },
    {
      label: selectedWords[2], // 按钮的文本内容
      color: "#FF0000", // 16进制按钮的颜色，如： #FF0000
      action: `input:${selectedWords[2]}`, // 按钮的跳转链接
    },
    {
      label: selectedWords[3], // 按钮的文本内容
      color: "#FF0000", // 16进制按钮的颜色，如： #FF0000
      action: `input:${selectedWords[3]}`, // 按钮的跳转链接
    },
    {
      label: selectedWords[4], // 按钮的文本内容
      color: "#FF0000", // 16进制按钮的颜色，如： #FF0000
      action: `input:${selectedWords[4]}`, // 按钮的跳转链接
    },
    {
      label: selectedWords[5], // 按钮的文本内容
      color: "#FF0000", // 16进制按钮的颜色，如： #FF0000
      action: `input:${selectedWords[5]}`, // 按钮的跳转链接
    },
  ]);
}

function getNextStudyTime(numOfStudies, lastStudyTime) {
  // 计算学习间隔时间
  const interval = (Date.now() - lastStudyTime) / (1000 * 60 * 60 * 24);
  //interval = 6
  let nextStudyTime;

  // 根据记忆次数和学习间隔时间计算下一次学习时间
  if (numOfStudies === 0) {
    nextStudyTime = Date.now() + 24 * 60 * 60 * 1000; // 第一次学习间隔1天
  } else if (numOfStudies === 1) {
    nextStudyTime = Date.now() + 7 * 24 * 60 * 60 * 1000; // 第二次学习间隔1周
  } else {
    let days = 0;
    const prevInterval = interval / numOfStudies;
    if (prevInterval <= 1) {
      days = 1;
    } else if (prevInterval <= 2) {
      days = 2;
    } else if (prevInterval <= 4) {
      days = 4;
    } else if (prevInterval <= 7) {
      days = 7;
    } else if (prevInterval <= 15) {
      days = 15;
    } else {
      days = 30;
    }
    nextStudyTime = Date.now() + days * 24 * 60 * 60 * 1000;
  }
  return nextStudyTime;
}

function checkWord(text) {
  const keys = Object.keys(words);
  if (keys.includes(text)) {
    return true;
  } else {
    return false;
  }
}

function updateWordsList(text) {
  text = text.toLowerCase();
  if (checkWord(text)) {
    words[text].numOfStudies += 1;
    words[text].lastStudyTime = Date.now();
    words[text].nextStudyTime = getNextStudyTime(
      words[text].numOfStudies,
      words[text].lastStudyTime
    );
  }
  console.log(words[text]);
}
