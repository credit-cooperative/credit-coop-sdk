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
import { SecuredLine } from '@credit-cooperative/credit-coop-sdk';

// Initialize the SecuredLine interface
const line = new SecuredLine({
  address:   '0x…',
  privateKey: process.env.PRIVATE_KEY,
  chainId:   'base',
  rpcUrl:    'https://base-mainnet.g.alchemy.com/v2/<API_KEY>',
});

// Fetch open position IDs
const openPositionIds = await line.getOpenPositionIds();

// Draw down 10,000 USDC from the first open credit position to the borrower wallet
await line.borrow({ positionId: openPositionIds[0], amount: 10_000_000_000n });
```

---

MIT © Credit Coop 2025
