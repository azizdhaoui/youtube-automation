async function checkDrift() {
  try {
    const start = Date.now();
    const res = await fetch("https://httpbin.org/delay/0");
    const networkDateHeader = res.headers.get("date");
    const end = Date.now();
    if (!networkDateHeader) {
      console.log("No Date header received!");
      return;
    }
    const networkMs = new Date(networkDateHeader).getTime();
    const localMs = (start + end) / 2;
    console.log("Network Time (UTC):", new Date(networkMs).toISOString());
    console.log("Local Container Time (UTC):", new Date(localMs).toISOString());
    console.log("Difference (local - network) in ms:", localMs - networkMs);
  } catch (err) {
    console.error("Failed to check clock drift:", err);
  }
}

checkDrift();
