import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fontSize?: number;
}

const TextEditor = ({ value, onChange, placeholder, fontSize = 16 }: TextEditorProps) => {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-full resize-none border-0 bg-transparent text-foreground 
                 focus-visible:outline-none focus-visible:ring-0 p-0"
      style={{ fontSize: `${fontSize}px` }}
    />
  );
};

export default TextEditor;
