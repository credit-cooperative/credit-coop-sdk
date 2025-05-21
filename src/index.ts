/**
 * Wrapper for the Credit Coop **Secured Line** smart-contract. This class
 * provides a type-safe interface to various contract methods.
 *
 * @example
 * ```ts
 * import { SecuredLine } from '@credit-coop/sdk';
 *
 * const line = new SecuredLine({
 *   address:  '0xc4a54a88d278c6aDe87F295a105dF844cf072a50',
 *   privateKey: process.env.PRIVATE_KEY as Hex,
 *   chainId: 'mainnet',
 *   rpcUrl:  'https://eth.llamarpc.com',
 * });
 *
 * const txHash = await line.borrow({
 *   positionId: 0,
 *   amount: 1_000_000n,          // 1 USDC (6 decimals)
 * });
 *
 * console.info(`Draw-down confirmed in tx ${txHash}`);
 * ```
 */

import {
  type Hex,
  type GetContractReturnType,
  type WalletClient,
  type Address,
  getContract,
  createWalletClient,
  http,
  createPublicClient,
  type PublicClient,
} from "viem";
import * as Chains from "viem/chains";

import { privateKeyToAccount } from "viem/accounts";
import SecuredLineABI from "./contracts/abis/SecuredLine.json";

type ChainId = keyof typeof Chains;

type SecuredLineInstance = GetContractReturnType<
  typeof SecuredLineABI,
  { wallet: WalletClient },
  Hex
>;

export class SecuredLine {
  private contract: SecuredLineInstance;
  private walletAddress: Address;
  private walletClient: WalletClient;
  private publicClient: PublicClient;

  /**
   * Creates a new `SecuredLine` wrapper.
   *
   * @param params.address    Deployed SecuredLine contract address.
   * @param params.privateKey Hex-encoded ECDSA private key that will become
   *                          `msg.sender` for all write actions.
   * @param params.chainId    Key of `viem/chains`, e.g. `"mainnet"`, `"base"`.
   * @param params.rpcUrl     HTTPS or WebSocket endpoint compatible with
   *                          `eth_*` & `debug_*` RPC methods.
   *
   * @throws If `chainId` does not exist in `viem/chains`.
   */
  constructor({
    address,
    privateKey,
    chainId,
    rpcUrl,
  }: {
    address: Hex;
    privateKey: Hex;
    chainId: ChainId;
    rpcUrl: string;
  }) {
    const chain = Chains[chainId];

    const account = privateKeyToAccount(privateKey);
    this.walletAddress = account.address;
    this.walletClient = createWalletClient({
      account,
      chain,
      transport: http(chain.rpcUrls.default.http[0]),
    });

    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    }) as PublicClient;

    this.contract = getContract({
      address,
      abi: SecuredLineABI,
      client: {
        wallet: this.walletClient,
      },
    });
  }

  /**
   * Draws down credit from the line.
   *
   * Wraps the Solidity call `borrow(uint256 id, uint256 amount, address to)`.
   *
   * @param params.positionId  Unique position/tranche identifier on the line.
   * @param params.amount      Principal to draw **in smallest token units**.
   * @param params.to          Optional recipient. Defaults to the wallet
   *                           address used for signing.
   *
   * @returns `Promise<Hex>` — the transaction hash **once the transaction is
   *          confirmed in the forked/local chain**.
   *
   * @throws `Error` — If the transaction reverts or its receipt
   *         has `status !== 'success'`.
   *
   * @example
   * ```ts
   * await line.borrow({
   *   positionId: 2,
   *   amount: 500_000n,
   *   to: '0x1234…dead' as Hex,
   * });
   * ```
   */
  async borrow({
    positionId,
    amount,
    to,
  }: {
    positionId: number;
    amount: bigint;
    to?: Hex;
  }) {
    console.log("Borrowing", {
      positionId,
      amount,
      to: to ?? this.walletAddress,
    });

    const txnHash = await this.contract.write.borrow([
      positionId,
      amount,
      to ?? this.walletAddress,
    ]);

    const result = await this.publicClient.waitForTransactionReceipt({
      hash: txnHash,
    });

    if (result.status !== "success") {
      throw new Error(`Transaction failed: ${result.transactionHash}`);
    }

    return result.transactionHash;
  }
}
