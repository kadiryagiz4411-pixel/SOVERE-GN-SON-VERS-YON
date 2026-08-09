import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Check, Share, Plus, Monitor, Laptop } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useInstallPrompt } from "@/components/InstallPromptFAB";

const Install = () => {
  const { install, isInstalled, canInstallNatively, isIOS, platform } = useInstallPrompt();
  const navigate = useNavigate();
  const defaultTab = /Android|iPhone|iPad|iPod/.test(navigator.userAgent) ? "mobile" : "desktop";

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Already Installed!</CardTitle>
            <CardDescription>Sovereign is already installed on your device.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/dashboard")} className="w-full">Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
            <Download className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Download Sovereign</CardTitle>
          <CardDescription>
            Install Sovereign on any device — mobile, Windows, or Mac.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Native install button — works on Android, Windows, Mac (Chrome/Edge) */}
          {canInstallNatively && (
            <Button onClick={install} className="w-full" size="lg">
              <Download className="w-5 h-5 mr-2" /> Install Now
            </Button>
          )}

          <Tabs defaultValue={defaultTab}>
            <TabsList className="w-full">
              <TabsTrigger value="mobile" className="flex-1 gap-1.5">
                <Smartphone className="w-4 h-4" /> Mobile
              </TabsTrigger>
              <TabsTrigger value="desktop" className="flex-1 gap-1.5">
                <Monitor className="w-4 h-4" /> Desktop
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mobile" className="space-y-4 mt-4">
              {isIOS ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">To install on iOS:</p>
                  <ol className="space-y-3 text-sm">
                    {[
                      { icon: <Share className="w-4 h-4 inline" />, text: 'Tap the Share button' },
                      { icon: <Plus className="w-4 h-4 inline" />, text: 'Tap "Add to Home Screen"' },
                      { icon: null, text: 'Tap "Add" to confirm' },
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-medium text-primary">{i + 1}</span>
                        </div>
                        <span className="flex items-center gap-2">{step.text} {step.icon}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : canInstallNatively ? (
                <p className="text-center text-sm text-muted-foreground">
                  Use the "Install Now" button above to add Sovereign to your home screen.
                </p>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  <p>Open this page in Chrome or Edge on your phone.</p>
                  <p className="mt-2">Look for "Install app" or "Add to Home Screen" in the browser menu.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="desktop" className="space-y-4 mt-4">
              {canInstallNatively ? (
                <p className="text-center text-sm text-muted-foreground">
                  Use the "Install Now" button above to install Sovereign on your desktop.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Monitor className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Windows</p>
                        <p className="text-xs text-muted-foreground">Chrome or Edge</p>
                      </div>
                    </div>
                    <ol className="text-sm space-y-1.5 text-muted-foreground pl-11">
                      <li>1. Open this site in Chrome or Edge</li>
                      <li>2. Click the install icon (⊕) in the address bar</li>
                      <li>3. Click "Install" to add to your desktop</li>
                    </ol>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Laptop className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">macOS</p>
                        <p className="text-xs text-muted-foreground">Chrome or Edge</p>
                      </div>
                    </div>
                    <ol className="text-sm space-y-1.5 text-muted-foreground pl-11">
                      <li>1. Open this site in Chrome or Edge</li>
                      <li>2. Click ⋮ menu → "Install Sovereign..."</li>
                      <li>3. The app will appear in your Applications</li>
                    </ol>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2 text-sm">Why install?</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Launch instantly from desktop or home screen",
                "Works offline — generate proposals anywhere",
                "Faster loading, no browser tabs needed",
                "Full-screen, distraction-free experience",
              ].map((benefit, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <Button variant="outline" onClick={() => navigate("/")} className="w-full">
            Maybe Later
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
