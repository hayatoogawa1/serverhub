import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Toolbar from '@mui/material/Toolbar'
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import DnsOutlinedIcon from '@mui/icons-material/DnsOutlined'
import { NavLink } from 'react-router-dom'

export const SIDEBAR_WIDTH = 232

const NAV_ITEMS = [
  { to: '/', label: 'ダッシュボード', icon: DashboardOutlinedIcon, end: true },
  { to: '/servers', label: 'サーバー', icon: DnsOutlinedIcon, end: false },
  { to: '/maintenance-histories', label: 'メンテナンス履歴', icon: BuildOutlinedIcon, end: false },
] as const

/** 共通サイドナビ（requirements §13.1「共通: ヘッダー / サイドナビ」、Stitch `AppSidebar`）。 */
export function AppSidebar() {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box' },
      }}
    >
      <Toolbar />
      <List sx={{ px: 1 }}>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <ListItemButton
            key={to}
            component={NavLink}
            to={to}
            end={end}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              '&.active': {
                bgcolor: 'action.selected',
                fontWeight: 600,
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  )
}
