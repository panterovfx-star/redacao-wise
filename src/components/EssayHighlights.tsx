import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ThumbsUp } from "lucide-react";

interface Highlight {
  text: string;
  type: "error" | "positive";
  comment: string;
  suggestion?: string;
}

interface EssayHighlightsProps {
  highlights: Highlight[];
  essayContent: string;
}

export const EssayHighlights = ({ highlights, essayContent }: EssayHighlightsProps) => {
  if (!highlights || highlights.length === 0) {
    return null;
  }

  // Renderiza o texto com highlights
  const renderTextWithHighlights = () => {
    let result = essayContent;
    const segments: Array<{ text: string; highlight?: Highlight }> = [];
    
    // Ordena highlights por posição no texto
    const sortedHighlights = [...highlights].sort((a, b) => {
      const posA = result.indexOf(a.text);
      const posB = result.indexOf(b.text);
      return posA - posB;
    });

    let lastIndex = 0;
    sortedHighlights.forEach((highlight) => {
      const index = result.indexOf(highlight.text, lastIndex);
      if (index !== -1) {
        // Texto antes do highlight
        if (index > lastIndex) {
          segments.push({ text: result.substring(lastIndex, index) });
        }
        // Texto do highlight
        segments.push({ text: highlight.text, highlight });
        lastIndex = index + highlight.text.length;
      }
    });

    // Texto após o último highlight
    if (lastIndex < result.length) {
      segments.push({ text: result.substring(lastIndex) });
    }

    return segments;
  };

  const segments = renderTextWithHighlights();

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Texto com Destaques</h3>
        <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
          {segments.map((segment, index) => {
            if (!segment.highlight) {
              return <span key={index}>{segment.text}</span>;
            }

            const isError = segment.highlight.type === "error";
            return (
              <span
                key={index}
                className={`relative group cursor-help px-1 rounded ${
                  isError 
                    ? "bg-red-100 dark:bg-red-900/30 border-b-2 border-red-500" 
                    : "bg-green-100 dark:bg-green-900/30 border-b-2 border-green-500"
                }`}
                title={segment.highlight.comment}
              >
                {segment.text}
              </span>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          Comentários Detalhados ({highlights.length})
        </h3>
        <div className="space-y-4">
          {highlights.map((highlight, index) => (
            <Card 
              key={index} 
              className={`p-4 border-l-4 ${
                highlight.type === "error" 
                  ? "border-l-red-500 bg-red-50 dark:bg-red-900/10" 
                  : "border-l-green-500 bg-green-50 dark:bg-green-900/10"
              }`}
            >
              <div className="flex items-start gap-3">
                {highlight.type === "error" ? (
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <ThumbsUp className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-2">
                  <div>
                    <Badge variant={highlight.type === "error" ? "destructive" : "default"} className="mb-2">
                      {highlight.type === "error" ? "Erro" : "Destaque Positivo"}
                    </Badge>
                    <p className="font-medium text-sm italic">&ldquo;{highlight.text}&rdquo;</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{highlight.comment}</p>
                  {highlight.suggestion && (
                    <div className="mt-2 p-3 bg-background rounded-md border">
                      <p className="text-sm font-medium mb-1">Sugestão de Melhoria:</p>
                      <p className="text-sm text-muted-foreground">{highlight.suggestion}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
};
