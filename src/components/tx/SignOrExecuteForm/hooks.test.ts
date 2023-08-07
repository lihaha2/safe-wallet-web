import { renderHook } from '@/tests/test-utils'
import { ethers } from 'ethers'
import { Web3Provider } from '@ethersproject/providers'
import type { SafeSignature, SafeTransaction } from '@safe-global/safe-core-sdk-types'
import type { SafeInfo } from '@safe-global/safe-gateway-typescript-sdk'
import { type ConnectedWallet } from '@/services/onboard'
import * as useSafeInfoHook from '@/hooks/useSafeInfo'
import * as wallet from '@/hooks/wallets/useWallet'
import * as walletHooks from '@/utils/wallets'
import * as pending from '@/hooks/usePendingTxs'
import * as txSender from '@/services/tx/tx-sender/dispatch'
import * as onboardHooks from '@/hooks/wallets/useOnboard'
import { type OnboardAPI } from '@web3-onboard/core'
import { useAlreadySigned, useImmediatelyExecutable, useIsExecutionLoop, useTxActions, useValidateNonce } from './hooks'

const createSafeTx = (data = '0x'): SafeTransaction => {
  return {
    data: {
      to: '0x0000000000000000000000000000000000000000',
      value: '0x0',
      data,
      operation: 0,
      nonce: 100,
    },
    signatures: new Map([]),
    addSignature: function (sig: SafeSignature): void {
      this.signatures.set(sig.signer, sig)
    },
    encodedSignatures: function (): string {
      return Array.from(this.signatures)
        .map(([, sig]) => {
          return [sig.signer, sig.data].join(' = ')
        })
        .join('; ')
    },
  } as SafeTransaction
}

describe('SignOrExecute hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Onboard
    jest.spyOn(onboardHooks, 'default').mockReturnValue({
      setChain: jest.fn(),
      state: {
        get: () => ({
          wallets: [
            {
              label: 'MetaMask',
              accounts: [{ address: '0x1234567890000000000000000000000000000000' }],
              connected: true,
              chains: [{ id: '1' }],
            },
          ],
        }),
      },
    } as unknown as OnboardAPI)

    // Wallet
    jest.spyOn(wallet, 'default').mockReturnValue({
      chainId: '1',
      label: 'MetaMask',
      address: '0x1234567890000000000000000000000000000000',
    } as unknown as ConnectedWallet)
  })

  const mockProvider = new Web3Provider(jest.fn())

  describe('useValidateNonce', () => {
    it('should return true if nonce is correct', () => {
      jest.spyOn(useSafeInfoHook, 'default').mockImplementation(() => ({
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          nonce: 100,
          threshold: 2,
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }, { value: ethers.utils.hexZeroPad('0x456', 20) }],
          chainId: '1',
        } as SafeInfo,
        safeAddress: ethers.utils.hexZeroPad('0x000', 20),
        safeError: undefined,
        safeLoading: false,
        safeLoaded: true,
      }))

      const { result } = renderHook(() => useValidateNonce(createSafeTx()))

      expect(result.current).toBe(true)
    })

    it('should return false if nonce is incorrect', () => {
      jest.spyOn(useSafeInfoHook, 'default').mockImplementation(() => ({
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          nonce: 90,
          threshold: 2,
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }, { value: ethers.utils.hexZeroPad('0x456', 20) }],
          chainId: '1',
        } as SafeInfo,
        safeAddress: ethers.utils.hexZeroPad('0x000', 20),
        safeError: undefined,
        safeLoading: false,
        safeLoaded: true,
      }))

      const { result } = renderHook(() => useValidateNonce(createSafeTx()))

      expect(result.current).toBe(false)
    })
  })

  describe('useIsExecutionLoop', () => {
    it('should return true when a safe is executing its own transaction', () => {
      const address = ethers.utils.hexZeroPad('0x789', 20)

      jest.spyOn(useSafeInfoHook, 'default').mockReturnValue({
        safeAddress: address,
        safe: {
          version: '1.3.0',
          address: { value: address },
          owners: [{ value: address }],
          nonce: 100,
          chainId: '1',
        } as SafeInfo,
        safeLoaded: true,
        safeLoading: false,
        safeError: undefined,
      })

      jest.spyOn(wallet, 'default').mockReturnValue({
        chainId: '1',
        label: 'MetaMask',
        address: address,
      } as ConnectedWallet)

      const { result } = renderHook(() => useIsExecutionLoop())

      expect(result.current).toBe(true)
    })

    it('should return false when a safe is not executing its own transaction', () => {
      jest.spyOn(wallet, 'default').mockReturnValue({
        chainId: '1',
        label: 'MetaMask',
        address: ethers.utils.hexZeroPad('0x456', 20),
      } as ConnectedWallet)

      const { result } = renderHook(() => useIsExecutionLoop())

      expect(result.current).toBe(false)
    })
  })

  describe('useImmediatelyExecutable', () => {
    it('should return true for newly created transactions with threshold 1 and no pending transactions', () => {
      jest.spyOn(useSafeInfoHook, 'default').mockReturnValue({
        safeAddress: ethers.utils.hexZeroPad('0x000', 20),
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }],
          threshold: 1,
          nonce: 100,
        } as SafeInfo,
        safeLoaded: true,
        safeLoading: false,
        safeError: undefined,
      })

      jest.spyOn(pending, 'useHasPendingTxs').mockReturnValue(false)

      const { result } = renderHook(() => useImmediatelyExecutable())

      expect(result.current).toBe(true)
    })

    it('should return false for newly created transactions with threshold > 1', () => {
      jest.spyOn(useSafeInfoHook, 'default').mockReturnValue({
        safeAddress: ethers.utils.hexZeroPad('0x000', 20),
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }],
          threshold: 2,
          nonce: 100,
          chainId: '1',
        } as SafeInfo,
        safeLoaded: true,
        safeLoading: false,
        safeError: undefined,
      })

      jest.spyOn(pending, 'useHasPendingTxs').mockReturnValue(false)

      const { result } = renderHook(() => useImmediatelyExecutable())

      expect(result.current).toBe(false)
    })

    it('should return false for safes with pending transactions', () => {
      jest.spyOn(useSafeInfoHook, 'default').mockReturnValue({
        safeAddress: ethers.utils.hexZeroPad('0x000', 20),
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }],
          threshold: 1,
          nonce: 100,
          chainId: '1',
        } as SafeInfo,
        safeLoaded: true,
        safeLoading: false,
        safeError: undefined,
      })

      jest.spyOn(pending, 'useHasPendingTxs').mockReturnValue(true)

      const { result } = renderHook(() => useImmediatelyExecutable())

      expect(result.current).toBe(false)
    })
  })

  describe('useTxActions', () => {
    it('should return sign and execute actions', () => {
      jest.spyOn(useSafeInfoHook, 'default').mockImplementation(() => ({
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          nonce: 100,
          threshold: 2,
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }, { value: ethers.utils.hexZeroPad('0x456', 20) }],
          chainId: '1',
        } as SafeInfo,
        safeAddress: '0x123',
        safeError: undefined,
        safeLoading: false,
        safeLoaded: true,
      }))

      const { result } = renderHook(() => useTxActions())

      expect(result.current.signTx).toBeDefined()
      expect(result.current.executeTx).toBeDefined()
    })

    it('should sign a tx with or without an id', async () => {
      jest.spyOn(walletHooks, 'isSmartContractWallet').mockReturnValue(Promise.resolve(false))

      jest.spyOn(useSafeInfoHook, 'default').mockImplementation(() => ({
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          nonce: 100,
          threshold: 2,
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }, { value: ethers.utils.hexZeroPad('0x456', 20) }],
          chainId: '1',
        } as SafeInfo,
        safeAddress: '0x123',
        safeError: undefined,
        safeLoading: false,
        safeLoaded: true,
      }))

      jest
        .spyOn(txSender, 'dispatchTxProposal')
        .mockImplementation((() => Promise.resolve({ txId: '123' })) as unknown as typeof txSender.dispatchTxProposal)

      const signSpy = jest
        .spyOn(txSender, 'dispatchTxSigning')
        .mockImplementation(() => Promise.resolve(createSafeTx()))

      const onchainSignSpy = jest.spyOn(txSender, 'dispatchOnChainSigning').mockImplementation(() => Promise.resolve())

      const { result } = renderHook(() => useTxActions())
      const { signTx } = result.current

      const id = await signTx(createSafeTx())
      expect(signSpy).toHaveBeenCalled()
      expect(onchainSignSpy).not.toHaveBeenCalled()
      expect(id).toBe('123')

      const id2 = await signTx(createSafeTx(), '456')
      expect(signSpy).toHaveBeenCalled()
      expect(id2).toBe('123')
    })

    it('should sign a tx on-chain', async () => {
      jest.spyOn(walletHooks, 'isSmartContractWallet').mockReturnValue(Promise.resolve(true))

      jest.spyOn(useSafeInfoHook, 'default').mockImplementation(() => ({
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          nonce: 100,
          threshold: 2,
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }, { value: ethers.utils.hexZeroPad('0x456', 20) }],
          chainId: '1',
        } as SafeInfo,
        safeAddress: '0x123',
        safeError: undefined,
        safeLoading: false,
        safeLoaded: true,
      }))

      jest
        .spyOn(txSender, 'dispatchTxProposal')
        .mockImplementation((() => Promise.resolve({ txId: '123' })) as unknown as typeof txSender.dispatchTxProposal)
      const signSpy = jest.spyOn(txSender, 'dispatchOnChainSigning').mockImplementation(() => Promise.resolve())

      const { result } = renderHook(() => useTxActions())
      const { signTx } = result.current

      const id = await signTx(createSafeTx(), '456')
      expect(signSpy).toHaveBeenCalled()
      expect(id).toBe('456')
    })

    it('should execute a tx without a txId (immediate execution)', async () => {
      jest.spyOn(useSafeInfoHook, 'default').mockImplementation(() => ({
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          nonce: 100,
          threshold: 2,
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }, { value: ethers.utils.hexZeroPad('0x456', 20) }],
          chainId: '1',
        } as SafeInfo,
        safeAddress: '0x123',
        safeError: undefined,
        safeLoading: false,
        safeLoaded: true,
      }))

      const proposeSpy = jest
        .spyOn(txSender, 'dispatchTxProposal')
        .mockImplementation((() => Promise.resolve({ txId: '123' })) as unknown as typeof txSender.dispatchTxProposal)
      const executeSpy = jest
        .spyOn(txSender, 'dispatchTxExecution')
        .mockImplementation((() => Promise.resolve(createSafeTx())) as unknown as typeof txSender.dispatchTxExecution)

      const { result } = renderHook(() => useTxActions())
      const { executeTx } = result.current

      const id = await executeTx({ gasPrice: 1 }, mockProvider, createSafeTx())
      expect(proposeSpy).toHaveBeenCalled()
      expect(executeSpy).toHaveBeenCalled()
      expect(id).toEqual('123')
    })

    it('should execute a tx with an id (existing tx)', async () => {
      jest.spyOn(useSafeInfoHook, 'default').mockImplementation(() => ({
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          nonce: 100,
          threshold: 2,
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }, { value: ethers.utils.hexZeroPad('0x456', 20) }],
          chainId: '1',
        } as SafeInfo,
        safeAddress: '0x123',
        safeError: undefined,
        safeLoading: false,
        safeLoaded: true,
      }))

      const proposeSpy = jest
        .spyOn(txSender, 'dispatchTxProposal')
        .mockImplementation((() => Promise.resolve({ txId: '123' })) as unknown as typeof txSender.dispatchTxProposal)
      const executeSpy = jest
        .spyOn(txSender, 'dispatchTxExecution')
        .mockImplementation((() => Promise.resolve(createSafeTx())) as unknown as typeof txSender.dispatchTxExecution)

      const { result } = renderHook(() => useTxActions())
      const { executeTx } = result.current

      const id = await executeTx({ gasPrice: 1 }, mockProvider, createSafeTx(), '455')
      expect(proposeSpy).not.toHaveBeenCalled()
      expect(executeSpy).toHaveBeenCalled()
      expect(id).toEqual('455')
    })

    it('should throw an error if the tx is undefined', async () => {
      jest.spyOn(useSafeInfoHook, 'default').mockImplementation(() => ({
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          nonce: 100,
          threshold: 2,
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }, { value: ethers.utils.hexZeroPad('0x456', 20) }],
          chainId: '1',
        } as SafeInfo,
        safeAddress: '0x123',
        safeError: undefined,
        safeLoading: false,
        safeLoaded: true,
      }))

      const { result } = renderHook(() => useTxActions())
      const { signTx, executeTx } = result.current

      // Expect signTx to throw an error
      await expect(signTx()).rejects.toThrowError('Transaction not provided')
      await expect(executeTx({ gasPrice: 1 }, mockProvider)).rejects.toThrowError('Transaction not provided')
    })

    it('should relay a tx execution', async () => {
      jest.spyOn(useSafeInfoHook, 'default').mockImplementation(() => ({
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          nonce: 100,
          threshold: 1,
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }, { value: ethers.utils.hexZeroPad('0x456', 20) }],
          chainId: '1',
        } as SafeInfo,
        safeAddress: '0x123',
        safeError: undefined,
        safeLoading: false,
        safeLoaded: true,
      }))

      const proposeSpy = jest
        .spyOn(txSender, 'dispatchTxProposal')
        .mockImplementation((() => Promise.resolve({ txId: '123' })) as unknown as typeof txSender.dispatchTxProposal)
      const relaySpy = jest.spyOn(txSender, 'dispatchTxRelay').mockImplementation(() => Promise.resolve(undefined))

      const { result } = renderHook(() => useTxActions())
      const { executeTx } = result.current

      const tx = createSafeTx()
      tx.addSignature({
        signer: '0x123',
        data: '0x0001',
        staticPart: () => '',
        dynamicPart: () => '',
      })

      const id = await executeTx({ gasPrice: 1 }, mockProvider, tx, '123', 'origin.com', true)
      expect(proposeSpy).not.toHaveBeenCalled()
      expect(relaySpy).toHaveBeenCalled()
      expect(id).toEqual('123')
    })

    it('should sign a not fully signed tx when relaying', async () => {
      jest.spyOn(walletHooks, 'isSmartContractWallet').mockReturnValue(Promise.resolve(false))

      jest.spyOn(useSafeInfoHook, 'default').mockImplementation(() => ({
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          nonce: 100,
          threshold: 2,
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }, { value: ethers.utils.hexZeroPad('0x456', 20) }],
          chainId: '1',
        } as SafeInfo,
        safeAddress: '0x123',
        safeError: undefined,
        safeLoading: false,
        safeLoaded: true,
      }))

      const tx = createSafeTx()
      tx.addSignature({
        signer: '0x123',
        data: '0x0001',
        staticPart: () => '',
        dynamicPart: () => '',
      })

      const proposeSpy = jest
        .spyOn(txSender, 'dispatchTxProposal')
        .mockImplementation((() => Promise.resolve({ txId: '123' })) as unknown as typeof txSender.dispatchTxProposal)
      const signSpy = jest.spyOn(txSender, 'dispatchTxSigning').mockImplementation(() => {
        tx.addSignature({
          signer: '0x12345',
          data: '0x0001',
          staticPart: () => '',
          dynamicPart: () => '',
        })
        return Promise.resolve(tx)
      })
      const relaySpy = jest.spyOn(txSender, 'dispatchTxRelay').mockImplementation(() => Promise.resolve(undefined))

      const { result } = renderHook(() => useTxActions())
      const { executeTx } = result.current

      const id = await executeTx({ gasPrice: 1 }, mockProvider, tx, '123', 'origin.com', true)
      expect(proposeSpy).toHaveBeenCalled()
      expect(signSpy).toHaveBeenCalled()
      expect(relaySpy).toHaveBeenCalled()
      expect(id).toEqual('123')
    })

    it('should throw when relaying an unsigned tx as a smart contract wallet', async () => {
      jest.spyOn(walletHooks, 'isSmartContractWallet').mockReturnValue(Promise.resolve(true))

      jest.spyOn(useSafeInfoHook, 'default').mockImplementation(() => ({
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          nonce: 100,
          threshold: 2,
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }, { value: ethers.utils.hexZeroPad('0x456', 20) }],
          chainId: '1',
        } as SafeInfo,
        safeAddress: '0x123',
        safeError: undefined,
        safeLoading: false,
        safeLoaded: true,
      }))

      const tx = createSafeTx()
      tx.addSignature({
        signer: '0x123',
        data: '0x0001',
        staticPart: () => '',
        dynamicPart: () => '',
      })

      const proposeSpy = jest
        .spyOn(txSender, 'dispatchTxProposal')
        .mockImplementation((() => Promise.resolve({ txId: '123' })) as unknown as typeof txSender.dispatchTxProposal)
      const signSpy = jest.spyOn(txSender, 'dispatchTxSigning').mockImplementation(() => {
        tx.addSignature({
          signer: '0x12345',
          data: '0x0001',
          staticPart: () => '',
          dynamicPart: () => '',
        })
        return Promise.resolve(tx)
      })
      const relaySpy = jest.spyOn(txSender, 'dispatchTxRelay').mockImplementation(() => Promise.resolve(undefined))

      const { result } = renderHook(() => useTxActions())
      const { executeTx } = result.current

      await expect(() => executeTx({ gasPrice: 1 }, mockProvider, tx, '123', 'origin.com', true)).rejects.toThrowError(
        'Cannot relay an unsigned transaction from a smart contract wallet',
      )
      expect(proposeSpy).not.toHaveBeenCalled()
      expect(signSpy).not.toHaveBeenCalled()
      expect(relaySpy).not.toHaveBeenCalled()
    })
  })

  describe('useAlreadySigned', () => {
    it('should return true if wallet already signed a tx', () => {
      // Wallet
      jest.spyOn(wallet, 'default').mockReturnValue({
        chainId: '1',
        label: 'MetaMask',
        address: '0x1234567890000000000000000000000000000000',
      } as unknown as ConnectedWallet)

      const tx = createSafeTx()
      tx.addSignature({
        signer: '0x1234567890000000000000000000000000000000',
        data: '0x0001',
        staticPart: () => '',
        dynamicPart: () => '',
      })
      const { result } = renderHook(() => useAlreadySigned(tx))
      expect(result.current).toEqual(true)
    })
  })
  it('should return false if wallet has not signed a tx yet', () => {
    // Wallet
    jest.spyOn(wallet, 'default').mockReturnValue({
      chainId: '1',
      label: 'MetaMask',
      address: '0x1234567890000000000000000000000000000000',
    } as unknown as ConnectedWallet)

    const tx = createSafeTx()
    tx.addSignature({
      signer: '0x00000000000000000000000000000000000000000',
      data: '0x0001',
      staticPart: () => '',
      dynamicPart: () => '',
    })
    const { result } = renderHook(() => useAlreadySigned(tx))
    expect(result.current).toEqual(false)
  })
})
