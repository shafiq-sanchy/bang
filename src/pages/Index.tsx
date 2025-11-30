import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TextEditor from "@/components/TextEditor";
import BengaliOutput from "@/components/BengaliOutput";
import { Sparkles, Save, FolderOpen, FileText, Moon, Sun, Copy, Check, KeyRound } from "lucide-react";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

/**
 * Splits input text into words, whitespace and newlines, preserving their order.
 */
function splitByWordKeepFormat(text: string): (string | undefined)[] {
  return text.match(/([^\s\n]+)|(\s+|\n)/g) || [];
}

const Index = () => {
  const [banglishText, setBanglishText] = useState("");
  const [bengaliText, setBengaliText] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [keysOpen, setKeysOpen] = useState(false);
  const [keysInput, setKeysInput] = useState("");

  /**
   * Converts each word of the input Banglish text to Bengali, preserving formatting.
   * This provides "real-time" word-by-word conversion.
   */
  const performConversion = async (textToConvert: string) => {
    if (!textToConvert.trim()) {
      setBengaliText("");
      return;
    }

    setIsConverting(true);
    try {
      // Split input into tokens that preserve formatting
      const tokens = splitByWordKeepFormat(textToConvert);

      // Convert only words; keep spaces/newlines as-is
      const convertedTokens: string[] = [];
      for (const token of tokens) {
        if (token.trim().length === 0) {
          convertedTokens.push(token); // whitespace/newline
        } else {
          // Convert word by invoking the API
          const { data, error } = await supabase.functions.invoke("gemini-chat", {
            body: {
              prompt: `You are an expert Bengali translator and grammar corrector. Convert the following Banglish word to Bengali script ONLY, nothing else:\n\n${token}`,
              apiKeys: apiKeys.length ? apiKeys : undefined,
            },
          });
          if (error) throw error;
          convertedTokens.push(data?.text ? data.text.trim() : token);
        }
      }
      setBengaliText(convertedTokens.join(""));
    } catch (error) {
      console.error("Conversion error:", error);
      toast({
        title: "Conversion failed",
        description: "Please check if API keys are configured.",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  // Auto-convert on Banglish text change (debounced)
  useEffect(() => {
    if (!banglishText.trim()) {
      setBengaliText("");
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => performConversion(banglishText), 500);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [banglishText]);

  // Convert instantly when space is pressed
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === ' ') {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      performConversion(banglishText);
    }
  };

  const handleNew = () => {
    setBanglishText("");
    setBengaliText("");
    toast({
      title: "New document",
      description: "Started with a blank document",
    });
  };

  const handleSave = () => {
    if (!bengaliText.trim()) {
      toast({
        title: "Nothing to save",
        description: "Please convert some text first.",
        variant: "destructive",
      });
      return;
    }
    const blob = new Blob([bengaliText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bengali-text-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: "Saved successfully!",
      description: "Your Bengali text has been downloaded.",
    });
  };

  const handleOpen = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setBanglishText(text);
          toast({
            title: "File opened",
            description: `Loaded ${file.name}`,
          });
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleSaveKeys = () => {
    const list = keysInput
      .split(/\s|,|\n/g)
      .map((s) => s.trim())
      .filter(Boolean);
    const valid = list
      .filter((k) => /^AIza[0-9A-Za-z-_]{20,}$/.test(k))
      .slice(0, 5);

    setApiKeys(valid);
    toast({
      title: "API keys updated",
      description: valid.length ? `${valid.length} key(s) will be used with rotation` : "Cleared custom keys",
    });
    setKeysOpen(false);
  };

  const handleCopy = async () => {
    if (!bengaliText) return;
    try {
      await navigator.clipboard.writeText(bengaliText);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Bengali text copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleConvert = async () => {
    if (!banglishText.trim()) {
      toast({
        title: "No text to convert",
        description: "Please enter some Banglish text first.",
        variant: "destructive",
      });
      return;
    }
    performConversion(banglishText);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Toolbar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleNew}>
              <FileText className="w-4 h-4 mr-2" />
              New
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpen}>
              <FolderOpen className="w-4 h-4 mr-2" />
              Open
            </Button>
            <Button variant="outline" size="sm" onClick={() => setKeysOpen(true)}>
              <KeyRound className="w-4 h-4 mr-2" />
              API Keys
            </Button>
            <Button 
              onClick={handleConvert} 
              disabled={isConverting || !banglishText.trim()}
              className="gradient-primary"
              size="sm"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isConverting ? "Converting..." : "Convert"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopy}
              disabled={!bengaliText}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon"
                className="h-8 w-8"
                onClick={() => setFontSize(Math.max(12, fontSize - 2))}
              >
                -
              </Button>
              <span className="text-sm font-medium w-12 text-center">{fontSize}px</span>
              <Button 
                variant="outline" 
                size="icon"
                className="h-8 w-8"
                onClick={() => setFontSize(Math.min(24, fontSize + 2))}
              >
                +
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Split Editor */}
      <div className="flex-1 grid md:grid-cols-2 overflow-hidden">
        <div className="border-r border-border flex flex-col">
          <div className="px-4 py-3 border-b border-border bg-card/30">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Banglish Input
            </h2>
          </div>
          <div className="flex-1 p-4">
            <TextEditor
              value={banglishText}
              onChange={setBanglishText}
              // === এখানে নতুন প্রপ যোগ করা হয়েছে ===
              onKeyDown={handleKeyDown}
              placeholder="Type your Banglish text here... (Press space for instant conversion)"
              fontSize={fontSize}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="px-4 py-3 border-b border-border bg-card/30">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Bangla Output
            </h2>
          </div>
          <div className="flex-1 p-4">
            <BengaliOutput text={bengaliText} fontSize={fontSize} />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="border-t border-border bg-card/50 px-4 py-2 text-sm text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>{banglishText.length} characters</span>
          <span>© 2025 Shafiq Sanchy</span>
        </div>
      </div>

      {/* API Keys Dialog */}
      <Dialog open={keysOpen} onOpenChange={setKeysOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manually add Gemini API keys</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Paste up to 5 keys (comma or newline separated). We will rotate them to reduce rate limits.
            </p>
            <Textarea
              value={keysInput}
              onChange={(e) => setKeysInput(e.target.value)}
              placeholder={`AIza...\nAIza...`}
              className="min-h-[120px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setKeysOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveKeys}>Save keys</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
