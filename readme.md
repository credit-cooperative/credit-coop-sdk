# Credit Coop SDK

## Introduction

A type‑safe JavaScript / TypeScript client for interacting with Credit Coop’s on‑chain credit infrastructure.

## Requirements

| Tool        | Version |
| ----------- | ------- |
| Node        | ≥ 22    |
| TypeScript  | ≥ 5     |

## Installation

```bash
# Yarn
yarn add @credit-cooperative/credit-coop-sdk

# npm
npm i @credit-cooperative/credit-coop-sdk
```

## Quick Start

```ts
import { SecuredLine } from "@credit-cooperative/credit-coop-sdk";

async function main() {
  // Initialize the SecuredLine interface
  const line = new SecuredLine({
    address: "0x…",
    privateKey: process.env.PRIVATE_KEY,
    chainId: "base",
    rpcUrl: "https://base-mainnet.g.alchemy.com/v2/<API_KEY>",
  });

  // Fetch open position IDs
  const openPositionIds = await line.getOpenPositionIds();

  // Get the amount of assets available to borrow for the first open credit position
  const { availableAssets } = await line.getPositionLiquidity(openPositionIds[0]);

  // Borrow the full amount from the first open credit position to the borrower wallet
  await line.borrow({
    positionId: openPositionIds[0],
    amount: availableAssets,
  });
}
```
