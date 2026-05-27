/* eslint-disable */
// Icon library — Lucide-flavor inline SVGs.
// Each icon is a tiny React component with width/height/className passed through.

const Ic = ({ children, size = 16, className = 'ic', stroke = 1.8, ...rest }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24"
       fill="none" stroke="currentColor" strokeWidth={stroke}
       strokeLinecap="round" strokeLinejoin="round" {...rest}>{children}</svg>
);

const IconHome     = (p) => <Ic {...p}><path d="M3 12L12 3l9 9"/><path d="M5 10v10h14V10"/></Ic>;
const IconCart     = (p) => <Ic {...p}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></Ic>;
const IconGrid     = (p) => <Ic {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></Ic>;
const IconDatabase = (p) => <Ic {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6"/></Ic>;
const IconUsers    = (p) => <Ic {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Ic>;
const IconFileText = (p) => <Ic {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></Ic>;
const IconInbox    = (p) => <Ic {...p}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></Ic>;
const IconListChk  = (p) => <Ic {...p}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></Ic>;
const IconBar      = (p) => <Ic {...p}><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></Ic>;
const IconUser     = (p) => <Ic {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Ic>;
const IconClipChk  = (p) => <Ic {...p}><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><path d="m9 14 2 2 4-4"/></Ic>;
const IconTruck    = (p) => <Ic {...p}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></Ic>;
const IconStore    = (p) => <Ic {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/></Ic>;
const IconSearch   = (p) => <Ic {...p}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Ic>;
const IconTrash    = (p) => <Ic {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></Ic>;
const IconPencil   = (p) => <Ic {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></Ic>;
const IconPlus     = (p) => <Ic {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Ic>;
const IconLogout   = (p) => <Ic {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Ic>;
const IconChev     = (p) => <Ic {...p}><polyline points="6 9 12 15 18 9"/></Ic>;
const IconClose    = (p) => <Ic {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ic>;
const IconCheck    = (p) => <Ic {...p}><polyline points="20 6 9 17 4 12"/></Ic>;
const IconAlert    = (p) => <Ic {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Ic>;
const IconRise     = (p) => <Ic {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></Ic>;
const IconUserCircle = (p) => <Ic {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></Ic>;
const IconBarcode  = (p) => <Ic {...p}><path d="M3 5v14M6 5v14M9 5v14M12 5v14M15 5v14M18 5v14M21 5v14"/></Ic>;

// Brand mark (not a Lucide icon — local SVG)
const BrandMark = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="13" stroke="#1F8A5B" strokeWidth="2"/>
    <circle cx="16" cy="16" r="4.5" fill="#1F8A5B"/>
    <path d="M16 3.5v3M16 25.5v3M3.5 16h3M25.5 16h3M7.3 7.3l2.1 2.1M22.6 22.6l2.1 2.1M7.3 24.7l2.1-2.1M22.6 9.4l2.1-2.1" stroke="#1F8A5B" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

Object.assign(window, {
  IconHome, IconCart, IconGrid, IconDatabase, IconUsers, IconFileText,
  IconInbox, IconListChk, IconBar, IconUser, IconClipChk, IconTruck,
  IconStore, IconSearch, IconTrash, IconPencil, IconPlus, IconLogout,
  IconChev, IconClose, IconCheck, IconAlert, IconRise, IconUserCircle,
  IconBarcode, BrandMark,
});
