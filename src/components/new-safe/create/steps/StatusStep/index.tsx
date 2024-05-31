import { useCounter } from '@/components/common/Notifications/useCounter'
import type { StepRenderProps } from '@/components/new-safe/CardStepper/useCardStepper'
import type { NewSafeFormData } from '@/components/new-safe/create'
import { getRedirect } from '@/components/new-safe/create/logic'
import StatusMessage from '@/components/new-safe/create/steps/StatusStep/StatusMessage'
import useUndeployedSafe from '@/components/new-safe/create/steps/StatusStep/useUndeployedSafe'
import lightPalette from '@/components/theme/lightPalette'
import { AppRoutes } from '@/config/routes'
import { safeCreationPendingStatuses } from '@/features/counterfactual/hooks/usePendingSafeStatuses'
import { SafeCreationEvent, safeCreationSubscribe } from '@/features/counterfactual/services/safeCreationEvents'
import { useCurrentChain } from '@/hooks/useChains'
import Rocket from '@/public/images/common/rocket.svg'
import { Alert, AlertTitle, Box, Button, Paper, Stack, SvgIcon, Typography } from '@mui/material'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import useSyncSafeCreationStep from '../../useSyncSafeCreationStep'

const SPEED_UP_THRESHOLD_IN_SECONDS = 15

export const CreateSafeStatus = ({
  data,
  setProgressColor,
  setStep,
  setStepData,
}: StepRenderProps<NewSafeFormData>) => {
  const [status, setStatus] = useState<SafeCreationEvent>(SafeCreationEvent.PROCESSING)
  const [safeAddress, pendingSafe] = useUndeployedSafe()
  const router = useRouter()
  const chain = useCurrentChain()

  const counter = useCounter(pendingSafe?.status.submittedAt)

  const isError = status === SafeCreationEvent.FAILED

  useSyncSafeCreationStep(setStep)

  useEffect(() => {
    const unsubFns = Object.entries(safeCreationPendingStatuses).map(([event]) =>
      safeCreationSubscribe(event as SafeCreationEvent, async () => {
        setStatus(event as SafeCreationEvent)
      }),
    )

    return () => {
      unsubFns.forEach((unsub) => unsub())
    }
  }, [])

  useEffect(() => {
    if (!chain || !safeAddress) return

    if (status === SafeCreationEvent.SUCCESS) {
      router.push(getRedirect(chain.shortName, safeAddress, router.query?.safeViewRedirectURL))
    }
  }, [chain, router, safeAddress, status])

  useEffect(() => {
    if (!setProgressColor) return

    if (isError) {
      setProgressColor(lightPalette.error.main)
    } else {
      setProgressColor(lightPalette.secondary.main)
    }
  }, [isError, setProgressColor])

  const tryAgain = () => {
    if (!pendingSafe) return // Probably should go to /new-safe/create

    setProgressColor?.(lightPalette.secondary.main)
    setStep(2)
    setStepData?.({
      owners: pendingSafe.props.safeAccountConfig.owners.map((owner) => ({ name: '', address: owner })),
      name: '',
      threshold: pendingSafe.props.safeAccountConfig.threshold,
      saltNonce: Number(pendingSafe.props.safeDeploymentConfig?.saltNonce),
      safeAddress,
    })
  }

  return (
    <Paper
      sx={{
        textAlign: 'center',
      }}
    >
      <Box p={{ xs: 2, sm: 8 }}>
        <StatusMessage status={status} isError={isError} pendingSafe={pendingSafe} />

        {counter && counter > SPEED_UP_THRESHOLD_IN_SECONDS && (
          <Alert severity="warning" icon={<SvgIcon component={Rocket} />} sx={{ mt: 5 }}>
            <AlertTitle>
              <Typography variant="body2" textAlign="left" fontWeight="bold">
                Transaction is taking too long
              </Typography>
            </AlertTitle>
            Try to speed it up with better gas parameters in your wallet.
          </Alert>
        )}

        {isError && (
          <Stack direction="row" justifyContent="center" gap={2}>
            <Link href={AppRoutes.welcome.index} passHref>
              <Button variant="outlined">Go to homepage</Button>
            </Link>
            <Button variant="contained" onClick={tryAgain}>
              Try again
            </Button>
          </Stack>
        )}
      </Box>
    </Paper>
  )
}
