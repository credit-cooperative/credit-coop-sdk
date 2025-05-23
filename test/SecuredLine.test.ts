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
      positionId: 8n,
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
        positionId: 8n,
        amount: 100_000_000_000n,
      });
    }).rejects.toThrowError(/NoLiquidity/);
  });

  it("sends a borrow tx that fails on an invalid position", async () => {
    const line = new SecuredLine({
      address: LINE_ADDRESS,
      privateKey: TEST_SECRET,
      chainId: "hardhat",
      rpcUrl: RPC,
    });

    await expect(async () => {
      await line.borrow({
        positionId: 99999n,
        amount: 100_000_000_000n,
      });
    }).rejects.toThrowError(/PositionIsClosed/);
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

  it("borrows using the position ID from getOpenPositionIds()", async () => {
    const line = new SecuredLine({
      address: LINE_ADDRESS,
      privateKey: TEST_SECRET,
      chainId: "hardhat",
      rpcUrl: RPC,
    });

    const positionIds = await line.getOpenPositionIds();
    const positionId = positionIds[0];
    const txHash = await line.borrow({
      positionId,
      amount: 1_000_000n,
    });

    expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });
});
