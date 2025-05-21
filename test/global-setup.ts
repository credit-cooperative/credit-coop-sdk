import { type Address, createPublicClient, createWalletClient, getContract, http } from 'viem'
import { ChildProcess, spawn } from 'child_process';
import waitOn from 'wait-on';
import { base } from 'viem/chains';

import SecuredLineABI from '../src/contracts/abis/SecuredLine.json';

import { ALCHEMY_BASE_API_KEY, FORK_BLOCK, LINE_ADDRESS, OLD_BORROWER, PORT, RPC, TEST_ADDRESS } from './constants';

export default async function () {
  let anvil: ChildProcess;

  if (!ALCHEMY_BASE_API_KEY) {
    throw new Error('Please set the ALCHEMY_BASE_API_KEY environment variable');
  }

  console.log('Starting Anvil at forked block...');

  anvil = spawn(
    'anvil',
    [
      '--fork-url',
      `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_BASE_API_KEY}`,
      '--fork-block-number',
      String(FORK_BLOCK),
      '--port',
      String(PORT),
      '--silent',
    ],
    { stdio: 'inherit' },
  )

  await waitOn({ resources: [`tcp:127.0.0.1:${PORT}`] })

  console.log('Anvil started!');

  console.log('Updating line borrower to be the test wallet...');

  const publicC = createPublicClient({ chain: base, transport: http(RPC) })

  await publicC.request({
    // @ts-ignore
    method: 'anvil_impersonateAccount',
    params: [OLD_BORROWER],
  });

  const oldBorrowerWallet = createWalletClient({
    transport: http(RPC),
    chain: base,
    account: OLD_BORROWER as Address,
  });

  const securedLine = getContract({
    address: LINE_ADDRESS as Address,
    abi: SecuredLineABI,
    client: oldBorrowerWallet,
  });

  const txnHash = await securedLine.write.updateBorrower(
    [TEST_ADDRESS]
  )

  await publicC.waitForTransactionReceipt({ hash: txnHash })

  const borrower = await securedLine.read.borrower()
  if (borrower !== TEST_ADDRESS) {
    throw new Error(`Borrower was not updated correctly. Expected ${TEST_ADDRESS}, got ${borrower}`);
  }

  await publicC.request({
    // @ts-ignore
    method: 'anvil_mine',
    // @ts-ignore
    params: [],
  });

  console.log('Test line updated with new borrower!');

  return () => {
    console.log('Stopping Anvil...');
    anvil.kill()
    console.log('Anvil stopped!');
  }
}
