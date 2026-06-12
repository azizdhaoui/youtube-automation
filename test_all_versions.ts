import WebSocket from "ws";
import crypto from "crypto";

const trustedClientToken = "6A5AA1D4EAFF4E9FB37E23D3C21DDDCE";

function getGEC(ticks: bigint): string {
  const data = ticks.toString() + trustedClientToken;
  return crypto.createHash("sha256").update(data, "ascii").digest("hex").toUpperCase();
}

async function tryConnect(edgeVersion: string): Promise<boolean> {
  const nowMs = BigInt(Date.now());
  const ticksBase = (nowMs + 11644473600000n) * 10000n;
  const ticks = ticksBase - (ticksBase % 3000000000n);
  const gec = getGEC(ticks);

  const connId = crypto.randomBytes(16).toString("hex").toUpperCase();
  const endpoint = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?trustedclienttoken=${trustedClientToken}&ConnectionId=${connId}`;

  const headers = {
    "Pragma": "no-cache",
    "Cache-Control": "no-cache",
    "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/${edgeVersion}`,
    "Origin": "chrome-extension://jdiccldimpdaibohphhopfldocgfhjdm",
    "Sec-MS-GEC": gec,
    "Sec-MS-GEC-Version": `1-${edgeVersion}`
  };

  const ws = new WebSocket(endpoint, { headers });

  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      ws.terminate();
      resolve(false);
    }, 2500);

    ws.on("open", () => {
      console.log(`\n  ==> [SUCCESS] Connection opened with Edge Version: ${edgeVersion}!\n`);
      ws.close();
      clearTimeout(timeout);
      resolve(true);
    });

    ws.on("error", () => {
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
  const versions = [
    "130.0.2849.68",
    "131.0.2903.86",
    "130.0.0.0",
    "128.0.2735.62",
    "126.0.2592.89",
    "125.0.2535.51",
    "124.0.2478.97",
    "123.0.2420.81",
    "122.0.2365.106",
    "121.0.2277.128",
    "120.0.2210.133",
    "119.0.2151.44",
    "118.0.2088.46",
    "117.0.2045.31",
  ];

  console.log("Checking Edge TTS GEC versions compatibility...");
  for (const ver of versions) {
    process.stdout.write(`Testing version ${ver}... `);
    const ok = await tryConnect(ver);
    if (ok) {
      console.log("FOUND!");
      return;
    } else {
      console.log("401");
    }
  }
  console.log("Sweep complete.");
}

run();
