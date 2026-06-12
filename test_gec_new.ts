import WebSocket from "ws";
import crypto from "crypto";

const trustedClientToken = "6A5AA1D4EAFF4E9FB37E23D3C21DDDCE";

function getGEC(ticks: bigint): string {
  const data = ticks.toString() + trustedClientToken;
  return crypto.createHash("sha256").update(data, "ascii").digest("hex").toUpperCase();
}

async function tryConnect(lowercaseToken: boolean, lowercaseHeaders: boolean): Promise<boolean> {
  const nowMs = BigInt(Date.now());
  const ticksBase = (nowMs + 11644473600000n) * 10000n;
  const ticks = ticksBase - (ticksBase % 3000000000n);
  const gec = getGEC(ticks);

  const tokenParam = lowercaseToken ? "trustedclienttoken" : "TrustedClientToken";
  const connId = crypto.randomBytes(16).toString("hex").toUpperCase();
  const endpoint = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?${tokenParam}=${trustedClientToken}&ConnectionId=${connId}`;

  const edgeVersion = "130.0.2849.68";
  const headers: any = {
    "Pragma": "no-cache",
    "Cache-Control": "no-cache",
    "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/${edgeVersion}`,
    "Origin": "chrome-extension://jdiccldimpdaibohphhopfldocgfhjdm",
  };

  if (lowercaseHeaders) {
    headers["sec-ms-gec"] = gec;
    headers["sec-ms-gec-version"] = `1-${edgeVersion}`;
  } else {
    headers["Sec-MS-GEC"] = gec;
    headers["Sec-MS-GEC-Version"] = `1-${edgeVersion}`;
  }

  const ws = new WebSocket(endpoint, { headers });

  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      ws.terminate();
      resolve(false);
    }, 4000);

    ws.on("open", () => {
      console.log(`\n[SUCCESS] Connected! lowercaseToken: ${lowercaseToken}, lowercaseHeaders: ${lowercaseHeaders}\n`);
      ws.close();
      clearTimeout(timeout);
      resolve(true);
    });

    ws.on("error", (err: any) => {
      clearTimeout(timeout);
      resolve(false);
    });

    ws.on("close", () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

async function run() {
  for (const lowercaseToken of [true, false]) {
    for (const lowercaseHeaders of [true, false]) {
      console.log(`Testing lowercaseToken: ${lowercaseToken}, lowercaseHeaders: ${lowercaseHeaders}...`);
      const ok = await tryConnect(lowercaseToken, lowercaseHeaders);
      if (ok) {
        console.log("Found working credentials!");
        return;
      } else {
        console.log("  -> 401 Unauthorized");
      }
    }
  }
}

run();
