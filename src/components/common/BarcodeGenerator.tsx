import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export interface BarcodeGeneratorProps {
  value: string;
  width?: number;
  height?: number;
  fontSize?: number;
  displayValue?: boolean;
  lineColor?: string;
  background?: string;
  className?: string;
  text?: string;
}

export function BarcodeGenerator({
  value,
  width = 1.2,
  height = 22,
  fontSize = 9,
  displayValue = true,
  lineColor = "#000000",
  background = "transparent",
  className = "",
  text
}: BarcodeGeneratorProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      const raw = value || "00000000";
      const cleanVal = raw.replace(/[^a-zA-Z0-9]/g, "") || "00000000";

      JsBarcode(svgRef.current, cleanVal, {
        format: "CODE128",
        width,
        height,
        displayValue,
        text: text || raw,
        fontSize,
        lineColor,
        background: background === "transparent" ? undefined : background,
        margin: 2,
      });
    } catch (e) {
      console.warn("Barcode rendering fallback:", e);
    }
  }, [value, width, height, fontSize, displayValue, lineColor, background, text]);

  return <svg ref={svgRef} className={`max-w-full block ${className}`} />;
}

export function generateBarcodeDataUrl(value: string, options?: {
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  lineColor?: string;
  background?: string;
  text?: string;
}): string {
  try {
    const canvas = document.createElement("canvas");
    const raw = value || "00000000";
    const cleanVal = raw.replace(/[^a-zA-Z0-9]/g, "") || "00000000";

    JsBarcode(canvas, cleanVal, {
      format: "CODE128",
      width: options?.width || 1.4,
      height: options?.height || 26,
      displayValue: options?.displayValue !== false,
      text: options?.text || raw,
      fontSize: options?.fontSize || 9,
      lineColor: options?.lineColor || "#000000",
      background: options?.background || "#ffffff",
      margin: 2,
    });
    return canvas.toDataURL("image/png");
  } catch (e) {
    console.warn("Failed generating barcode dataUrl:", e);
    return "";
  }
}
