const { createPublicClient, http } = require('viem');
const { sepolia } = require('viem/chains');

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http("https://ethereum-sepolia-rpc.publicnode.com")
});

async function main() {
  const hash = "0x53b972321419efae18728df050f4d36e2f694e9f9065a7ecb7b4d326a9b7b2f";
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash });
    console.log("Receipt status:", receipt.status);
  } catch (err) {
    console.error("Error fetching receipt:", err.message);
  }
}
main();
