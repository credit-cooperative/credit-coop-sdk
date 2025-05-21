# Credit Coop SDK

## Introduction

A type‑safe JavaScript / TypeScript client for interacting with Credit Coop’s on‑chain credit infrastructure.

## Requirements

| Tool        | Version |
| ----------- | ------- |
| Node        | ≥ 22    |
| TypeScript  | ≥ 5     |
| Viem (peer) | ≥ 2.30  |

## Installation

```bash
# Yarn
yarn add @credit-coop/secured-line-sdk viem

# npm
npm i @credit-coop/secured-line-sdk viem
```

## Quick Start

```ts
import { SecuredLine } from '@credit-coop/secured-line-sdk';

const line = new SecuredLine({
  address:   '0x…',
  privateKey: process.env.PRIVATE_KEY,
  chainId:   'base',
  rpcUrl:    'https://base-mainnet.g.alchemy.com/v2/<API_KEY>',
});

await line.borrow({ positionId: 0, amount: 1_000_000n });
```

---

MIT © Credit Coop 2025
