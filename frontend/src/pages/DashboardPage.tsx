import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { StatePlaceholder } from '@/components/common/StatePlaceholder'
import { CountBarChart, type CountDatum } from '@/components/dashboard/CountBarChart'
import { RecentMaintenanceList } from '@/components/dashboard/RecentMaintenanceList'
import { StatCard } from '@/components/dashboard/StatCard'
import { StatusBreakdown } from '@/components/dashboard/StatusBreakdown'
import { useDashboardSummaryQuery } from '@/hooks/dashboard'
import { ENVIRONMENT_LABELS } from '@/types/domain'

const OTHER_TAG_KEY = '__other__'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  )
}

/** SC-02 ダッシュボード（FR-DASH-01）。集計から各絞り込み一覧へドリルダウンできる。 */
export function DashboardPage() {
  const navigate = useNavigate()
  const query = useDashboardSummaryQuery()

  const goServers = (qs: string) => void navigate(`/servers${qs}`)

  if (query.isError && query.error.status !== 401) {
    return (
      <>
        <PageHeader title="ダッシュボード" />
        <StatePlaceholder
          type="error"
          title="ダッシュボードの取得に失敗しました"
          description={query.error.message}
          actionButton={
            <Button variant="outlined" onClick={() => void query.refetch()}>
              再読み込み
            </Button>
          }
        />
      </>
    )
  }

  const summary = query.data

  const envData: CountDatum[] = (summary?.serversByEnvironment ?? []).map((row) => ({
    key: row.environment,
    label: ENVIRONMENT_LABELS[row.environment],
    value: row.count,
  }))

  const tagData: CountDatum[] = [
    ...(summary?.topTags ?? []).map((row) => ({
      key: row.tagName,
      label: row.tagName,
      value: row.count,
    })),
    ...(summary && summary.otherTagsCount > 0
      ? [{ key: OTHER_TAG_KEY, label: 'その他', value: summary.otherTagsCount }]
      : []),
  ]

  return (
    <>
      <PageHeader title="ダッシュボード" />

      <Box sx={{ maxWidth: 320, mb: 3 }}>
        {summary ? (
          <StatCard
            label="サーバー総数"
            value={summary.totalServers}
            unit="台"
            onClick={() => goServers('')}
          />
        ) : (
          <Skeleton variant="rounded" height={128} />
        )}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
        }}
      >
        <Section title="環境区分別">
          {summary ? (
            <CountBarChart
              data={envData}
              ariaLabel="環境区分別のサーバー数"
              onBarClick={(key) => goServers(`?env=${key}`)}
            />
          ) : (
            <Skeleton variant="rounded" height={220} />
          )}
        </Section>

        <Section title="ステータス別">
          {summary ? (
            <StatusBreakdown
              data={summary.serversByStatus}
              onSelect={(status) => goServers(`?status=${status}`)}
            />
          ) : (
            <Skeleton variant="rounded" height={180} />
          )}
        </Section>

        <Section title="タグ別（上位 10 + その他）">
          {summary ? (
            tagData.length > 0 ? (
              <CountBarChart
                data={tagData}
                height={Math.max(160, tagData.length * 28)}
                ariaLabel="タグ別のサーバー数"
                onBarClick={(key) => {
                  if (key !== OTHER_TAG_KEY) goServers(`?tags=${encodeURIComponent(key)}`)
                }}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                タグの付いたサーバーはありません
              </Typography>
            )
          ) : (
            <Skeleton variant="rounded" height={220} />
          )}
        </Section>

        <Section title="直近のメンテナンス">
          {summary ? (
            <RecentMaintenanceList
              items={summary.recentMaintenanceHistories}
              onRowClick={(serverId) => void navigate(`/servers/${serverId}`)}
            />
          ) : (
            <Skeleton variant="rounded" height={220} />
          )}
        </Section>
      </Box>
    </>
  )
}
