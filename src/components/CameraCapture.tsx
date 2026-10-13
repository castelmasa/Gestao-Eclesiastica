import React, { useRef, useState, useCallback } from "react";
import { Camera, X, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsStreaming(false);
  }, [stream]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        setPhotoData(dataUrl);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setPhotoData(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (photoData) {
      onCapture(photoData);
    }
  };

  // Start on mount
  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [stopCamera]); // actually, just run once on mount

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-black/90 rounded-lg overflow-hidden relative">
      {!photoData ? (
        <>
          <video
            ref={videoRef}
            className="w-full max-h-[60vh] object-contain rounded"
            playsInline
          />
          <div className="flex gap-4 mt-4 w-full justify-center">
            <Button variant="destructive" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" /> Cancelar
            </Button>
            <Button onClick={takePhoto} variant="default" className="bg-white text-black hover:bg-gray-200">
              <Camera className="w-4 h-4 mr-2" /> Capturar
            </Button>
          </div>
        </>
      ) : (
        <>
          <img src={photoData} alt="Captured" className="w-full max-h-[60vh] object-contain rounded" />
          <div className="flex gap-4 mt-4 w-full justify-center">
            <Button variant="outline" onClick={retakePhoto} className="text-white border-white hover:bg-white/20">
              <RefreshCw className="w-4 h-4 mr-2" /> Refazer
            </Button>
            <Button variant="default" onClick={confirmPhoto} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Check className="w-4 h-4 mr-2" /> Usar Foto
            </Button>
          </div>
        </>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
