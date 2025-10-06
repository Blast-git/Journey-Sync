import React from "react";
import { isNative, getSafeAreaInsets } from "../../utils/capacitor";

interface MobileLayoutProps {
  children: React.ReactNode;
  className?: string;
  showSafeArea?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  className = "",
  showSafeArea = true,
}) => {
  const safeAreaInsets = getSafeAreaInsets();

  return (
    <div
      className={`
        min-h-screen w-full bg-background flex flex-col
        ${showSafeArea && isNative() ? "mobile-safe-area" : ""}
        ${className}
      `}
      style={{
        paddingTop: showSafeArea && isNative() ? safeAreaInsets.top : "0px",
        paddingBottom: showSafeArea && isNative() ? safeAreaInsets.bottom : "0px",
        paddingLeft: showSafeArea && isNative() ? safeAreaInsets.left : "0px",
        paddingRight: showSafeArea && isNative() ? safeAreaInsets.right : "0px",
      }}
    >
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
};

export default MobileLayout;