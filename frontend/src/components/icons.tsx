/** Small stroke icon set in the HUD style; inherits size and colour from the parent. */
type IconProps = { className?: string };

function Svg({ className = "h-5 w-5", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="square" strokeLinejoin="miter" className={className} aria-hidden>
      {children}
    </svg>
  );
}

export const IconMap = (p: IconProps) => (
  <Svg {...p}><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" /></Svg>
);
export const IconId = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="14" /><circle cx="9" cy="11" r="2.2" /><path d="M5.5 16.5c.8-1.6 2-2.3 3.5-2.3s2.7.7 3.5 2.3M14 10h4M14 13.5h3" /></Svg>
);
export const IconLog = (p: IconProps) => (
  <Svg {...p}><path d="M5 3h11l3 3v15H5z" /><path d="M8 9h8M8 13h8M8 17h5" /></Svg>
);
export const IconUsers = (p: IconProps) => (
  <Svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3 20c.8-3.4 3-5 6-5s5.2 1.6 6 5" /><path d="M16 5.5a3 3 0 010 5.5M18 15c1.6.6 2.6 2.1 3 5" /></Svg>
);
export const IconDice = (p: IconProps) => (
  <Svg {...p}><path d="M12 2l9 5v10l-9 5-9-5V7z" /><path d="M3 7l9 5 9-5M12 12v10" /></Svg>
);
export const IconPlus = (p: IconProps) => (
  <Svg {...p}><path d="M12 4v16M4 12h16" /></Svg>
);
export const IconSearch = (p: IconProps) => (
  <Svg {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></Svg>
);
export const IconLayers = (p: IconProps) => (
  <Svg {...p}><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></Svg>
);
export const IconBack = (p: IconProps) => (
  <Svg {...p}><path d="M15 4l-8 8 8 8" /></Svg>
);
export const IconClose = (p: IconProps) => (
  <Svg {...p}><path d="M5 5l14 14M19 5L5 19" /></Svg>
);
export const IconEye = (p: IconProps) => (
  <Svg {...p}><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Svg>
);
export const IconEyeOff = (p: IconProps) => (
  <Svg {...p}><path d="M2 12s3.5-6.5 10-6.5c2 0 3.7.6 5.1 1.5M22 12s-3.5 6.5-10 6.5c-2 0-3.7-.6-5.1-1.5" /><path d="M3 21L21 3" /></Svg>
);
export const IconEdit = (p: IconProps) => (
  <Svg {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13 7l4 4" /></Svg>
);
export const IconTrash = (p: IconProps) => (
  <Svg {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></Svg>
);
export const IconMinus = (p: IconProps) => (
  <Svg {...p}><path d="M4 12h16" /></Svg>
);
export const IconExpand = (p: IconProps) => (
  <Svg {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></Svg>
);
export const IconPin = (p: IconProps) => (
  <Svg {...p}><path d="M12 22s-7-6.3-7-12a7 7 0 0114 0c0 5.7-7 12-7 12z" /><circle cx="12" cy="10" r="2.5" /></Svg>
);
export const IconLock = (p: IconProps) => (
  <Svg {...p}><rect x="5" y="10" width="14" height="11" /><path d="M8 10V7a4 4 0 018 0v3" /></Svg>
);
export const IconLogout = (p: IconProps) => (
  <Svg {...p}><path d="M14 4h6v16h-6M10 8l-4 4 4 4M6 12h10" /></Svg>
);
