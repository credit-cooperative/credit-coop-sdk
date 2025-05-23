/**
 * Wrapper for the Credit Coop **Secured Line** smart-contract. This class
 * provides a type-safe interface to various contract methods.
 *
 * @example
 * ```ts
 * import { SecuredLine } from '@credit-cooperative/credit-coop-sdk';
 *
 * // Initialize the SecuredLine interface
 * const line = new SecuredLine({
 *   address:   '0x…',
 *   privateKey: process.env.PRIVATE_KEY,
 *   chainId:   'base',
 *   rpcUrl:    'https://base-mainnet.g.alchemy.com/v2/<API_KEY>',
 * });
 *
 * // Fetch open position IDs
 * const openPositionIds = await line.getOpenPositionIds();
 *
 * // Draw down 10,000 USDC from the first open credit position to the borrower wallet
 * await line.borrow({ positionId: openPositionIds[0], amount: 10_000_000_000n });
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
import SecuredLineABI from "./contracts/abis/SecuredLine";

type ChainId = keyof typeof Chains;

type SecuredLineInstance = GetContractReturnType<
  typeof SecuredLineABI,
  { wallet: WalletClient; public: PublicClient },
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
        public: this.publicClient,
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
   *   positionId: 2n,
   *   amount: 10_000_000_000n, // 10,000 USDC (6 decimals)
   *   to: '0x1234…dead',
   * });
   * ```
   */
  async borrow({
    positionId,
    amount,
    to,
  }: {
    positionId: bigint;
    amount: bigint;
    to?: Hex;
  }) {
    // @ts-expect-error Need to fix typing with viem, it shouldn't expect options
    const txnHash = await this.contract.write.borrow([
      positionId,
      amount,
      to ?? this.walletAddress,
    ]);

    const result = await this.publicClient.waitForTransactionReceipt({
      hash: txnHash,
    });

    return result.transactionHash;
  }

  /**
   * Retrieves an array of open position IDs from the contract.
   *
   * This method first reads the count of open positions from the contract by calling
   * the `counts` method, then iterates over each index to request the corresponding
   * position ID using the `ids` function.
   *
   * @returns {Promise<bigint[]>} A promise that resolves to an array of position IDs represented as bigints.
   */
  async getOpenPositionIds(): Promise<bigint[]> {
    const [openPositionCount] = await this.contract.read.counts();
    const promises: Promise<bigint>[] = [];

    for (let i = 0n; i < openPositionCount; i += 1n) {
      promises.push(this.contract.read.ids([i]));
    }

    const openPositionIds = await Promise.all(promises);

    return openPositionIds;
  }

  async getPosition(positionId: bigint) {
    const position = await this.contract.read.getCreditPosition([positionId]);
    return position;
  }
}
