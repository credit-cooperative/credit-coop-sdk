import { describe, expect, it } from "vitest";
import { SecuredLine } from "../src";
import {
  LINE_ADDRESS,
  RPC,
  TEST_SECRET,
  USDC_TOKEN_ADDRESS,
} from "./constants";

const initLine = () => {
  return new SecuredLine({
    address: LINE_ADDRESS,
    privateKey: TEST_SECRET,
    chainId: "hardhat",
    rpcUrl: RPC,
  });
};

describe("SecuredLine", () => {
  it("sends a borrow tx that succeeds", async () => {
    const borrowAmount = 1_000_000n;
    const line = initLine();

    let position = await line.getPosition(8n);
    const liquidityBeforeBorrow = await line.getPositionLiquidity(8n);
    const existingPrincipal = position.principal;

    const txHash = await line.borrow({
      positionId: 8n,
      amount: borrowAmount,
    });

    expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

    position = await line.getPosition(8n);
    const liquidityAfterBorrow = await line.getPositionLiquidity(8n);
    expect(position).toBeDefined();
    expect(position.principal).toBe(borrowAmount + existingPrincipal);
    expect(liquidityAfterBorrow.availableAssets).toBe(
      liquidityBeforeBorrow.availableAssets - borrowAmount,
    );
  });

  it("sends a borrow tx that fails with NoLiquidity error", async () => {
    const line = initLine();

    await expect(async () => {
      await line.borrow({
        positionId: 8n,
        amount: 100_000_000_000n,
      });
    }).rejects.toThrowError(/NoLiquidity/);
  });

  it("sends a borrow tx that fails on an invalid position", async () => {
    const line = initLine();

    await expect(async () => {
      await line.borrow({
        positionId: 99999n,
        amount: 100_000_000_000n,
      });
    }).rejects.toThrowError(/PositionIsClosed/);
  });

  it("correctly gets the open position IDs", async () => {
    const line = initLine();

    const positionIds = await line.getOpenPositionIds();

    expect(positionIds).toEqual([8n]);
  });

  it("borrows using the position ID from getOpenPositionIds()", async () => {
    const line = initLine();

    const positionIds = await line.getOpenPositionIds();
    const positionId = positionIds[0];
    const txHash = await line.borrow({
      positionId,
      amount: 1_000_000n,
    });

    expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it("pulls full position data", async () => {
    const line = initLine();

    const positionIds = await line.getOpenPositionIds();
    const positionId = positionIds[0];
    const position = await line.getPosition(positionId);
    expect(position).toBeDefined();
    expect(position.decimals).toBe(6);
    expect(position.deposit).toBe(50_000_000_000n); // 50,000 USDC
    expect(position.principal).toBe(2_008_081n); // 2.01 USDC
    expect(position.interestAccrued).toBeGreaterThan(5_000_000n); // 5+ USDC
    expect(position.interestRepaid).toBe(285_932_389n); // 285.93 USDC
    expect(position.deadline).toBe(1748494799n);
    expect(position.isOpen).toBe(true);
    expect(position.earlyWithdrawalFee).toBe(0);
    expect(position.isRestricted).toBe(false);
    expect(position.tokenId).toBe(8n);
    expect(position.token).toBe(USDC_TOKEN_ADDRESS);
  });

  it("gets position liquidity", async () => {
    const line = initLine();

    const positionIds = await line.getOpenPositionIds();
    const positionId = positionIds[0];
    const liquidity = await line.getPositionLiquidity(positionId);
    expect(liquidity.availableAssets).toBe(49_997_991_919n); // 49,997.99 USDC
    expect(liquidity.claimableInterest).toBe(285_932_389n); // 285.93 USDC
  });
});
