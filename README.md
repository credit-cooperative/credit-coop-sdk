# Credit Coop SDK

## Introduction

A type‑safe JavaScript / TypeScript client for interacting with Credit Coop’s on‑chain credit infrastructure.

## Requirements

| Tool        | Version |
| ----------- | ------- |
| Node        | ≥ 22    |
| TypeScript  | ≥ 5     |

## Installation

```bash
# Yarn
yarn add @credit-cooperative/credit-coop-sdk

# npm
npm i @credit-cooperative/credit-coop-sdk
```

## Quick Start

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

  // Get first open credit position ID
  const openPositionIds = await line.getOpenPositionIds();
  const positionId = openPositionIds[0];

  // Get the amount of assets available to borrow from the open credit position
  const { availableAssets } = await line.getPositionLiquidity(positionId);

  // Borrow the full amount from the open credit position to the borrower wallet
  await line.borrow({
    positionId: positionId,
    amount: availableAssets,
  });

  // Confirm updated credit position data
  const { principal } = await line.getPosition(positionId);
  console.log('Credit line now has principal of ', principal);
}
```