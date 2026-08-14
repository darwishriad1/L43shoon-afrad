import { useState, useEffect, useRef, useCallback } from 'react';
import { Soldier } from '../types';

interface UseAndroidBackNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedSoldierIdForProfile: string | null;
  setSelectedSoldierIdForProfile: (id: string | null) => void;
  militaryCardSoldier: Soldier | null;
  setMilitaryCardSoldier: (soldier: Soldier | null) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isMoreBottomSheetOpen: boolean;
  setIsMoreBottomSheetOpen: (open: boolean) => void;
  isRequestsModalOpen: boolean;
  setIsRequestsModalOpen: (open: boolean) => void;
  isLogoutModalOpen: boolean;
  setIsLogoutModalOpen: (open: boolean) => void;
  isUserAccountPopoverOpen: boolean;
  setIsUserAccountPopoverOpen: (open: boolean) => void;
  onLogout: () => void;
}

export function useAndroidBackNavigation({
  activeTab,
  setActiveTab,
  selectedSoldierIdForProfile,
  setSelectedSoldierIdForProfile,
  militaryCardSoldier,
  setMilitaryCardSoldier,
  isCommandPaletteOpen,
  setIsCommandPaletteOpen,
  isMoreBottomSheetOpen,
  setIsMoreBottomSheetOpen,
  isRequestsModalOpen,
  setIsRequestsModalOpen,
  isLogoutModalOpen,
  setIsLogoutModalOpen,
  isUserAccountPopoverOpen,
  setIsUserAccountPopoverOpen,
  onLogout
}: UseAndroidBackNavigationProps) {
  const [showExitToast, setShowExitToast] = useState(false);
  const [isExitConfirmModalOpen, setIsExitConfirmModalOpen] = useState(false);
  
  // Ref to track the last back button press timestamp on root (dashboard)
  const lastBackPressTimeRef = useRef<number>(0);
  const exitToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Tab navigation history stack
  const tabHistoryRef = useRef<string[]>(['dashboard']);
  
  // Flag to avoid pushing history entry when transition was triggered by popstate
  const isPopStateTriggeredRef = useRef(false);

  // Helper to trigger haptic feedback if available
  const triggerHaptic = useCallback((pattern = [35]) => {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  }, []);

  // Update tab history stack when activeTab changes
  useEffect(() => {
    if (isPopStateTriggeredRef.current) {
      return;
    }

    const currentStack = tabHistoryRef.current;
    if (currentStack[currentStack.length - 1] !== activeTab) {
      tabHistoryRef.current.push(activeTab);
      // Limit history stack size to prevent unbounded memory growth
      if (tabHistoryRef.current.length > 50) {
        tabHistoryRef.current.shift();
      }
    }
  }, [activeTab]);

  // Push history state whenever any modal, profile, or non-dashboard tab is active
  useEffect(() => {
    if (isPopStateTriggeredRef.current) {
      isPopStateTriggeredRef.current = false;
      return;
    }

    const isNonRoot = 
      activeTab !== 'dashboard' ||
      selectedSoldierIdForProfile !== null ||
      militaryCardSoldier !== null ||
      isCommandPaletteOpen ||
      isMoreBottomSheetOpen ||
      isRequestsModalOpen ||
      isLogoutModalOpen ||
      isUserAccountPopoverOpen;

    if (isNonRoot) {
      window.history.pushState(
        {
          activeTab,
          soldierId: selectedSoldierIdForProfile,
          milCard: !!militaryCardSoldier,
          palette: isCommandPaletteOpen,
          bottomSheet: isMoreBottomSheetOpen,
          requests: isRequestsModalOpen,
          logoutModal: isLogoutModalOpen,
          userAccount: isUserAccountPopoverOpen,
          ts: Date.now()
        },
        '',
        window.location.href
      );
    }
  }, [
    activeTab,
    selectedSoldierIdForProfile,
    militaryCardSoldier,
    isCommandPaletteOpen,
    isMoreBottomSheetOpen,
    isRequestsModalOpen,
    isLogoutModalOpen,
    isUserAccountPopoverOpen
  ]);

  // Main Popstate (Android Back Button / Browser Back Button / Gesture) Handler
  useEffect(() => {
    // Initial push to anchor root state if history is empty
    if (!window.history.state) {
      window.history.replaceState({ activeTab: 'dashboard', root: true }, '', window.location.href);
    }

    const handlePopState = (event: PopStateEvent) => {
      isPopStateTriggeredRef.current = true;

      // 1. Close overlays in order of topmost priority
      if (militaryCardSoldier) {
        triggerHaptic();
        setMilitaryCardSoldier(null);
        return;
      }

      if (isCommandPaletteOpen) {
        triggerHaptic();
        setIsCommandPaletteOpen(false);
        return;
      }

      if (isUserAccountPopoverOpen) {
        triggerHaptic();
        setIsUserAccountPopoverOpen(false);
        return;
      }

      if (isRequestsModalOpen) {
        triggerHaptic();
        setIsRequestsModalOpen(false);
        return;
      }

      if (isLogoutModalOpen) {
        triggerHaptic();
        setIsLogoutModalOpen(false);
        return;
      }

      if (isMoreBottomSheetOpen) {
        triggerHaptic();
        setIsMoreBottomSheetOpen(false);
        return;
      }

      // 2. Close Soldier Profile Drawer
      if (selectedSoldierIdForProfile) {
        triggerHaptic();
        setSelectedSoldierIdForProfile(null);
        return;
      }

      // 3. Tab navigation back
      if (activeTab !== 'dashboard') {
        triggerHaptic();
        // Pop the current tab
        tabHistoryRef.current.pop();
        // Look up previous tab or fallback to dashboard
        const prevTab = tabHistoryRef.current.length > 0
          ? tabHistoryRef.current[tabHistoryRef.current.length - 1]
          : 'dashboard';

        setActiveTab(prevTab || 'dashboard');
        return;
      }

      // 4. If we are on root (dashboard) with no open modals/drawers:
      // Check for double-tap back within 2.5 seconds to exit
      const now = Date.now();
      const timeDiff = now - lastBackPressTimeRef.current;

      if (timeDiff < 2500 && timeDiff > 0) {
        // Double back pressed! Trigger exit
        triggerHaptic([50, 40, 50]);
        setShowExitToast(false);
        setIsExitConfirmModalOpen(true);
      } else {
        // First back press on dashboard:
        // Re-push history entry so the browser doesn't close immediately
        window.history.pushState({ activeTab: 'dashboard', root: true }, '', window.location.href);
        lastBackPressTimeRef.current = now;
        triggerHaptic([35]);

        setShowExitToast(true);
        if (exitToastTimeoutRef.current) {
          clearTimeout(exitToastTimeoutRef.current);
        }
        exitToastTimeoutRef.current = setTimeout(() => {
          setShowExitToast(false);
          lastBackPressTimeRef.current = 0;
        }, 2500);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (exitToastTimeoutRef.current) {
        clearTimeout(exitToastTimeoutRef.current);
      }
    };
  }, [
    activeTab,
    selectedSoldierIdForProfile,
    militaryCardSoldier,
    isCommandPaletteOpen,
    isMoreBottomSheetOpen,
    isRequestsModalOpen,
    isLogoutModalOpen,
    isUserAccountPopoverOpen,
    setActiveTab,
    setSelectedSoldierIdForProfile,
    setMilitaryCardSoldier,
    setIsCommandPaletteOpen,
    setIsMoreBottomSheetOpen,
    setIsRequestsModalOpen,
    setIsLogoutModalOpen,
    setIsUserAccountPopoverOpen,
    triggerHaptic
  ]);

  // Explicit back navigation handler for on-screen back buttons
  const handleGoBack = useCallback(() => {
    window.history.back();
  }, []);

  return {
    showExitToast,
    isExitConfirmModalOpen,
    setIsExitConfirmModalOpen,
    handleGoBack
  };
}
