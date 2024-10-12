import {Context, Element, h, Schema} from 'koishi'
import path from "path";
import fs from "fs";

export const name = 'ai-kling-draw'
export const usage = `## 使用

1. 获取 \`Cookie\`：

- 登录 [KlingAI 国际版](https://klingai.com/text-to-image/new)
  或 [KlingAI 国内版](https://klingai.kuaishou.com/text-to-image/new)。
- F12 打开控制台，切换到 "Network" (网络) 选项卡。
- 输入提示词生成一次图片，找到 \`submit\` 请求。
- 复制请求标头 (Request Headers) 中 \`Cookie\` 的值。

2. 配置 \`URL\`：

- https://klingai.com（国际版）
- https://klingai.kuaishou.com（国内版）

## QQ 群

- 956758505`

// pz*
export interface Config {
  url: string
  cookie: string
  defaultImageWeight: number
  defaultAspectRatio: string
  timeoutDuration: number
  printProgress: boolean
}

export const Config: Schema<Config> = Schema.object({
  url: Schema.union(['https://klingai.com', 'https://klingai.kuaishou.com']).default('https://klingai.kuaishou.com').description('可灵AI 的 API 请求地址。'),
  cookie: Schema.string().required().description('可灵AI 的 cookie。'),
  defaultImageWeight: Schema.number().min(0).max(1).default(0.5).description('默认图片权重（垫图时生效）。'),
  defaultAspectRatio: Schema.union([
    '1:1',
    '16:9',
    '4:3',
    '3:2',
    '2:3',
    '3:4',
    '9:16',
  ]).default('1:1').description('默认宽高比。'),
  timeoutDuration: Schema.number().default(10).description('任务超时时长（分钟）。'),
  printProgress: Schema.boolean().default(true).description('是否打印任务进度。'),
}) as any

// jk*
interface ParsedOutput {
  finalPrompt?: string;
  englishTranslation?: string;
}

export function apply(ctx: Context, config: Config) {
  // cl*
  const logger = ctx.logger('aiKling');
  // wj*
  const parameterListFilePath = path.join(__dirname, 'assets', '参数列表.png');
  const parameterListImgBuffer = fs.readFileSync(parameterListFilePath);
  // zl*
  // aiKling h* bz*
  ctx.command('aiKling', '可灵AI绘图帮助')
    .action(async ({session}) => {
      await session.execute(`aiKling -h`);
    })
  ctx.command('aiKling.参数列表', '可灵AI绘图参数列表')
    .action(async ({session}) => {
      await sendMessage(session, h.image(parameterListImgBuffer, `image/png`))
    })
  // sctsc* sc*
  ctx.command('aiKling.提示词生成器 <prompt:text>', '生成中文提示词')
    .action(async ({session}, prompt) => {
      if (!prompt && session.event.message.quote && session.event.message.quote.content) {
        prompt = session.event.message.quote.content
      }
      if (!prompt) {
        await sendMessage(session, `缺少提示词。`);
        return
      }
      const promptSendToAI = `You are an AI assistant specialized in generating AI art prompts in Chinese. Your task is to create a detailed and creative prompt for AI image generation based on a given description. Think through this process step by step, and format your output strictly as JSON.

Follow these steps:
1. Analyze the user's description, extracting key words and core concepts.
2. Determine the art style and references based on any style or artist information provided.
3. Enhance the description by adding details about lighting, colors, mood, and other relevant elements.
4. Integrate all the information to produce the final AI art prompt in Chinese.

Your response MUST be in JSON format with the following structure:
{
"thinkStepByStep": [
"Step 1: [Your analysis of the description]",
"Step 2: [Your thoughts on style and artistic references]",
"Step 3: [Your ideas for enhancing the description]",
"Step 4: [Your process of combining all elements]"
],
"finalPrompt": "[Your generated AI art prompt in Chinese]"
}

Important notes:
- The "finalPrompt" MUST be in Chinese.
- Consider including an aspect ratio parameter (--ar) in your final prompt. Options include 1:1, 16:9, 4:3, 3:2, 2:3, 3:4, or 9:16.
- Your entire output MUST be valid JSON. Do not include any text outside of the JSON structure.

Example input: "一只猫" (A cat)
Example output:
{
"thinkStepByStep": [
"Step 1: The core concept is a cat. We need to make it more interesting and unique.",
"Step 2: No specific style mentioned, so let's choose a popular and appealing style like cartoon or Disney.",
"Step 3: To make it more captivating, let's place the cat in an unexpected setting with contrasting elements.",
"Step 4: Combine all elements into a cohesive and visually striking prompt in Chinese."
],
"finalPrompt": "一只穿着宇航服的猫，站在月球上，背景是地球，卡通风格，迪士尼 --ar 16:9"
}

Now, please provide a description for which you'd like me to generate an AI art prompt. Remember, I will respond only with a JSON object containing the step-by-step thinking process and the final prompt in Chinese.

input: ${prompt}
output: `
      const result = await fetchCompletions(promptSendToAI);
      await sendMessage(session, `${parseOutputResultToGetFinalPrompt(result)}`);
    })
  // ht* d*
  ctx.command('aiKling.绘图 <prompt:text>', '绘一张图')
    .action(async ({session}, prompt) => {
      let imageUrl = '';
      let base64 = '';
      if (session.event.message.quote && session.event.message.quote.elements) {
        imageUrl = getFirstImageUrl(session.event.message.quote.elements);
      } else {
        imageUrl = getFirstImageUrl(session.event.message.elements);
      }
      if (!imageUrl && (session.event.platform === 'onebot' || session.event.platform === 'red')) {
        const headImgUrls = getHeadImgUrls(h.select(prompt, 'at'))
        if (headImgUrls.length > 0) {
          imageUrl = headImgUrls[0];
        }
      }

      prompt = `${h.select(prompt, 'text')}`;

      if (!prompt) {
        if (session.event.message.quote && session.event.message.quote.elements) {
          prompt = `${h.select(session.event.message.quote.elements, 'text')}`;
        }
        if (!prompt) {
          await sendMessage(session, `缺少绘图提示词。`);
          return
        }
      }

      const options = parsePrompt(prompt);
      prompt = options.prompt;
      if (config.url === 'https://klingai.com' && prompt.length > 2500) {
        await sendMessage(session, `提示词过长。
提示词最多 2500 字符。
当前提示词长度：${prompt.length} 字符。`);
        return
      } else if (config.url === 'https://klingai.kuaishou.com' && prompt.length > 500) {
        await sendMessage(session, `提示词过长。
提示词最多 500 字符。
当前提示词长度：${prompt.length} 字符。`);
        return
      }
      if (!options.ar) {
        options.ar = config.defaultAspectRatio;
      }
      if (!options.iw) {
        options.iw = String(config.defaultImageWeight);
      }
      if (!isImageWeightValid(parseFloat(options.iw))) {
        await sendMessage(session, `图片权重不合法。
图片权重应该在 0 到 1 之间。`);
        return
      }
      if (!isValidAspectRatio(options.ar)) {
        await sendMessage(session, `宽高比不合法。
有效的宽高比如下：
1:1, 16:9, 4:3, 3:2, 2:3, 3:4, 9:16。`);
        return
      }

      if (imageUrl) {
        base64 = await getImageBase64(imageUrl);
      }

      const json = {
        "arguments": [
          {
            "name": "prompt",
            "value": prompt
          },
          {
            "name": "style",
            "value": "默认"
          },
          {
            "name": "aspect_ratio",
            "value": options.ar
          },
          {
            "name": "imageCount",
            "value": "1"
          },
          {
            "name": "biz",
            "value": "klingai"
          }
        ],
        "type": base64 ? "mmu_img2img_aiweb" : "mmu_txt2img_aiweb",
        "inputs": []
      }


      if (base64) {
        json.arguments.push({
          "name": "fidelity",
          "value": options.iw
        },)
        const url = await uploadImage(base64);
        if (!url) {
          await sendMessage(session, `垫图失败。`);
          return
        }
        json.inputs.push({
          "inputType": "URL",
          "url": url,
          "name": "input"
        })
      }

      try {
        const taskId = await submitTask('submit', json);
        if (!taskId) {
          await sendMessage(session, `提交绘图任务失败。
请检查是否包含敏感内容。`);
          return
        }
        if (config.printProgress) {
          logger.success(`Task ID: ${taskId} | Prompt: ${prompt}`);
        }
        await sendMessage(session, `已提交绘图任务，请耐心等待。`);
        const result = await pollTaskResult(taskId);
        if (result.status === 99) {
          if (config.printProgress) {
            logger.success(`Task ID: ${taskId} | Image URL: ${result.works[0].resource.resource}`);
          }
          try {
            const messageId = await sendMessage(session, `${h.image(result.works[0].resource.resource)}`);
            if (!messageId) {
              await sendMessage(session, `图片发送失败。
图片链接如下：
${result.works[0].resource.resource}`);
            }
          } catch (error) {
            logger.error(error);
            await sendMessage(session, `图片发送失败。
图片链接如下：
${result.works[0].resource.resource}`);
          }

          return
        } else {
          if (config.printProgress) {
            logger.error(`Task ID: ${taskId} | Fail Reason: ${result.message}`);
          }
          await sendMessage(session, `${result.message}`);
          return
        }
      } catch (error) {
        logger.error(error);
      }
    })

  // hs*
  function parseOutputResult(outputResult: string): ParsedOutput {
    if (typeof outputResult !== 'string') {
      throw new TypeError("Input must be a string");
    }

    const trimmedResult = outputResult.trim();

    const jsonRegex = /^\s*({[\s\S]*}|\[[\s\S]*\])\s*$/;
    const match = trimmedResult.match(jsonRegex);

    if (!match) {
      const partialJsonRegex = /{[\s\S]*}|\[[\s\S]*\]/;
      const partialMatch = trimmedResult.match(partialJsonRegex);

      if (!partialMatch) {
        throw new Error("No valid JSON structure found in the output result");
      }

      try {
        return JSON.parse(partialMatch[0]) as ParsedOutput;
      } catch (error) {
        logger.warn(`Found JSON-like structure but failed to parse: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return {};
      }
    }

    try {
      const parsedJson = JSON.parse(match[0]);
      if (typeof parsedJson !== 'object' || parsedJson === null) {
        throw new TypeError("Parsed result is not an object or array");
      }
      return parsedJson as ParsedOutput;
    } catch (error) {
      logger.error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {};
    }
  }

  function parseOutputResultToGetFinalPrompt(outputResult: string): string | undefined {
    return parseOutputResult(outputResult).finalPrompt ?? outputResult;
  }

  async function fetchCompletions(text) {
    const json = {
      "temperature": 1,
      "model": "glm-4-flash",
      "max_tokens": 4095,
      "stream": false,
      "messages": [
        {"role": "user", "content": text},
      ]
    };

    try {
      const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 6cb933cef62c71921abae1d511184c3d.w2OraEpWLytNG1J1'
        },
        body: JSON.stringify(json)
      });
      const result = await response.json();
      return result.choices[0].message.content;
    } catch (error) {
      logger.error('Error:', error);
      return JSON.stringify({
        englishTranslation: 'Translation failed.',
        finalPrompt: 'Prompt generation failed.',
      });
    }
  }

  function parsePrompt(input: string): { prompt: string; ar?: string; iw?: string } {
    const parts = input.split('--');
    const prompt = parts[0].trim();

    const params: { [key: string]: string } = {};
    for (let i = 1; i < parts.length; i++) {
      const [key, value] = parts[i].trim().split(' ');
      params[key] = value;
    }

    return {
      prompt,
      ar: params['ar'],
      iw: params['iw']
    };
  }

  async function fetchTaskResult(taskId: string): Promise<any> {
    const url = `${config.url}/api/task/status?taskId=${taskId}`;
    const headers = {
      "content-type": "application/json",
      "cookie": config.cookie
    };

    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      logger.error(`身份验证失败，请重新获取 Cookie。`);
      return '';
    }

    return await response.json();
  }

  async function pollTaskResult(taskId: string): Promise<any> {
    const startTime = Date.now();
    const timeoutDuration = config.timeoutDuration * 60 * 1000;

    while (true) {
      try {
        if (Date.now() - startTime > timeoutDuration) {
          throw new Error(`Polling timed out after ${timeoutDuration} minutes`);
        }

        const result = await fetchTaskResult(taskId);
        if (!result || !result.data) {
          return {status: 'FAILURE', message: '身份验证失败，请重新获取 Cookie。'};
        }
        if (result.status !== 200 || result.data.status === 50) {
          logger.error(`Failed to fetch task result.`);
          return {status: 'FAILURE', message: '任务失败。'};
        }
        if (config.printProgress) {
          logger.info(`Task ID: ${taskId} | Status: ${result.data.status}`);
        }
        if (result.data.status === 99) {
          return result.data;
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        if (error instanceof Error && error.message === `Polling timed out after ${timeoutDuration} minutes`) {
          logger.error(`Polling timed out after ${timeoutDuration} minutes`);
          return {status: 'FAILURE', message: '任务超时。'};
        }
        logger.error('Error fetching task result:', error);
        return {status: 'FAILURE', message: '任务失败。'};
      }
    }
  }

  async function uploadImage(base64: string): Promise<string> {
    const filename = Math.random().toString(36).substring(7) + '.png';

    const tokenResponse = await fetch(`${config.url}/api/upload/issue/token?filename=${filename}`, {
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json, text/plain, */*',
        'cookie': config.cookie
      },
      method: 'GET'
    });

    const tokenData = await tokenResponse.json();
    const uploadToken = tokenData.data.token;

    await fetch(`https://upload.${config.url === 'https://klingai.kuaishou.com' ? 'kuaishouzt' : 'uvfuns'}.com/api/upload/resume?upload_token=${uploadToken}`, {
      "headers": {
        'Content-Type': 'application/json',
        "accept": "application/json, text/plain, */*",
      },
      "body": null,
      "method": "GET"
    });

    await fetch(`https://upload.${config.url === 'https://klingai.kuaishou.com' ? 'kuaishouzt' : 'uvfuns'}.com/api/upload/fragment?upload_token=${uploadToken}C&fragment_id=0`, {
      "headers": {
        'Content-Type': 'application/json',
        "accept": "*/*",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-range,content-type",
      },
      "body": null,
      "method": "OPTIONS"
    });

    function base64toBytesArray(base64: string): Uint8Array {
      const binaryString = Buffer.from(base64, 'base64').toString('binary');
      return Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
    }

    const imageBytes = base64toBytesArray(base64);
    const fragmentResponse = await fetch(`https://upload.${config.url === 'https://klingai.kuaishou.com' ? 'kuaishouzt' : 'uvfuns'}.com/api/upload/fragment?upload_token=${uploadToken}&fragment_id=0`, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'accept': 'application/json, text/plain, */*',
      },
      body: imageBytes,
      method: 'POST'
    });

    await fragmentResponse.json();

    await fetch(`https://upload.${config.url === 'https://klingai.kuaishou.com' ? 'kuaishouzt' : 'uvfuns'}.com/api/upload/complete?fragment_count=1&upload_token=${uploadToken}`, {
      headers: {
        'accept': 'application/json, text/plain, */*',
      },
      method: 'POST'
    });

    const verifyResponse = await fetch(`${config.url}/api/upload/verify/token?token=${uploadToken}`, {
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json, text/plain, */*',
        'cookie': config.cookie
      },
      method: 'GET'
    });

    const verifyData = await verifyResponse.json();
    if (verifyData.data?.url) {
      return verifyData.data.url;
    } else {
      logger.error(`Failed to verify image upload.`);
      return '';
    }
  }

  function isImageWeightValid(imageWeight: number): boolean {
    return imageWeight >= 0 && imageWeight <= 1;
  }

  function isValidAspectRatio(aspectRatio: string): boolean {
    const validRatios: string[] = ['1:1', '16:9', '4:3', '3:2', '2:3', '3:4', '9:16'];
    return validRatios.includes(aspectRatio);
  }

  async function submitTask(type: string, requestBody): Promise<string> {
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'cookie': config.cookie
      },
      body: JSON.stringify(requestBody)
    };
    const response = await fetch(`${config.url}/api/task/${type}`, requestOptions);
    const data = await response.json();

    if (data.status !== 200) {
      logger.error(`Failed to submit task.`);
      return '';
    }

    if (data.data.task?.id) {
      return data.data.task?.id;
    } else {
      logger.error(`Failed to get task ID.`);
      return '';
    }
  }

  async function getImageBase64(imageUrl: string): Promise<string> {
    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        logger.error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      const buffer = Buffer.from(arrayBuffer);

      return buffer.toString('base64');
    } catch (error) {
      logger.error('Error fetching image:', error);
      return '';
    }
  }

  function getHeadImgUrls(atElements: Element[]): string[] {
    return atElements.map(element => {
      const atId = element.attrs.id;
      return `https://q.qlogo.cn/g?b=qq&s=640&nk=${atId}`;
    });
  }

  function getFirstImageUrl(elements: Element[]): string | null {
    for (const element of elements) {
      if (element.type === 'img') {
        return element.attrs.src || element.attrs.url || null;
      }
    }

    return null;
  }

  async function sendMessage(session, text) {
    try {
      const [messageId] = await session.send(`${h.quote(session.messageId)}${text}`)
      return messageId
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error
    }

  }
}
