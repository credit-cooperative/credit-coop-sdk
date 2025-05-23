import { describe, expect, it } from "vitest";
import { SecuredLine } from "../src";
import { LINE_ADDRESS, RPC, TEST_SECRET } from "./constants";

describe("SecuredLine.borrow()", () => {
  it("sends a borrow tx that succeeds", async () => {
    const line = new SecuredLine({
      address: LINE_ADDRESS,
      privateKey: TEST_SECRET,
      chainId: "hardhat",
      rpcUrl: RPC,
    });

    const txHash = await line.borrow({
      positionId: 8,
      amount: 1_000_000n,
    });

    expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it("sends a borrow tx that fails with NoLiquidity error", async () => {
    const line = new SecuredLine({
      address: LINE_ADDRESS,
      privateKey: TEST_SECRET,
      chainId: "hardhat",
      rpcUrl: RPC,
    });

    await expect(async () => {
      await line.borrow({
        positionId: 8,
        amount: 100_000_000_000n,
      });
    }).rejects.toThrowError(/NoLiquidity/);
  });

  it("correctly gets the open position IDs", async () => {
    const line = new SecuredLine({
      address: LINE_ADDRESS,
      privateKey: TEST_SECRET,
      chainId: "hardhat",
      rpcUrl: RPC,
    });

    const positionIds = await line.getOpenPositionIds();

    expect(positionIds).toEqual([8n]);
  });
});
