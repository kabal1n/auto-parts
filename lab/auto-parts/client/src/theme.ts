import type { ThemeConfig } from 'antd';

const theme: ThemeConfig = {
  token: {
    // --- Brand ---
    colorPrimary:       '#1F8A5B',
    colorPrimaryHover:  '#176E48',
    colorPrimaryActive: '#0F5535',
    colorPrimaryBg:     '#ECF7F1',
    colorPrimaryBorder: '#B7DDC7',

    // --- Semantic ---
    colorSuccess:       '#16A34A',
    colorSuccessBg:     '#ECFDF5',
    colorSuccessBorder: '#BBF7D0',
    colorError:         '#DC2626',
    colorErrorBg:       '#FEF2F2',
    colorErrorBorder:   '#FECACA',
    colorWarning:       '#D97706',
    colorWarningBg:     '#FFFBEB',
    colorWarningBorder: '#FED7AA',
    colorInfo:          '#1F8A5B',
    colorInfoBg:        '#ECF7F1',
    colorInfoBorder:    '#B7DDC7',

    // --- Text ---
    colorText:           '#0F172A',
    colorTextSecondary:  '#334155',
    colorTextTertiary:   '#64748B',
    colorTextQuaternary: '#94A3B8',

    // --- Backgrounds ---
    colorBgBase:      '#F4F6FA',
    colorBgLayout:    '#F4F6FA',
    colorBgContainer: '#FFFFFF',
    colorBgElevated:  '#FFFFFF',
    colorBgSpotlight: '#0F172A',
    colorBgMask:      'rgba(15, 23, 42, 0.45)',

    // Fill levels (hover rows, inset panels, chips)
    colorFill:           '#F8FAFC',
    colorFillSecondary:  '#EEF1F6',
    colorFillTertiary:   '#EEF1F6',
    colorFillQuaternary: '#F8FAFC',

    // --- Borders ---
    colorBorder:          '#E1E6EF',
    colorBorderSecondary: '#EEF1F6',

    // --- Typography ---
    fontFamily:     "'IBM Plex Sans', 'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif",
    fontFamilyCode: "'JetBrains Mono', 'SF Mono', Consolas, 'Liberation Mono', monospace",
    fontSize:         14,
    fontSizeSM:       12,
    fontSizeLG:       16,
    fontSizeXL:       20,
    fontSizeHeading1: 30,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    fontSizeHeading4: 18,
    fontSizeHeading5: 16,

    // --- Radius ---
    borderRadius:   8,
    borderRadiusSM: 6,
    borderRadiusLG: 10,
    borderRadiusXS: 4,

    // --- Elevation ---
    boxShadow:          '0 2px 8px rgba(15, 23, 42, 0.06)',
    boxShadowSecondary: '0 4px 16px rgba(15, 23, 42, 0.08)',
    boxShadowTertiary:  '0 1px 2px rgba(15, 23, 42, 0.04)',

    // --- Motion ---
    motionDurationFast: '120ms',
    motionDurationMid:  '180ms',
    motionDurationSlow: '240ms',
    motionEaseOut:      'cubic-bezier(0.2, 0.8, 0.2, 1)',
    motionEaseInOut:    'cubic-bezier(0.4, 0.0, 0.2, 1)',

    // --- Controls ---
    controlHeight: 36,
    lineWidth:     1,
  },

  components: {
    Layout: {
      bodyBg:        '#F4F6FA',
      headerBg:      '#FFFFFF',
      siderBg:       '#FFFFFF',
      footerBg:      '#F4F6FA',
      headerHeight:  56,
      headerPadding: '0 24px',
      triggerBg:     '#EEF1F6',
      triggerColor:  '#64748B',
    },

    Menu: {
      itemBg:            '#FFFFFF',
      subMenuItemBg:     '#FFFFFF',
      itemColor:         '#334155',
      itemHoverColor:    '#1F8A5B',
      itemHoverBg:       '#F8FAFC',
      itemSelectedColor: '#1F8A5B',
      itemSelectedBg:    '#ECF7F1',
      itemActiveBg:      '#ECF7F1',
      activeBarBorderWidth: 0,
      itemBorderRadius:  6,
      itemMarginInline:  6,
      itemHeight:        36,
      itemPaddingInline: 12,
      iconSize:          15,
    },

    Table: {
      headerBg:           '#F8FAFC',
      headerColor:        '#64748B',
      headerSortActiveBg: '#EEF1F6',
      borderColor:        '#E1E6EF',
      rowHoverBg:         '#F8FAFC',
      rowSelectedBg:      '#ECF7F1',
      rowSelectedHoverBg: '#ECF7F1',
      cellPaddingBlock:   12,
      cellPaddingInline:  16,
      cellFontSize:       13,
      footerBg:           '#F8FAFC',
      footerColor:        '#64748B',
    },

    Button: {
      defaultBg:                '#FFFFFF',
      defaultColor:             '#334155',
      defaultBorderColor:       '#E1E6EF',
      defaultHoverBg:           '#F8FAFC',
      defaultHoverColor:        '#1F8A5B',
      defaultHoverBorderColor:  '#1F8A5B',
      defaultActiveBg:          '#ECF7F1',
      defaultActiveColor:       '#0F5535',
      defaultActiveBorderColor: '#0F5535',
      fontWeight:    500,
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow:  'none',
    },

    Card: {
      headerBg:      '#FFFFFF',
      headerHeight:  48,
      headerHeightSM: 36,
      bodyPadding:   24,
    },

    Modal: {
      headerBg:   '#FFFFFF',
      contentBg:  '#FFFFFF',
      footerBg:   '#FFFFFF',
    },

    Tag: {
      defaultBg:    '#F1F5F9',
      defaultColor: '#334155',
    },
  },
};

export default theme;
