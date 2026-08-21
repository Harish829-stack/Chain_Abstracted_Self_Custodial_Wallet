import { parseEther } from "viem";

export async function buildAndExecuteEVMIntent(wallet: any, quote: any, toAddress?: string): Promise<{ txHash: string, intentPayload: any }> {
  const walletClient = "getWalletClient" in wallet ? await wallet.getWalletClient() : wallet;
  
  const sourcePortalAddress = "0xd71ab006670A0fF4084D14104bB015064Bd0df33" as `0x${string}`;
  const destPortalAddress = "0xd71ab006670A0fF4084D14104bB015064Bd0df33" as `0x${string}`;
  const hyperProverAddress = "0x7B7b64A9e5592A825Fe450513445B53e6E0554De" as `0x${string}`;
  
  const randomSalt = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("") as `0x${string}`;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour

  const intentPayload = {
    destination: BigInt(quote.toChain),
    route: {
      salt: randomSalt,
      deadline: deadline,
      portal: destPortalAddress,
      nativeAmount: parseEther(quote.toAmount), // User wants this amount on destination
      tokens: [],
      calls: [
        {
          target: (toAddress || wallet.address) as `0x${string}`,
          data: "0x",
          value: parseEther(quote.toAmount)
        }
      ]
    },
    reward: {
      deadline: deadline,
      creator: wallet.address as `0x${string}`,
      prover: hyperProverAddress,
      nativeAmount: parseEther(quote.fromAmount), // User pays this amount on source
      tokens: []
    }
  };

  const PortalAbi = (await import("../PortalAbi.json")).default;

  if (walletClient.writeContract) {
    const txHash = await walletClient.writeContract({
      address: sourcePortalAddress,
      abi: PortalAbi,
      functionName: "publishAndFund",
      args: [intentPayload, false], // Intent, allowPartial
      value: intentPayload.reward.nativeAmount // Escrow the ETH reward on source chain
    });
    return { txHash, intentPayload };
  } else {
    throw new Error("Wallet does not support writeContract");
  }
}
