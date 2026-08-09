import { useState, useEffect } from "react";
import { Download, X, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Global prompt capture — must be set before component mounts
let _deferredPrompt: BeforeInstallPromptEvent | null = null;
let _promptListenerAdded = false;

if (!_promptListenerAdded && typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    _deferredPrompt = e as BeforeInstallPromptEvent;
  });
  _promptListenerAdded = true;
}

export const useInstallPrompt = () => {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(_deferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    // Listen for new prompt
    const handler = (e: Event) => {
      e.preventDefault();
      _deferredPrompt = e as BeforeInstallPromptEvent;
      setPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    // Check if already captured
    if (_deferredPrompt) setPrompt(_deferredPrompt);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!prompt) return false;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      _deferredPrompt = null;
      setPrompt(null);
      return true;
    }
    return false;
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isMac = /Macintosh/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isWindows = /Windows/.test(navigator.userAgent);

  const platform = isIOS ? "ios" : isAndroid ? "android" : isWindows ? "windows" : isMac ? "mac" : "desktop";

  return { prompt, install, isInstalled, isIOS, platform, canInstallNatively: !!prompt };
};

export const InstallPromptFAB = () => {
  const { install, isInstalled, canInstallNatively, isIOS } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem("install_fab_dismissed")) {
      setDismissed(true);
    }
  }, []);

  if (isInstalled || dismissed) return null;

  const handleClick = async () => {
    if (canInstallNatively) {
      await install();
    } else {
      navigate("/install");
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    sessionStorage.setItem("install_fab_dismissed", "1");
    setDismissed(true);
  };

  const isMobile = /Android|iPhone|iPad|iPod/.test(navigator.userAgent);

  return (
    <div className="fixed bottom-40 right-4 lg:bottom-6 lg:right-24 z-40 animate-fade-in">
      <div className="relative group">
        <Button
          onClick={handleClick}
          size="lg"
          className={cn(
            "rounded-full shadow-lg gap-2 pr-5",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "shadow-[0_4px_20px_hsl(43_96%_56%/0.3)]",
            "transition-all duration-200 hover:scale-105 active:scale-95"
          )}
        >
          {isMobile ? (
            <Smartphone className="w-4 h-4" />
          ) : (
            <Monitor className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">
            {canInstallNatively ? "Install App" : isIOS ? "Add to Home Screen" : "Install App"}
          </span>
        </Button>

        <button
          onClick={handleDismiss}
          className={cn(
            "absolute -top-2 -right-2 w-6 h-6 rounded-full",
            "bg-muted border border-border flex items-center justify-center",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "hover:bg-destructive hover:text-destructive-foreground"
          )}
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
