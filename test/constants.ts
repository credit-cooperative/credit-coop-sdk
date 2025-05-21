import { type Hex } from "viem";
import dotenv from 'dotenv';
import path from 'path'

const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

// Default anvil wallet
export const TEST_SECRET = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as Hex;
export const TEST_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

// Existing borrower wallet on forked Base SecuredLine
export const OLD_BORROWER = '0x3Edc2823445fc0D117D75C60D3d4c45E2Bd76223';

export const LINE_ADDRESS = '0xc4a54a88d278c6ade87f295a105df844cf072a50' as Hex
export const ALCHEMY_BASE_API_KEY = process.env.ALCHEMY_BASE_API_KEY;
export const PORT = 8545;
export const FORK_BLOCK = 30240953;
export const RPC = `http://127.0.0.1:${PORT}`;