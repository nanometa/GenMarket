import { defineChain } from "viem";
export const GENLAYER_CHAIN_ID = 4221;
export const GENLAYER_RPC_URL = "https://rpc-bradbury.genlayer.com";
export const CONTRACT_ADDRESS = "0x9526cfB6ECcDDB50f7886474c5088983FfBAC0E8" as const;
export const GENLAYER_NETWORK = "testnetBradbury" as const;
export const genLayerBradbury = defineChain({
  id: GENLAYER_CHAIN_ID,
  name: "GenLayer Bradbury",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: { default: { http: [GENLAYER_RPC_URL] }, public: { http: [GENLAYER_RPC_URL] } },
  blockExplorers: { default: { name: "Explorer", url: "https://explorer-bradbury.genlayer.com" } },
  testnet: true,
});
