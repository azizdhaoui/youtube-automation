import WebSocket from "ws";
import crypto from "crypto";

const trustedClientToken = "6A5AA1D4EAFF4E9FB37E23D3C21DDDCE";

function getGEC(ticks: bigint, lowercaseToken: boolean, tokenFirst: boolean): string {
  const token = lowercaseToken ? trustedClientToken.toLowerCase() : trustedClientToken.toUpperCase();
  const ticksStr = ticks.toString();
  const data = tokenFirst ? (token + ticksStr) : (ticksStr + token);
  return crypto.createHash("sha256").update(data, "ascii").digest("hex").toUpperCase();
}

async function tryConnect(secMsGec: string, label: string): Promise<boolean> {
  const endpoint = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${trustedClientToken}&ConnectionId=${crypto.randomBytes(16).toString("hex").toUpperCase()}`;

  const ws = new WebSocket(endpoint, {
    headers: {
      "Pragma": "no-cache",
      "Cache-Control": "no-cache",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.68",
      "Origin": "chrome-extension://jdiccldimpdaibohphhopfldocgfhjdm",
      "Sec-MS-GEC": secMsGec,
      "Sec-MS-GEC-Version": "1-130.0.2849.68"
    }
  });

  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      ws.terminate();
      resolve(false);
    }, 3000);

    ws.on("open", () => {
      console.log(`\n  ==> [SUCCESS] SUCCESS with: ${label}!\n`);
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
  const divisors = [3000000000n, 300000000n];
  const nowMs = BigInt(Date.now());
  const ticksBase = (nowMs + 11644473600000n) * 10000n;

  console.log("Running GEC structural layout sweep...");

  for (const div of divisors) {
    const ticks = ticksBase - (ticksBase % div);
    console.log(`- Swapping layouts for divisor: ${div}`);

    const permutations = [
      { lowercaseToken: false, tokenFirst: false, name: "TICKS + UPPERCASE_TOKEN" },
      { lowercaseToken: true, tokenFirst: false, name: "TICKS + LOWERCASE_TOKEN" },
      { lowercaseToken: false, tokenFirst: true, name: "UPPERCASE_TOKEN + TICKS" },
      { lowercaseToken: true, tokenFirst: true, name: "LOWERCASE_TOKEN + TICKS" }
    ];

    for (const p of permutations) {
      const gec = getGEC(ticks, p.lowercaseToken, p.tokenFirst);
      process.stdout.write(`  Testing ${p.name}... `);
      const ok = await tryConnect(gec, `${p.name} (div: ${div})`);
      if (ok) {
        console.log(`Success found! Hash used: ${gec}`);
        return;
      } else {
        console.log("401");
      }
    }
  }

  console.log("Sweep complete. No successful GEC configuration found directly.");
}

run();
