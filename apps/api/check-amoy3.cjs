async function run() {
  const amoyRes = await fetch("https://rpc.ankr.com/polygon_amoy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getBalance", params: ["0xbDB237d26E9A04d6a68EbAcF7676b83398581824", "latest"], id: 1 })
  });
  const data = await amoyRes.json();
  console.log("Balance:", data);
}
run();
