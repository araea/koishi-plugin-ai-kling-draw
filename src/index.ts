import {Context, Element, h, Schema} from 'koishi'
import path from "path";
import fs from "fs";

export const name = 'ai-kling-draw'
export const usage = `## 🌈 使用

1. **获取 Cookie：**

- 前往 [AI Kling Draw](https://klingai.kuaishou.com/text-to-image/new) 网站登录。
- 登录后，F12 打开控制台，切换到 "Network" (网络) 选项卡。
- 输入提示词生成一次图片，找到 \`submit\` 请求。
- 在请求标头 (Request Headers) 中，复制 \`Cookie\` 的值。

2. **配置插件：** 填写 \`cookie\` 配置项。

\`\`\`typescript
cookie: 'YOUR_COOKIE' // 替换为你的 可灵AI Cookie
\`\`\`

3. **开始创作！**

- 使用 \`aiKling.绘图 <提示词>\` 命令，根据提示词生成图片。 例如：

  \`\`\`
  aiKling.绘图 一只戴着草帽的猫咪，在沙滩上晒太阳
  \`\`\`

- 使用 \`aiKling.提示词生成器 <描述>\` 命令，可生成 AI 绘图提示词。 例如：

  \`\`\`
  aiKling.提示词生成器 一只猫
  \`\`\`
  - 由 \`Claude-3.5-Sonnet\` 提供支持。

- 使用 \`aiKling.参数列表\` 命令，查看可灵AI支持的参数列表。

- **建议自行添加别名：** 可以将 \`aiKling.绘图\` 添加别名为 \`绘图\` 或 \`画图\`，以便更方便地使用。

## ⚙️ 配置项

| 配置项               | 默认值  | 说明                             |
|-------------------|------|--------------------------------|
| \`cookie\`          | 必填   | 可灵AI 的 cookie，用于身份验证。 |
| \`timeoutDuration\` | 10   | 任务超时时长 (分钟)，超过该时间任务将被视为失败。     |
| \`printProgress\`   | true | 是否打印任务进度，方便你了解绘图的进展。           |

## 🌼 命令

| 命令                    | 说明               |
|-----------------------|------------------|
| \`aiKling\`             | 查看插件的帮助信息。       |
| \`aiKling.绘图 <提示词>\`    | 根据提示词生成图片。       |
| \`aiKling.提示词生成器 <描述>\` | 根据描述生成 AI 绘图提示词。 |
| \`aiKling.参数列表\`        | 查看 可灵AI 参数列表。    |

## 🐱 QQ 群

- 956758505`

// pz*
export interface Config {
  cookie: string
  timeoutDuration: number
  printProgress: boolean
}

export const Config: Schema<Config> = Schema.object({
  cookie: Schema.string().required().description('[可灵AI](https://klingai.kuaishou.com/text-to-image/new) 的 cookie。'),
  timeoutDuration: Schema.number().default(10).description('任务超时时长（分钟）。'),
  printProgress: Schema.boolean().default(true).description('是否打印任务进度。'),
})

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
      if (!prompt) {
        await sendMessage(session, `缺少提示词。`);
        return
      }
      const json = {
        "task": "根据输入生成通用的AI绘图提示词",
        "input": {
          "描述": prompt,
        },
        "output": {
          "format": "JSON",
          "structure": {
            "thinkStepByStep": [
              "步骤一：分析用户的描述，提取关键词和核心概念",
              "步骤二：根据风格和艺术家信息，确定艺术风格和参考",
              "步骤三：结合其他细节，补充光线、颜色、情绪等描述",
              "步骤四：将所有信息整合，生成最终的AI绘图提示词"
            ],
            "finalPrompt": "生成的AI绘图提示词"
          }
        },
        "example": {
          "input": {
            "描述": "一只猫",
          },
          "output": {
            "format": "JSON",
            "structure": {
              "thinkStepByStep": [
                "步骤一：...",
                "步骤二：...",
                "步骤三：...",
                "步骤四：..."
              ],
              "finalPrompt": "一只穿着宇航服的猫，站在月球上，背景是地球，卡通风格，迪士尼 --ar 16:9"
            }
          }
        },
        "note": "参数 --ar <1:1, 16:9, 4:3, 3:2, 2:3, 3:4, 或 9:16> 用于指定图片比例，例如 --ar 16:9"
      };
      const result = await fetchCompletions(JSON.stringify(json));
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
      if (prompt.length > 500) {
        await sendMessage(session, `提示词过长。
提示词最多 500 字符。
当前提示词长度：${prompt.length} 字符。`);
        return
      }
      if (!options.ar) {
        options.ar = '1:1';
      }
      if (!options.iw) {
        options.iw = '0.5';
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
        json.inputs.push({
          "inputType": "URL",
          "url": await uploadImage(base64),
          "name": "input"
        })
      }

      try {
        const taskId = await submitTask('submit', json);
        if (!taskId) {
          await sendMessage(session, `提交绘图任务失败。`);
          return
        }
        if (config.printProgress) {
          logger.success(`Task ID: ${taskId} | Prompt: ${prompt}`);
        }
        await sendMessage(session, `已提交绘图任务，请耐心等待。`);
        const result = await pollTaskResult(taskId);
        if (result.data.status === 99) {
          if (config.printProgress) {
            logger.success(`Task ID: ${taskId} | Image URL: ${result.data.works[0].resource.resource}`);
          }
          try {
            const messageId = await sendMessage(session, `${h.image(result.data.works[0].resource.resource)}`);
            if (!messageId) {
              await sendMessage(session, `图片发送失败。
图片链接如下：
${result.data.works[0].resource.resource}`);
            }
          } catch (error) {
            logger.error(error);
            await sendMessage(session, `图片发送失败。
图片链接如下：
${result.data.works[0].resource.resource}`);
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
      "topK": 50,
      "topP": 0.9,
      "model": "anthropic/claude-3-5-sonnet-20240620",
      "maxTokensToSample": 4000,
      "messages": [
        {
          "text": text,
          "speaker": "human"
        }
      ]
    };

    try {
      const response = await fetch("https://sourcegraph.com/.api/completions/stream?api-version=1&client-name=web&client-version=0.0.1", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          "x-requested-with": "Sourcegraph",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
          "x-sourcegraph-client": "https://sourcegraph.com",
          "content-type": "application/json; charset=utf-8",
          "origin": "https://sourcegraph.com",
          "sec-fetch-site": "same-origin",
          "sec-fetch-mode": "cors",
          "sec-fetch-dest": "empty",
          "accept-encoding": "gzip, deflate, br, zstd",
          "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
          "priority": "u=1, i",
          "cookie": "sourcegraphAnonymousUid=8bb096cb-663b-4643-929a-2b01c36c9e9e; sourcegraphCohortId=2024-07-29; sourcegraphDeviceId=8bb096cb-663b-4643-929a-2b01c36c9e9e; CookieConsent={stamp:%27-1%27%2Cnecessary:true%2Cpreferences:true%2Cstatistics:true%2Cmarketing:true%2Cmethod:%27implied%27%2Cver:1%2Cutc:1722344152237%2Cregion:%27JP%27}; cody.survey.show=true; sourcegraphInsertId=2119af0c-e1d0-4191-852c-2300b7e9438b; sourcegraphSourceUrl=https://docs-legacy.sourcegraph.com/@v4.4.2/api; sourcegraphRecentSourceUrl=https://docs-legacy.sourcegraph.com/@v4.4.2/api; originalReferrer=https://www.bing.com/; ph_phc_GYC9gnJzJhbUMe7qIZPjMpTwAeF4kkC7AGAOXZgJ4pB_posthog=%7B%22distinct_id%22%3A%22019103b6-1a61-702d-99a9-084eb6be6a65%22%2C%22%24sesid%22%3A%5B1722770606869%2C%2201911d21-0714-7417-9e16-2ed61963ffd2%22%2C1722770589460%5D%7D; _cfuvid=DO8PwNqEjNqfHqG9hu1iooaxAhyYO.La3sYRuohrC7w-1723351350332-0.0.1.1-604800000; __cf_bm=2xEZUAPJz4QCrfqustoi36YIhKsYU9k4GErxe_Igqq8-1723354962-1.0.1.1-_bY5sHCATFyj__MskgujuH.CN3b8KGnLWwaSNsM89vSagXstZBBAgln5y2y6RuxfHVb0McWqlDURywjz8O_nbg; sgs=MTcyMzM1NTI2M3xOd3dBTkU5VFYxWk5SRk5JUjFCUE4wdENWMFJOVUVoRk5rUkpXa2RSTjBaU1RGUlVVREpXUzFSRU1rVk9RMEpTUlVNMVYxUklOMUU9fN9phG_JqwR7yw8m1kuiE_1dmZkNnmGSxLZvtgBCWvu7"

        },
        body: JSON.stringify(json)
      });

      const reader = response.body.getReader();

      while (true) {
        const {done, value} = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data:') && line.includes('end_turn')) {
            const data = JSON.parse(line.slice(5));
            return data.completion;
          }
        }
      }
    } catch (error) {
      logger.error('Error:', error);
      return JSON.stringify({
        english_translation: 'Translation failed.',
        imaginePromptResult: 'Prompt generation failed.',
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
    const url = `https://klingai.kuaishou.com/api/task/status?taskId=${taskId}`;
    const headers = {
      "content-type": "application/json",
      "cookie": config.cookie
    };

    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      logger.error(`HTTP error! status: ${response.status}`);
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
        if (result.status !== 200 || result.data.status === 50) {
          logger.error(`Failed to fetch task result.`);
          return {status: 'FAILURE', message: '任务失败。'};
        }
        if (config.printProgress) {
          logger.info(`Task ID: ${taskId} | Status: ${result.data.status}`);
        }
        if (result.data.status === 99) {
          return result;
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        if (error instanceof Error && error.message === `Polling timed out after ${timeoutDuration} minutes`) {
          logger.error(`Polling timed out after ${timeoutDuration} minutes`);
          return {status: 'FAILURE', message: '任务超时。'};
        }
        logger.error('Error fetching task result:', error);
      }
    }
  }

  async function uploadImage(base64: string): Promise<string> {
    const filename = Math.random().toString(36).substring(7) + '.png';

    const tokenResponse = await fetch(`https://klingai.kuaishou.com/api/upload/issue/token?filename=${filename}`, {
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json, text/plain, */*',
        'cookie': config.cookie
      },
      method: 'GET'
    });

    const tokenData = await tokenResponse.json();
    const uploadToken = tokenData.data.token;

    function base64toBytesArray(base64: string): Uint8Array {
      const binaryString = Buffer.from(base64, 'base64').toString('binary');
      return Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
    }

    const imageBytes = base64toBytesArray(base64);
    const fragmentResponse = await fetch(`https://upload.kuaishouzt.com/api/upload/fragment?upload_token=${uploadToken}&fragment_id=0`, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'content-range': `bytes 0-${imageBytes.length - 1}/${imageBytes.length}`,
        'accept': 'application/json, text/plain, */*',
      },
      body: imageBytes,
      method: 'POST'
    });

    await fragmentResponse.json();

    await fetch(`https://upload.kuaishouzt.com/api/upload/complete?fragment_count=1&upload_token=${uploadToken}`, {
      headers: {
        'accept': 'application/json, text/plain, */*',
      },
      method: 'POST'
    });

    const verifyResponse = await fetch(`https://klingai.kuaishou.com/api/upload/verify/token?token=${uploadToken}`, {
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json, text/plain, */*',
        'cookie': config.cookie
      },
      method: 'GET'
    });

    const verifyData = await verifyResponse.json();
    return verifyData.data.url;
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
    const response = await fetch(`https://klingai.kuaishou.com/api/task/${type}`, requestOptions);
    const data = await response.json();

    if (data.status !== 200) {
      logger.error(`Failed to submit task.`);
      return '';
    }

    return data.data.task.id;
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
