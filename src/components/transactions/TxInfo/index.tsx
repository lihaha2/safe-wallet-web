import { type ReactElement } from 'react'
import type {
  Transfer,
  Custom,
  Creation,
  TransactionInfo,
  MultiSend,
  SettingsChange,
  SwapOrder,
} from '@safe-global/safe-gateway-typescript-sdk'
import { SettingsInfoType } from '@safe-global/safe-gateway-typescript-sdk'
import TokenAmount from '@/components/common/TokenAmount'
import {
  isCreationTxInfo,
  isCustomTxInfo,
  isERC20Transfer,
  isERC721Transfer,
  isMultiSendTxInfo,
  isNativeTokenTransfer,
  isSettingsChangeTxInfo,
  isSwapTxInfo,
  isTransferTxInfo,
} from '@/utils/transaction-guards'
import { ellipsis, shortenAddress } from '@/utils/formatters'
import { useCurrentChain } from '@/hooks/useChains'
import TokenIcon from '@/components/common/TokenIcon'
import { Box, Typography } from '@mui/material'

export const TransferTx = ({
  info,
  omitSign = false,
  withLogo = true,
  preciseAmount = false,
}: {
  info: Transfer
  omitSign?: boolean
  withLogo?: boolean
  preciseAmount?: boolean
}): ReactElement => {
  const chainConfig = useCurrentChain()
  const { nativeCurrency } = chainConfig || {}
  const transfer = info.transferInfo
  const direction = omitSign ? undefined : info.direction

  if (isNativeTokenTransfer(transfer)) {
    return (
      <TokenAmount
        direction={direction}
        value={transfer.value}
        decimals={nativeCurrency?.decimals}
        tokenSymbol={nativeCurrency?.symbol}
        logoUri={withLogo ? nativeCurrency?.logoUri : undefined}
        preciseAmount={preciseAmount}
      />
    )
  }

  if (isERC20Transfer(transfer)) {
    return (
      <TokenAmount
        {...transfer}
        direction={direction}
        logoUri={withLogo ? transfer?.logoUri : undefined}
        preciseAmount={preciseAmount}
      />
    )
  }

  if (isERC721Transfer(transfer)) {
    return (
      <TokenAmount
        {...transfer}
        tokenSymbol={ellipsis(
          `${transfer.tokenSymbol ? transfer.tokenSymbol : 'Unknown NFT'} #${transfer.tokenId}`,
          withLogo ? 16 : 100,
        )}
        value="1"
        direction={undefined}
        logoUri={withLogo ? transfer?.logoUri : undefined}
        fallbackSrc="/images/common/nft-placeholder.png"
      />
    )
  }

  return <></>
}

const CustomTx = ({ info }: { info: Custom }): ReactElement => {
  return <>{info.methodName}</>
}

const CreationTx = ({ info }: { info: Creation }): ReactElement => {
  return <>Safe Account created by {shortenAddress(info.creator.value)}</>
}

const MultiSendTx = ({ info }: { info: MultiSend }): ReactElement => {
  return (
    <>
      {info.actionCount} {`action${info.actionCount > 1 ? 's' : ''}`}
    </>
  )
}

const SwapTx = ({ info }: { info: SwapOrder }): ReactElement => {
  return (
    <Box display="flex">
      <Typography display="flex" alignItems="center" fontWeight="bold">
        <Box style={{ paddingRight: 5, display: 'inline-block' }}>
          <TokenIcon logoUri={info.sellToken.logoUri || undefined} tokenSymbol={info.sellToken.symbol} />
        </Box>
        <Typography sx={{ maxWidth: '60px' }} noWrap>
          {info.sellToken.symbol}&nbsp;
        </Typography>
        to
        <Box style={{ paddingLeft: 5, paddingRight: 5, display: 'inline-block' }}>
          <TokenIcon logoUri={info.buyToken.logoUri || undefined} tokenSymbol={info.buyToken.symbol} />
        </Box>{' '}
        <Typography sx={{ maxWidth: '60px' }} noWrap>
          {info.buyToken.symbol}
        </Typography>
      </Typography>
    </Box>
  )
}
const SettingsChangeTx = ({ info }: { info: SettingsChange }): ReactElement => {
  if (
    info.settingsInfo?.type === SettingsInfoType.ENABLE_MODULE ||
    info.settingsInfo?.type === SettingsInfoType.DISABLE_MODULE
  ) {
    return <>{info.settingsInfo.module.name}</>
  }

  return <></>
}

const TxInfo = ({ info, ...rest }: { info: TransactionInfo; omitSign?: boolean; withLogo?: boolean }): ReactElement => {
  if (isSettingsChangeTxInfo(info)) {
    return <SettingsChangeTx info={info} />
  }

  if (isMultiSendTxInfo(info)) {
    return <MultiSendTx info={info} />
  }

  if (isTransferTxInfo(info)) {
    return <TransferTx info={info} {...rest} />
  }

  if (isCustomTxInfo(info)) {
    return <CustomTx info={info} />
  }

  if (isCreationTxInfo(info)) {
    return <CreationTx info={info} />
  }

  if (isSwapTxInfo(info)) {
    return <SwapTx info={info} />
  }

  return <></>
}

export default TxInfo
