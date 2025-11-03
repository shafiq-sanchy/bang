interface BengaliOutputProps {
  text: string;
  fontSize?: number;
}

const BengaliOutput = ({ text, fontSize = 16 }: BengaliOutputProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto bg-transparent">
        {text ? (
          <p 
            className="leading-relaxed text-foreground font-['Noto_Sans_Bengali']"
            style={{ fontSize: `${fontSize}px` }}
          >
            {text}
          </p>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
            <p>Your converted Bangla text will appear here</p>
            <p className="text-sm mt-2">Start typing Banglish text</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BengaliOutput;
