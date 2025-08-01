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
   * @throws `Error` — If the transaction reverts
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

  /**
   * Retrieves the details of a secured credit position using the provided position ID.
   *
   * @param positionId - A unique bigint representing the credit position ID. Can be obtained from `getOpenPositionIds()`.
   *
   * @returns A promise that resolves to an object containing the following properties:
   *  - deposit:  The total liquidity provided by a Lender as a bigint.
   *  - principal: The amount of a Lender's Deposit on a Line of Credit that has actually been drawn down by the Borrower (in Tokens)
   *  - interestAccrued: Interest due by a Borrower but not yet repaid to the Line of Credit contract
   *  - interestRepaid:  Interest repaid by a Borrower to the Line of Credit contract but not yet withdrawn by a Lender
   *  - decimals: The number of decimals of the credit token as a number.
   *  - token: The credit token address in hexadecimal format prefixed with '0x'.
   *  - tokenId: The unique credit token ID as a bigint.
   *  - isOpen: A boolean indicating if the credit position is currently open.
   *  - isRestricted: A boolean indicating whether the token can be traded.
   *  - earlyWithdrawalFee: The fee fee paid by lender for withdrawing deposit early in bps.
   *  - deadline: The timestamp at which the position will be liquidatable as a bigint.
   */
  async getPosition(positionId: bigint) {
    const position = await this.contract.read.getCreditPosition([positionId]);
    return position;
  }

  /**
   * Retrieves the liquidity details for a specific position.
   *
   * This function reads the available assets for the given position ID from the smart contract and returns an object containing
   * both the remaining assets available for borrowing or withdrawal and the claimable interest for that position.
   *
   * @param positionId - The unique identifier for the position, represented as a bigint.
   * @returns An object containing:
   *  - availableAssets: The assets available for borrowing or withdrawal.
   *  - claimableInterest: The interest amount that can be claimed.
   */
  async getPositionLiquidity(positionId: bigint) {
    const available = await this.contract.read.available([positionId]);
    return {
      availableAssets: available[0],
      claimableInterest: available[1],
    };
  }

  // ------------------------
  // Read-only contract calls
  // ------------------------

  async admin() {
    return this.contract.read.admin();
  }

  async available(positionId: bigint) {
    return this.contract.read.available([positionId]);
  }

  async borrower() {
    return this.contract.read.borrower();
  }

  async claimableEarlyWithdrawalFees(tokenId: bigint) {
    return this.contract.read.claimableEarlyWithdrawalFees([tokenId]);
  }

  async counts() {
    return this.contract.read.counts();
  }

  async escrow() {
    return this.contract.read.escrow();
  }

  async getCreditPosition(tokenId: bigint) {
    return this.contract.read.getCreditPosition([tokenId]);
  }

  async getFees() {
    return this.contract.read.getFees();
  }

  async getLineFactory() {
    return this.contract.read.getLineFactory();
  }

  async getRates(id: bigint) {
    return this.contract.read.getRates([id]);
  }

  async ids(index: bigint) {
    return this.contract.read.ids([index]);
  }

  async interestAccrued(id: bigint) {
    return this.contract.read.interestAccrued([id]);
  }

  async isServicer(addr: Hex) {
    return this.contract.read.isServicer([addr]);
  }

  async mutualConsentProposals(id: Hex) {
    return this.contract.read.mutualConsentProposals([id]);
  }

  async nextInQ() {
    return this.contract.read.nextInQ();
  }

  async nonce() {
    return this.contract.read.nonce();
  }

  async otcSwapServicer() {
    return this.contract.read.otcSwapServicer();
  }

  async proposalCount() {
    return this.contract.read.proposalCount();
  }

  async protocolTreasury() {
    return this.contract.read.protocolTreasury();
  }

  async rates(index: bigint) {
    return this.contract.read.rates([index]);
  }

  async recoveryEnabled() {
    return this.contract.read.recoveryEnabled();
  }

  async spigot() {
    return this.contract.read.spigot();
  }

  async status() {
    return this.contract.read.status();
  }

  async swapTarget() {
    return this.contract.read.swapTarget();
  }

  async tokenContract() {
    return this.contract.read.tokenContract();
  }

  async tradeable(token: Hex) {
    return this.contract.read.tradeable([token]);
  }

  async unused(token: Hex) {
    return this.contract.read.unused([token]);
  }
}
