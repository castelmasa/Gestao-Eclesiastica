import React, { Component, ErrorInfo, ReactNode } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Underline, List, AlignLeft, AlignCenter } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class EditorErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("Rich editor fallback activated:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const insertVariable = (variable: string) => {
    const formatted = variable;
    if (!value || value.trim() === "<p><br></p>" || value === "") {
      onChange(`<p>${formatted}</p>`);
    } else {
      onChange(value.replace(/<\/p>$/, ` ${formatted}</p>`));
    }
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ align: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["clean"]
    ]
  };

  const fallbackTextarea = (
    <div className="space-y-2 border rounded-md p-3 bg-white dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => onChange(value + " <strong>Texto em negrito</strong>")}
        >
          <Bold className="w-3.5 h-3.5 mr-1" /> Negrito
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => onChange(value + " <em>Texto em itálico</em>")}
        >
          <Italic className="w-3.5 h-3.5 mr-1" /> Itálico
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => onChange(value + " <u>Texto sublinhado</u>")}
        >
          <Underline className="w-3.5 h-3.5 mr-1" /> Sublinhado
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => onChange(value + "<p><br></p>")}
        >
          Nova Linha
        </Button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Digite o conteúdo do modelo..."}
        className="w-full min-h-[220px] p-2 text-sm font-sans border rounded bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );

  return (
    <div className="space-y-2">
      {/* Barra de inserção rápida de variáveis */}
      <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-2 rounded-lg border text-xs">
        <span className="font-semibold text-muted-foreground mr-1">Inserir no texto:</span>
        {[
          { label: "[NOME_MEMBRO]", desc: "Nome do Membro" },
          { label: "[DOCUMENTO]", desc: "CPF ou RG" },
          { label: "[DATA_BATISMO]", desc: "Data do Batismo" },
          { label: "[DATA_ATUAL]", desc: "Data de Hoje" },
          { label: "[CARGO]", desc: "Cargo / Função" }
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => insertVariable(item.label)}
            className="px-2 py-1 bg-background hover:bg-primary/10 hover:text-primary border border-border rounded font-mono text-[11px] font-semibold transition-colors shadow-2xs"
            title={`Clique para inserir ${item.desc}`}
          >
            + {item.label}
          </button>
        ))}
      </div>

      <div className={`bg-white dark:bg-slate-950 rounded-md border ${className || ""}`}>
        <EditorErrorBoundary fallback={fallbackTextarea}>
          <ReactQuill
            theme="snow"
            value={value}
            onChange={onChange}
            placeholder={placeholder || "Escreva o modelo de documento..."}
            modules={quillModules}
            className="min-h-[220px]"
          />
        </EditorErrorBoundary>
      </div>
    </div>
  );
}
