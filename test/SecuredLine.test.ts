import { describe, expect, it } from "vitest";
import { SecuredLine } from "../src";
import { LINE_ADDRESS, TEST_SECRET } from "./constants";

const RPC = "http://127.0.0.1:8545";

describe("SecuredLine.borrow()", () => {
  it("sends a borrow tx that succeeds", async () => {
    const line = new SecuredLine({
      address: LINE_ADDRESS,
      privateKey: TEST_SECRET,
      chainId: "base",
      rpcUrl: RPC,
    });

    const txHash = await line.borrow({
      positionId: 8,
      amount: 1_000_000n,
    });

    console.log("txHash", txHash);

    expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });
});
