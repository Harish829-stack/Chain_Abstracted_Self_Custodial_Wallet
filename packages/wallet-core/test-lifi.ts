import { createClient, getTokens, getQuote } from '@lifi/sdk';

createClient({
  integrator: 'caw-wallet',
  apiUrl: 'https://li.quest/v1',
});

async function main() {
  try {
    const tokens = await getTokens({ chains: [11155111, 84532] });
    console.log("Tokens ETH Sepolia:", tokens.tokens[11155111]?.map(t => t.symbol).slice(0, 10));
    console.log("Tokens Base Sepolia:", tokens.tokens[84532]?.map(t => t.symbol).slice(0, 10));
    
    // Find USDC on Base Sepolia
    const baseUsdc = tokens.tokens[84532]?.find(t => t.symbol === "USDC");
    console.log("Base Sepolia USDC:", baseUsdc);

    if (baseUsdc) {
      const quote = await getQuote({
        fromChain: 11155111,
        toChain: 84532,
        fromToken: '0x0000000000000000000000000000000000000000',
        toToken: baseUsdc.address,
        fromAmount: '10000000000000000', // 0.01 ETH
        fromAddress: '0x0000000000000000000000000000000000000000'
      });
      console.log("Quote found!", quote.estimate.toAmount);
    }
  } catch (err) {
    console.error(err);
  }
}
main();
