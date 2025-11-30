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

// Utility to split text into words + spaces/newlines (preserves formatting)
function tokenizeWithFormat(text: string): string[] {
  return text.match(/([^\s\n]+)|(\s+|\n)/g) || [];
}

const Index = () => {
  const [banglishText, setBanglishText] = useState("");
  const [bengaliTokens, setBengaliTokens] = useState<string[]>([]);
  const [fontSize, setFontSize] = useState(16);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [keysOpen, setKeysOpen] = useState(false);
  const [keysInput, setKeysInput] = useState("");
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Whenever text input changes, keep format-preserving token arrays updated
  useEffect(() => {
    const tokens = tokenizeWithFormat(banglishText);
    setBengaliTokens((prev) => {
      // Keep previous conversions for tokens, update length as needed
      const updated = [...prev];
      while (updated.length < tokens.length) updated.push("");
      while (updated.length > tokens.length) updated.pop();
      return updated;
    });
  }, [banglishText]);

  // On space or enter, convert just the last word (fast, accurate, format preserved)
  const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === " " || event.key === "Enter") {
      const tokens = tokenizeWithFormat(banglishText);
      if (!tokens.length) return;

      // Find the last actual word (not whitespace/newline)
      let lastWordIndex = -1;
      for (let i = tokens.length - 1; i >= 0; i--) {
        if (tokens[i].trim() !== "" && !/^\s+$/.test(tokens[i]) && tokens[i] !== "\n") {
          lastWordIndex = i;
          break;
        }
      }
      if (lastWordIndex === -1) return;

      setIsConverting(true);
      try {
        const { data, error } = await supabase.functions.invoke("gemini-chat", {
          body: {
            prompt: `Convert this Banglish word to Bengali, ONLY output the word:\n${tokens[lastWordIndex]}`,
            apiKeys: apiKeys.length ? apiKeys : undefined,
          },
        });
        if (error) throw error;

        setBengaliTokens((prev) => {
          const next = [...prev];
          next[lastWordIndex] = data?.text ? data.text.trim() : tokens[lastWordIndex];
          return next;
        });
      } catch {
        toast({
          title: "Conversion failed",
          description: "Please check your API keys.",
          variant: "destructive",
        });
      } finally {
        setIsConverting(false);
      }
    }
  };

  // Handles TextEditor onChange so text and tokens stay in sync
  const handleInputChange = (val: string) => {
    setBanglishText(val);
  };

  // Quick convert button: batch converts all words (not spaces/newlines)
  const handleConvert = async () => {
    const tokens = tokenizeWithFormat(banglishText);
    if (!tokens.length) {
      toast({
        title: "No text to convert",
        description: "Please enter Banglish text.",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);
    try {
      const converted: string[] = [];
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].trim() === "" || /^\s+$/.test(tokens[i]) || tokens[i] === "\n") {
          converted.push(tokens[i]);
        } else {
          const { data, error } = await supabase.functions.invoke("gemini-chat", {
            body: {
              prompt: `Convert this Banglish word to Bengali, ONLY output the word:\n${tokens[i]}`,
              apiKeys: apiKeys.length ? apiKeys : undefined,
            },
          });
          if (error) {
            converted.push(tokens[i]);
          } else {
            converted.push(data?.text ? data.text.trim() : tokens[i]);
          }
        }
      }
      setBengaliTokens(converted);
    } catch {
      toast({
        title: "Conversion failed",
        description: "Please check your API keys.",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleNew = () => {
    setBanglishText("");
    setBengaliTokens([]);
    toast({
      title: "New document",
      description: "Started with a blank document",
    });
  };

  const handleSave = () => {
    const fullText = bengaliTokens.join("");
    if (!fullText.trim()) {
      toast({
        title: "Nothing to save",
        description: "Please convert some text first.",
        variant: "destructive",
      });
      return;
    }
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
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
    if (!bengaliTokens.length) return;
    try {
      await navigator.clipboard.writeText(bengaliTokens.join(""));
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
              disabled={!bengaliTokens.length}
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
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your Banglish text here... (Press space or enter for instant word conversion)"
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
            <BengaliOutput text={bengaliTokens.join("")} fontSize={fontSize} />
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
