import WebSocket from "ws";
import crypto from "crypto";

function generateSecMsGec(divisor: bigint): string {
  const trustedClientToken = "6A5AA1D4EAFF4E9FB37E23D3C21DDDCE";
  const ticks = (BigInt(Date.now()) + 11644473600000n) * 10000n;
  const ticksRounded = divisor === 1n ? ticks : ticks - (ticks % divisor);
  const data = ticksRounded.toString() + trustedClientToken;
  const hash = crypto.createHash("sha256").update(data, "ascii").digest("hex").toUpperCase();
  return hash;
}

async function tryConnection(divisor: bigint, divisorLabel: string, useUppercaseToken: boolean): Promise<boolean> {
  const secMsGec = generateSecMsGec(divisor);
  const tokenParam = useUppercaseToken ? "TrustedClientToken" : "trustedclienttoken";
  const connectionId = crypto.randomBytes(16).toString("hex").toUpperCase();

  console.log(`[Testing ${divisorLabel} / Token: ${tokenParam}] GEC: ${secMsGec}`);

  const trustedClientToken = "6A5AA1D4EAFF4E9FB37E23D3C21DDDCE";
  const endpoint = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?${tokenParam}=${trustedClientToken}&ConnectionId=${connectionId}`;

  const ws = new WebSocket(endpoint, {
    headers: {
      "Pragma": "no-cache",
      "Cache-Control": "no-cache",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      "Origin": "chrome-extension://jdiccldimpdaibohphhopfldocgfhjdm",
      "Sec-MS-GEC": secMsGec,
      "Sec-MS-GEC-Version": "1-3.0.0"
    }
  });

  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      console.log(`  -> Result: Timeout`);
      ws.terminate();
      resolve(false);
    }, 4000);

    ws.on("open", () => {
      console.log(`  -> SUCCESS! Connected!`);
      ws.close();
      clearTimeout(timeout);
      resolve(true);
    });

    ws.on("error", (err: any) => {
      console.log(`  -> Result: Error (${err.message})`);
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
  const testCases = [
    { div: 3000000000n, label: "5 minutes" },
    { div: 300000000n, label: "30 seconds" }
  ];

  for (const tc of testCases) {
    for (const upper of [true, false]) {
      const ok = await tryConnection(tc.div, tc.label, upper);
      if (ok) {
        console.log("\nSuccess found!");
        return;
      }
    }
  }
}

run();
