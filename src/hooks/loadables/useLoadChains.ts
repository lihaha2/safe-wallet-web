//@ts-nocheck
import { useEffect } from 'react'
import { RPC_AUTHENTICATION, getChainsConfig, type ChainInfo } from '@safe-global/safe-gateway-typescript-sdk'
import useAsync, { type AsyncResult } from '../useAsync'
import { logError, Errors } from '@/services/exceptions'

const getConfigs = async (): Promise<ChainInfo[]> => {
  const data = await getChainsConfig()
  return data.results || []
}

const mantle: ChainInfo = {
  chainId: '33033',
  chainName: 'Entangle Mainnet',
  shortName: 'NGL',
  description: 'Entangle mainnet',
  chainLogoUri: 'https://test-safe.entangle.fi/cfg/media/chains/33133/chain_logo.webp',
  l2: false,
  isTestnet: false,
  rpcUri: {
    authentication: RPC_AUTHENTICATION.NO_AUTHENTICATION,
    value: 'https://json-rpc.entangle.fi',
  },
  safeAppsRpcUri: {
    authentication: RPC_AUTHENTICATION.NO_AUTHENTICATION,
    value: 'https://json-rpc.entangle.fi',
  },
  publicRpcUri: {
    authentication: RPC_AUTHENTICATION.NO_AUTHENTICATION,
    value: 'https://json-rpc.entangle.fi',
  },
  blockExplorerUriTemplate: {
    address: 'https://explorer.entangle.fi/address/{{txHash}}',
    txHash: 'https://explorer.entangle.fi/transactions/{{txHash}}',
    api: 'https://explorer.entangle.fi/transactions/{{txHash}}',
  },
  nativeCurrency: {
    name: 'Entangle',
    symbol: 'NGL',
    decimals: 18,
    logoUri: 'https://test-safe.entangle.fi/cfg/media/chains/33133/currency_logo.webp',
  },
  pricesProvider: {
    nativeCoin: null,
    chainName: null,
  },
  balancesProvider: {
    chainName: null,
    enabled: false,
  },
  contractAddresses: {
    safeSingletonAddress: '0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7',
    safeProxyFactoryAddress: '0x7e3afc810732305252D0833F7820e385412851f2',
    multiSendAddress: '0x7587A12AA2B157F03Db07E9332ca250Ce68499aB',
    multiSendCallOnlyAddress: '0x6ADe5071f20824469FDcfD62bC90dA009A04dFf4',
    fallbackHandlerAddress: '0x45b48BaE8e077d50840bb4064DD6F9aA1443b107',
    signMessageLibAddress: '0x452De19fa660c461B1a81c0260C6897016e4f545',
    createCallAddress: '0xb05c6D731D24Af5A5958690C0c8C9b4e2E79025D',
    simulateTxAccessorAddress: '0x0B9e607f9333469f5d1506AF466A4A5BF2f4b70a',
    safeWebAuthnSignerFactoryAddress: null,
  },
  transactionService: 'https://test-safe.entangle.fi/txs',
  vpcTransactionService: 'https://test-safe.entangle.fi/txs/',
  theme: {
    textColor: '#ffffff',
    backgroundColor: '#000000',
  },
  gasPrice: [],
  ensRegistryAddress: null,
  recommendedMasterCopyVersion: '1.4.0',
  disabledWallets: [],
  features: [],
}

export const useLoadChains = (): AsyncResult<ChainInfo[]> => {
  const [data, error, loading] = useAsync<ChainInfo[]>(getConfigs, [])

  // Log errors
  useEffect(() => {
    if (error) {
      logError(Errors._620, error.message)
    }
  }, [error])

  return [[mantle], undefined, false]
}

export default useLoadChains
