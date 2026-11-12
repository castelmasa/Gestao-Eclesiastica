import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, Copy, Check, ArrowDownRight, Coins } from "lucide-react";
import { toast } from "sonner";

interface FinancialCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyValue?: (val: number) => void;
  initialValue?: number;
}

export function FinancialCalculatorModal({
  isOpen,
  onClose,
  onApplyValue,
  initialValue
}: FinancialCalculatorModalProps) {
  const [display, setDisplay] = useState("0");
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && initialValue && initialValue > 0) {
      setDisplay(String(initialValue));
      setPrevValue(null);
      setOperation(null);
      setWaitingForOperand(false);
    }
  }, [isOpen, initialValue]);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const clearAll = () => {
    setDisplay("0");
    setPrevValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const clearEntry = () => {
    setDisplay("0");
  };

  const backspace = () => {
    if (waitingForOperand) return;
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
    }
  };

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
    } else if (operation) {
      const currentValue = prevValue || 0;
      let newValue = currentValue;

      switch (operation) {
        case "+":
          newValue = currentValue + inputValue;
          break;
        case "-":
          newValue = currentValue - inputValue;
          break;
        case "×":
          newValue = currentValue * inputValue;
          break;
        case "÷":
          newValue = inputValue !== 0 ? currentValue / inputValue : 0;
          break;
      }

      setPrevValue(newValue);
      const rounded = Math.round((newValue + Number.EPSILON) * 100) / 100;
      setDisplay(String(rounded));
    }

    setWaitingForOperand(true);
    setOperation(nextOperator);
  };

  const calculateResult = () => {
    if (!operation || prevValue === null) return;
    const inputValue = parseFloat(display);
    let newValue = prevValue;

    switch (operation) {
      case "+":
        newValue = prevValue + inputValue;
        break;
      case "-":
        newValue = prevValue - inputValue;
        break;
      case "×":
        newValue = prevValue * inputValue;
        break;
      case "÷":
        newValue = inputValue !== 0 ? prevValue / inputValue : 0;
        break;
    }

    const rounded = Math.round((newValue + Number.EPSILON) * 100) / 100;
    setDisplay(String(rounded));
    setPrevValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  };

  const applyPresetChurchCalc = (type: "dizimo" | "repasse5" | "metade") => {
    const val = parseFloat(display) || 0;
    let res = 0;
    let desc = "";

    switch (type) {
      case "dizimo":
        res = val * 0.10;
        desc = `Dízimo (10% de R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`;
        break;
      case "repasse5":
        res = val * 0.05;
        desc = `Repasse Convencional (5% de R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`;
        break;
      case "metade":
        res = val / 2;
        desc = `Divisão 50/50 de R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        break;
    }

    const rounded = Math.round((res + Number.EPSILON) * 100) / 100;
    setDisplay(String(rounded));
    setWaitingForOperand(true);
    toast.info(`${desc} = R$ ${rounded.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  };

  const copyToClipboard = () => {
    const formatted = parseFloat(display).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    toast.success(`Valor R$ ${formatted} copiado para a área de transferência!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    const val = parseFloat(display);
    if (!isNaN(val) && onApplyValue) {
      onApplyValue(val);
      toast.success(`Valor R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} aplicado com sucesso!`);
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key >= "0" && e.key <= "9") {
        inputDigit(e.key);
      } else if (e.key === "." || e.key === ",") {
        inputDecimal();
      } else if (e.key === "+") {
        performOperation("+");
      } else if (e.key === "-") {
        performOperation("-");
      } else if (e.key === "*") {
        performOperation("×");
      } else if (e.key === "/") {
        e.preventDefault();
        performOperation("÷");
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        calculateResult();
      } else if (e.key === "Backspace") {
        backspace();
      } else if (e.key === "Escape") {
        clearAll();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, display, prevValue, operation, waitingForOperand]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-[420px] p-4 sm:p-5 rounded-2xl bg-slate-950 text-white border-slate-800 shadow-2xl">
        <DialogHeader className="pb-2 border-b border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                  Calculadora Eclesiástica
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Tesouraria, Dízimos, Ofertas & Repasses
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] bg-emerald-950/60 text-emerald-300 border-emerald-800">
              Tesouraria
            </Badge>
          </div>
        </DialogHeader>

        {/* Display Moderno */}
        <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800 shadow-inner space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono min-h-[18px]">
            <span>{prevValue !== null && operation ? `${prevValue} ${operation}` : ""}</span>
            <span className="text-[10px] text-emerald-400 font-sans flex items-center gap-1">
              <Coins className="w-3 h-3" /> BRL (R$)
            </span>
          </div>

          <div className="flex items-baseline justify-between overflow-x-auto">
            <span className="text-sm font-bold text-slate-500 mr-2">R$</span>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white truncate text-right flex-1">
              {display}
            </div>
          </div>
        </div>

        {/* Atalhos Rápidos Eclesiásticos */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Cálculos Automáticos da Igreja:
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPresetChurchCalc("dizimo")}
              className="h-8 text-[11px] font-bold bg-slate-900 border-emerald-700/50 text-emerald-300 hover:bg-emerald-950/60"
              title="Calcula 10% do valor digitado"
            >
              10% (Dízimo)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPresetChurchCalc("repasse5")}
              className="h-8 text-[11px] font-bold bg-slate-900 border-amber-700/50 text-amber-300 hover:bg-amber-950/60"
              title="Calcula 5% de repasse convencional"
            >
              5% (Convenção)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPresetChurchCalc("metade")}
              className="h-8 text-[11px] font-bold bg-slate-900 border-blue-700/50 text-blue-300 hover:bg-blue-950/60"
              title="Divide o valor em 2 partes iguais"
            >
              50% (Metade)
            </Button>
          </div>
        </div>

        {/* Teclado da Calculadora */}
        <div className="grid grid-cols-4 gap-2 pt-1 font-mono">
          <Button
            type="button"
            variant="ghost"
            onClick={clearAll}
            className="h-10 text-xs font-bold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 rounded-xl"
          >
            AC
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={clearEntry}
            className="h-10 text-xs font-bold text-amber-400 hover:bg-amber-950/40 hover:text-amber-300 rounded-xl"
          >
            C
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={backspace}
            className="h-10 text-xs font-bold text-slate-300 hover:bg-slate-800 rounded-xl"
          >
            ⌫
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => performOperation("÷")}
            className="h-10 text-sm font-bold bg-slate-900/80 border-slate-700 text-emerald-400 hover:bg-emerald-900/40 rounded-xl"
          >
            ÷
          </Button>

          {/* Linha 7, 8, 9, × */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputDigit("7")}
            className="h-10 text-sm font-bold bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl"
          >
            7
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputDigit("8")}
            className="h-10 text-sm font-bold bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl"
          >
            8
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputDigit("9")}
            className="h-10 text-sm font-bold bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl"
          >
            9
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => performOperation("×")}
            className="h-10 text-sm font-bold bg-slate-900/80 border-slate-700 text-emerald-400 hover:bg-emerald-900/40 rounded-xl"
          >
            ×
          </Button>

          {/* Linha 4, 5, 6, - */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputDigit("4")}
            className="h-10 text-sm font-bold bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl"
          >
            4
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputDigit("5")}
            className="h-10 text-sm font-bold bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl"
          >
            5
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputDigit("6")}
            className="h-10 text-sm font-bold bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl"
          >
            6
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => performOperation("-")}
            className="h-10 text-sm font-bold bg-slate-900/80 border-slate-700 text-emerald-400 hover:bg-emerald-900/40 rounded-xl"
          >
            -
          </Button>

          {/* Linha 1, 2, 3, + */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputDigit("1")}
            className="h-10 text-sm font-bold bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl"
          >
            1
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputDigit("2")}
            className="h-10 text-sm font-bold bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl"
          >
            2
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputDigit("3")}
            className="h-10 text-sm font-bold bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl"
          >
            3
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => performOperation("+")}
            className="h-10 text-sm font-bold bg-slate-900/80 border-slate-700 text-emerald-400 hover:bg-emerald-900/40 rounded-xl"
          >
            +
          </Button>

          {/* Linha 0, ., = */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputDigit("0")}
            className="col-span-2 h-10 text-sm font-bold bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl"
          >
            0
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={inputDecimal}
            className="h-10 text-sm font-bold bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl"
          >
            ,
          </Button>
          <Button
            type="button"
            onClick={calculateResult}
            className="h-10 text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md"
          >
            =
          </Button>
        </div>

        {/* Rodapé de Ações: Copiar ou Inserir Diretamente */}
        <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800/80">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="text-xs bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copiar
              </>
            )}
          </Button>

          {onApplyValue && (
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5"
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              Inserir no Formulário
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
